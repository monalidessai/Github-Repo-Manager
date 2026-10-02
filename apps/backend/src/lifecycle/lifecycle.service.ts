import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GitHubService } from '../github/github.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserSession } from '@repo-manager/shared';
import { OverrideDateDto } from './dto/override-date.dto';

@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async archiveRepository(
    user: UserSession,
    repoName: string,
    ipAddress: string,
  ) {
    const result = await this.githubService.archiveRepository(
      user.accessToken,
      repoName,
    );

    await this.auditService.log({
      actor: user.username,
      action: 'ARCHIVE_REPOSITORY',
      repository: repoName,
      ipAddress,
    });

    return result;
  }

  async deleteRepository(
    user: UserSession,
    repoName: string,
    confirmRepoName: string,
    ipAddress: string,
  ) {
    if (confirmRepoName !== repoName) {
      throw new BadRequestException(
        `Repository name confirmation mismatch. Expected '${repoName}', received '${confirmRepoName}'`,
      );
    }

    const result = await this.githubService.deleteRepository(
      user.accessToken,
      repoName,
    );

    // Also remove any existing repo override entry
    await this.prisma.repoOverride.deleteMany({
      where: { repoName },
    });

    await this.auditService.log({
      actor: user.username,
      action: 'DELETE_REPOSITORY',
      repository: repoName,
      ipAddress,
    });

    return result;
  }

  async setOverrideDate(
    user: UserSession,
    repoName: string,
    dto: OverrideDateDto,
    ipAddress: string,
  ) {
    const expiry = new Date(dto.customExpiryDate);

    const override = await this.prisma.repoOverride.upsert({
      where: { repoName },
      update: {
        customExpiryDate: expiry,
        customAction: dto.customAction || null,
      },
      create: {
        repoName,
        customExpiryDate: expiry,
        customAction: dto.customAction || null,
      },
    });

    await this.auditService.log({
      actor: user.username,
      action: 'SET_OVERRIDE_DATE',
      repository: repoName,
      ipAddress,
      context: { customExpiryDate: dto.customExpiryDate, customAction: dto.customAction },
    });

    return {
      success: true,
      message: `Expiry date override updated for ${repoName}`,
      override,
    };
  }
}
