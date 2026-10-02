import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserSession } from '@repo-manager/shared';
import { AuditService } from '../audit/audit.service';
import { extractClientIp } from '../common/utils/ip.util';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('github')
  loginWithGitHub(
    @Req() req: Request,
    @Res() res: Response,
    @Query('redirect_url') redirectUrl?: string,
  ) {
    const origin = redirectUrl || req.headers.referer || this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    let cleanOrigin = origin;
    try {
      const parsed = new URL(origin);
      cleanOrigin = `${parsed.protocol}//${parsed.host}`;
    } catch {}

    const url = this.authService.getGitHubAuthUrl(cleanOrigin);
    return res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const defaultFrontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const frontendUrl = state && state.startsWith('http') ? state : defaultFrontendUrl;

    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    try {
      const userSession = await this.authService.handleCallback(code);

      // Store user session in cookie
      (req as any).session.user = userSession;

      await this.auditService.log({
        actor: userSession.username,
        action: 'USER_LOGIN',
        repository: 'SYSTEM',
        ipAddress: extractClientIp(req),
      });

      return res.redirect(`${frontendUrl}/dashboard`);
    } catch (err: any) {
      if (err.message === 'UNPROVISIONED_USER' || err?.response?.message === 'UNPROVISIONED_USER') {
        return res.redirect(`${frontendUrl}/login?error=unprovisioned`);
      }
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @Get('users')
  @UseGuards(SessionGuard)
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: { githubUsername: true, role: true },
    });
    return users.map((u) => ({ username: u.githubUsername, role: u.role }));
  }

  @Get('me')
  @UseGuards(SessionGuard)
  getMe(@CurrentUser() user: UserSession) {
    return {
      username: user.username,
      avatarUrl: user.avatarUrl,
      name: user.name,
      role: user.role,
    };
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const user = (req as any).session?.user;
    if (user) {
      this.auditService.log({
        actor: user.username,
        action: 'USER_LOGOUT',
        repository: 'SYSTEM',
        ipAddress: extractClientIp(req),
      });
    }

    (req as any).session = null;
    return res.json({ success: true, message: 'Logged out successfully' });
  }
}
