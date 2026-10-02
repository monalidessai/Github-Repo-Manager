import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfigDto, DEFAULT_REPO_PREFIX, DEFAULT_RETENTION_DAYS, DEFAULT_WARNING_DAYS } from '@repo-manager/shared';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nestConfig: NestConfigService,
  ) {}

  async getConfig(): Promise<SystemConfigDto> {
    let config = await this.prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      this.logger.log('Initializing default system configuration from environment...');
      const defaultPrefix = this.nestConfig.get<string>('REPO_PREFIX') || DEFAULT_REPO_PREFIX;
      const defaultRetention = parseInt(this.nestConfig.get<string>('RETENTION_DAYS') || `${DEFAULT_RETENTION_DAYS}`, 10);
      const defaultWarning = parseInt(this.nestConfig.get<string>('WARNING_DAYS') || `${DEFAULT_WARNING_DAYS}`, 10);
      const defaultAction = (this.nestConfig.get<string>('DEFAULT_EXPIRY_ACTION') || 'delete') as 'delete' | 'archive';
      const defaultOrg = this.nestConfig.get<string>('GITHUB_ORG') || '';

      config = await this.prisma.systemConfig.create({
        data: {
          id: 'default',
          repoPrefix: defaultPrefix,
          retentionDays: defaultRetention,
          warningDays: defaultWarning,
          defaultExpiryAction: defaultAction,
          githubOrg: defaultOrg,
        },
      });
    }

    const simulationEnabled =
      this.nestConfig.get<string>('SIMULATION_ENABLED') === 'true' ||
      process.env.SIMULATION_ENABLED === 'true';

    return {
      repoPrefix: config.repoPrefix,
      retentionDays: config.retentionDays,
      warningDays: config.warningDays,
      defaultExpiryAction: config.defaultExpiryAction as 'delete' | 'archive',
      githubOrg: config.githubOrg || this.nestConfig.get<string>('GITHUB_ORG') || '',
      simulationEnabled,
    };
  }

  async updateConfig(dto: UpdateConfigDto): Promise<SystemConfigDto> {
    this.logger.log(`Updating system configuration: ${JSON.stringify(dto)}`);
    
    // Ensure default exists first
    await this.getConfig();

    const updated = await this.prisma.systemConfig.update({
      where: { id: 'default' },
      data: {
        ...(dto.repoPrefix && { repoPrefix: dto.repoPrefix }),
        ...(dto.retentionDays && { retentionDays: dto.retentionDays }),
        ...(dto.warningDays && { warningDays: dto.warningDays }),
        ...(dto.defaultExpiryAction && { defaultExpiryAction: dto.defaultExpiryAction }),
        ...(dto.githubOrg !== undefined && { githubOrg: dto.githubOrg }),
      },
    });

    const simulationEnabled =
      this.nestConfig.get<string>('SIMULATION_ENABLED') === 'true' ||
      process.env.SIMULATION_ENABLED === 'true';

    return {
      repoPrefix: updated.repoPrefix,
      retentionDays: updated.retentionDays,
      warningDays: updated.warningDays,
      defaultExpiryAction: updated.defaultExpiryAction as 'delete' | 'archive',
      githubOrg: updated.githubOrg || '',
      simulationEnabled,
    };
  }
}
