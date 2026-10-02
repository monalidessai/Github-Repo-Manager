import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { Octokit } from '@octokit/rest';
import { ConfigService } from '@nestjs/config';

import { SimulationService } from '../simulation/simulation.service';

import { calculateRepoExpiry } from '../common/utils/expiry.util';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly configService: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly nestConfig: ConfigService,
    private readonly simulationService: SimulationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyRetentionCheck() {
    this.logger.log('Starting daily repository retention check cron job...');
    await this.runRetentionCheck();
  }

  async runRetentionCheck(userToken?: string): Promise<{ processedCount: number; actionedCount: number; details: string[] }> {
    const config = await this.configService.getConfig();
    const systemToken = userToken || this.nestConfig.get<string>('GITHUB_TOKEN') || process.env.GITHUB_TOKEN;

    if (!systemToken) {
      this.logger.warn('Skipping scheduled retention check: GITHUB_TOKEN not configured in backend environment.');
      return {
        processedCount: 0,
        actionedCount: 0,
        details: ['Skipped: GITHUB_TOKEN environment variable is missing for automated scheduler operations.'],
      };
    }

    const octokit = new Octokit({ auth: systemToken });
    const prefix = config.repoPrefix || 'pt-';
    const org = config.githubOrg;

    let repos: any[] = [];
    try {
      if (org && org.trim() !== '') {
        repos = await octokit.paginate(octokit.repos.listForOrg, {
          org: org.trim(),
          per_page: 100,
        });
      } else {
        repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
          per_page: 100,
          affiliation: 'owner,collaborator,organization_member',
        });
      }
    } catch (err: any) {
      this.logger.error(`Scheduler failed to list GitHub repositories: ${err.message}`);
      return {
        processedCount: 0,
        actionedCount: 0,
        details: [`Error listing repos: ${err.message}`],
      };
    }

    const matchingRepos = repos.filter((r) => r.name.toLowerCase().startsWith(prefix.toLowerCase()) && !r.archived);
    const overrides = await this.prisma.repoOverride.findMany();
    const overrideMap = new Map(overrides.map((o) => [o.repoName, o]));

    const now = this.simulationService.getEffectiveNow();
    let actionedCount = 0;
    const details: string[] = [];

    for (const repo of matchingRepos) {
      const createdAt = new Date(repo.created_at);
      const override = overrideMap.get(repo.name);
      const expiryInfo = calculateRepoExpiry(createdAt, config, override, now);
      const { expiryDate, remainingDays, isExpired, targetAction } = expiryInfo;

      if (isExpired) {
        this.logger.log(`Repo ${repo.name} is expired (${remainingDays} days remaining). Action: ${targetAction}`);

        try {
          const owner = repo.owner.login;

          if (targetAction === 'archive') {
            await octokit.repos.update({
              owner,
              repo: repo.name,
              archived: true,
            });
            await this.auditService.log({
              actor: 'SYSTEM_SCHEDULER',
              action: 'AUTO_ARCHIVE_REPOSITORY',
              repository: repo.name,
              ipAddress: '127.0.0.1',
              context: { remainingDays, retentionDays: config.retentionDays },
            });
            await this.notificationService.createNotification({
              repoName: repo.name,
              message: `Repository ${repo.name} was automatically archived due to retention policy.`,
              severity: 'danger',
            });
            details.push(`Archived ${repo.name}`);
            actionedCount++;
          } else if (targetAction === 'delete') {
            await octokit.repos.delete({
              owner,
              repo: repo.name,
            });
            await this.prisma.repoOverride.deleteMany({ where: { repoName: repo.name } });
            await this.auditService.log({
              actor: 'SYSTEM_SCHEDULER',
              action: 'AUTO_DELETE_REPOSITORY',
              repository: repo.name,
              ipAddress: '127.0.0.1',
              context: { remainingDays, retentionDays: config.retentionDays },
            });
            await this.notificationService.createNotification({
              repoName: repo.name,
              message: `Repository ${repo.name} was permanently deleted due to retention expiry.`,
              severity: 'danger',
            });
            details.push(`Deleted ${repo.name}`);
            actionedCount++;
          }
        } catch (actionErr: any) {
          this.logger.error(`Scheduler action failed for ${repo.name}: ${actionErr.message}`);
          details.push(`Failed action on ${repo.name}: ${actionErr.message}`);
        }
      } else if (remainingDays <= config.warningDays) {
        this.logger.log(`Repo ${repo.name} is within warning period (${remainingDays} days remaining).`);
        await this.notificationService.createNotification({
          repoName: repo.name,
          message: `Repository ${repo.name} expires in ${remainingDays} day(s). Scheduled auto-${targetAction}.`,
          severity: 'warning',
        });
        details.push(`In-app warning created for ${repo.name} (${remainingDays} days remaining)`);
      }
    }

    this.logger.log(`Daily retention check completed. Processed ${matchingRepos.length} repos, actioned ${actionedCount}.`);
    return {
      processedCount: matchingRepos.length,
      actionedCount,
      details,
    };
  }
}
