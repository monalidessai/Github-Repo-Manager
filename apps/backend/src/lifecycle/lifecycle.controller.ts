import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserSession } from '@repo-manager/shared';
import { OverrideDateDto } from './dto/override-date.dto';
import { Request } from 'express';
import { extractClientIp } from '../common/utils/ip.util';

@Controller('repos')
@UseGuards(SessionGuard)
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Post(':repo/archive')
  async archiveRepository(
    @CurrentUser() user: UserSession,
    @Param('repo') repoName: string,
    @Req() req: Request,
  ) {
    return this.lifecycleService.archiveRepository(
      user,
      repoName,
      extractClientIp(req),
    );
  }

  @Post(':repo/delete')
  async deleteRepository(
    @CurrentUser() user: UserSession,
    @Param('repo') repoName: string,
    @Body('confirmRepoName') confirmRepoName: string,
    @Req() req: Request,
  ) {
    return this.lifecycleService.deleteRepository(
      user,
      repoName,
      confirmRepoName,
      extractClientIp(req),
    );
  }

  @Post(':repo/override-date')
  async setOverrideDate(
    @CurrentUser() user: UserSession,
    @Param('repo') repoName: string,
    @Body() dto: OverrideDateDto,
    @Req() req: Request,
  ) {
    return this.lifecycleService.setOverrideDate(
      user,
      repoName,
      dto,
      extractClientIp(req),
    );
  }
}
