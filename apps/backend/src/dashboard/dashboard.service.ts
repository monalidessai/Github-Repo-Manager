import { Injectable, Logger } from '@nestjs/common';
import { GitHubService } from '../github/github.service';
import { AppConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { RepoItem, BadgeStatus, UserSession, AccessStatus, RepoLifecycleStatus } from '@repo-manager/shared';

import { SimulationService } from '../simulation/simulation.service';

import { calculateRepoExpiry } from '../common/utils/expiry.util';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly configService: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly simulationService: SimulationService,
  ) {}

  async getDashboardRepositories(
    user: UserSession,
    query: {
      search?: string;
      role?: string;
      status?: BadgeStatus;
      accessStatus?: string;
      repoStatus?: string;
      sortBy?: 'name' | 'createdAt' | 'daysRemaining';
      order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    const config = await this.configService.getConfig();
    const rawRepos = await this.githubService.listRepositories(user.accessToken);
    const overrides = await this.prisma.repoOverride.findMany();

    const overrideMap = new Map<string, { customExpiryDate: Date; customAction?: string | null }>();
    overrides.forEach((o) => overrideMap.set(o.repoName, o));

    const now = this.simulationService.getEffectiveNow();

    const items: RepoItem[] = await Promise.all(
      rawRepos.map(async (repo) => {
        const parsed = this.parseRepoName(repo.name, config.repoPrefix);
        const createdAt = new Date(repo.createdAt);
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        const override = overrideMap.get(repo.name);
        const expiryInfo = calculateRepoExpiry(createdAt, config, override, now, repo.isArchived);
        const { expiryDate, remainingDays: daysRemaining, isExpired, targetAction } = expiryInfo;

        // 1. Calculate Countdown Badge Status
        let badgeStatus: BadgeStatus;
        if (repo.isArchived || daysRemaining <= 0) {
          badgeStatus = BadgeStatus.EXPIRED;
        } else if (daysRemaining < 10) {
          badgeStatus = BadgeStatus.RED;
        } else if (daysRemaining <= 30) {
          badgeStatus = BadgeStatus.AMBER;
        } else {
          badgeStatus = BadgeStatus.GREEN;
        }

        // 2. Calculate Repo Status (Live / Archived / Pending Deletion)
        let repoStatus: RepoLifecycleStatus;
        if (repo.isArchived) {
          repoStatus = 'Archived';
        } else if (daysRemaining <= config.warningDays) {
          repoStatus = targetAction === 'delete' ? 'Pending Deletion' : 'Live';
        } else {
          repoStatus = 'Live';
        }

        // 3. Calculate Access Status (Active Outside Access / Clean / Revoked)
        let accessStatus: AccessStatus = 'Clean / Revoked';
        let outsideCount = 0;
        let totalCollabs = 0;

        try {
          const collabs = await this.githubService.getCollaborators(user.accessToken, repo.name);
          totalCollabs = collabs.length;
          outsideCount = collabs.filter((c) => c.isOutside).length;

          if (outsideCount > 0) {
            accessStatus = 'Active Outside Access';
          } else if (totalCollabs > 1) {
            accessStatus = 'Internal Only';
          } else {
            accessStatus = 'Clean / Revoked';
          }
        } catch {
          accessStatus = 'Clean / Revoked';
        }

        return {
          name: repo.name,
          candidateName: parsed.candidateName,
          role: parsed.role,
          createdAt: repo.createdAt,
          daysSinceCreation,
          daysRemaining,
          badgeStatus,
          accessStatus,
          repoStatus,
          isArchived: repo.isArchived,
          htmlUrl: repo.htmlUrl,
          collaboratorsCount: totalCollabs,
          outsideCollaboratorsCount: outsideCount,
          customExpiryDate: override?.customExpiryDate ? override.customExpiryDate.toISOString() : null,
          customAction: (override?.customAction as any) || null,
        };
      }),
    );

    // Apply filtering
    let filtered = items;

    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.candidateName.toLowerCase().includes(s) ||
          r.role.toLowerCase().includes(s),
      );
    }

    if (query.role) {
      filtered = filtered.filter((r) => r.role.toLowerCase() === query.role.toLowerCase());
    }

    if (query.status) {
      filtered = filtered.filter((r) => r.badgeStatus === query.status);
    }

    if (query.accessStatus) {
      const a = query.accessStatus.toLowerCase();
      filtered = filtered.filter((r) => r.accessStatus.toLowerCase().includes(a));
    }

    if (query.repoStatus) {
      filtered = filtered.filter((r) => r.repoStatus.toLowerCase() === query.repoStatus.toLowerCase());
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'desc';

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'daysRemaining') {
        comparison = a.daysRemaining - b.daysRemaining;
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return order === 'desc' ? -comparison : comparison;
    });

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    const availableRoles = Array.from(new Set(items.map((i) => i.role))).filter(Boolean);

    return {
      repos: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      availableRoles,
      simulationState: this.simulationService.getSimulationState(),
    };
  }

  async getRepoByName(user: UserSession, repoName: string): Promise<RepoItem> {
    const result = await this.getDashboardRepositories(user, { search: repoName, limit: 100 });
    const repo = result.repos.find((r) => r.name === repoName);
    if (!repo) {
      throw new Error(`Repository ${repoName} not found or does not match prefix`);
    }
    return repo;
  }

  parseRepoName(repoName: string, prefix: string = 'pt-') {
    let cleanName = repoName;
    if (cleanName.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleanName = cleanName.substring(prefix.length);
    }

    const parts = cleanName.split('-').filter(Boolean);

    if (parts.length === 0) {
      return { role: 'Unknown', candidateName: repoName };
    }

    if (parts.length === 1) {
      return { role: parts[0], candidateName: 'Candidate' };
    }

    const role = parts[0];
    const candidateName = parts
      .slice(1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');

    return { role, candidateName };
  }
}
