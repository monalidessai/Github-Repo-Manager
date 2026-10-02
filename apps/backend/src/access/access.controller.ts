import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AccessService } from './access.service';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserSession } from '@repo-manager/shared';
import { Request } from 'express';
import { extractClientIp } from '../common/utils/ip.util';

@Controller('repos')
@UseGuards(SessionGuard)
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get(':repo/collaborators')
  async getCollaborators(
    @CurrentUser() user: UserSession,
    @Param('repo') repoName: string,
  ) {
    return this.accessService.getCollaborators(user, repoName);
  }

  @Post(':repo/revoke')
  async revokeCollaborator(
    @CurrentUser() user: UserSession,
    @Param('repo') repoName: string,
    @Body('username') username: string,
    @Req() req: Request,
  ) {
    return this.accessService.revokeCollaborator(
      user,
      repoName,
      username,
      extractClientIp(req),
    );
  }

  @Post(':repo/revoke-outside')
  async revokeAllOutside(
    @CurrentUser() user: UserSession,
    @Param('repo') repoName: string,
    @Req() req: Request,
  ) {
    return this.accessService.revokeAllOutsideCollaborators(
      user,
      repoName,
      extractClientIp(req),
    );
  }
}
