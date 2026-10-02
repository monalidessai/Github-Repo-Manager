import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import axios from 'axios';
import { UserSession } from '@repo-manager/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getGitHubAuthUrl(state?: string): string {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID');
    const redirectUri = `${this.config.get<string>('BACKEND_URL')}/auth/callback`;
    const scope = 'repo delete_repo user admin:org';

    let url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scope)}&prompt=select_account`;

    if (state) {
      url += `&state=${encodeURIComponent(state)}`;
    }

    return url;
  }

  async handleCallback(code: string): Promise<UserSession> {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET');

    this.logger.log('Exchanging authorization code for GitHub access token...');

    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const { access_token, error, error_description } = response.data;

      if (error || !access_token) {
        this.logger.error(`GitHub OAuth error: ${error_description || error}`);
        throw new UnauthorizedException(error_description || 'Failed to obtain access token from GitHub');
      }

      // Fetch user profile from GitHub API
      const octokit = new Octokit({ auth: access_token });
      const { data: user } = await octokit.users.getAuthenticated();

      this.logger.log(`User authenticated via GitHub: ${user.login}`);

      // RBAC Authorization Check: Verify user exists in PostgreSQL User table
      const dbUser = await this.prisma.user.findUnique({
        where: { githubUsername: user.login },
      });

      if (!dbUser) {
        this.logger.warn(
          `Access DENIED: GitHub user '${user.login}' is NOT provisioned in PostgreSQL database.`,
        );
        throw new UnauthorizedException('UNPROVISIONED_USER');
      }

      this.logger.log(
        `User provisioned and authorized: ${dbUser.githubUsername} -> Application Role: ${dbUser.role}`,
      );

      return {
        username: dbUser.githubUsername,
        avatarUrl: user.avatar_url || dbUser.avatarUrl || `https://github.com/${dbUser.githubUsername}.png`,
        name: user.name || dbUser.name || dbUser.githubUsername,
        accessToken: access_token,
        role: dbUser.role as any,
      };
    } catch (err: any) {
      if (err.message === 'UNPROVISIONED_USER' || err?.response?.message === 'UNPROVISIONED_USER') {
        throw new UnauthorizedException('UNPROVISIONED_USER');
      }
      this.logger.error(`OAuth callback error: ${err.message}`);
      throw new UnauthorizedException(err.message || 'Authentication failed: Invalid authorization code or credentials.');
    }
  }
}
