import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AppConfigService } from './config.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { SessionGuard } from '../common/guards/session.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserSession, UserRole } from '@repo-manager/shared';
import { Request } from 'express';
import { extractClientIp } from '../common/utils/ip.util';

@Controller('settings')
@UseGuards(SessionGuard)
export class ConfigController {
  constructor(
    private readonly configService: AppConfigService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async getConfig() {
    return this.configService.getConfig();
  }

  @Post('update')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateConfig(
    @Body() dto: UpdateConfigDto,
    @CurrentUser() user: UserSession,
    @Req() req: Request,
  ) {
    const updated = await this.configService.updateConfig(dto);

    await this.auditService.log({
      actor: user.username,
      action: 'UPDATE_SETTINGS',
      repository: 'SYSTEM',
      ipAddress: extractClientIp(req),
      context: dto,
    });

    return updated;
  }
}
