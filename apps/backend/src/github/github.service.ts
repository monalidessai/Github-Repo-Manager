import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { AppConfigService } from '../config/config.service';
import { CollaboratorItem } from '@repo-manager/shared';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  constructor(private readonly configService: AppConfigService) {}

  private getOctokit(accessToken: string): Octokit {
    return new Octokit({ auth: accessToken });
  }

  async listRepositories(accessToken: string) {
    const octokit = this.getOctokit(accessToken);
    const config = await this.configService.getConfig();
    const prefix = config.repoPrefix || 'pt-';
    const org = config.githubOrg;

    this.logger.log(`Fetching repositories for org: ${org || 'user account'}, prefix: ${prefix}`);

    try {
      let rawRepos: any[] = [];

      if (org && org.trim() !== '') {
        // Fetch organization repositories
        const response = await octokit.paginate(octokit.repos.listForOrg, {
          org: org.trim(),
          per_page: 100,
        });
        rawRepos = response;
      } else {
        // Fetch user repositories if no org specified
        const response = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
          per_page: 100,
          affiliation: 'owner,collaborator,organization_member',
        });
        rawRepos = response;
      }

      // Strict Scope Rule: Only repositories starting with `prefix`
      const filtered = rawRepos.filter((repo) =>
        repo.name.toLowerCase().startsWith(prefix.toLowerCase()),
      );

      this.logger.log(`Found ${rawRepos.length} total repos, ${filtered.length} matching prefix '${prefix}'`);

      return filtered.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        createdAt: repo.created_at,
        isArchived: repo.archived,
        htmlUrl: repo.html_url,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to list repositories: ${error.message}`);
      this.handleGitHubError(error);
    }
  }

  async getCollaborators(accessToken: string, repoName: string): Promise<CollaboratorItem[]> {
    const octokit = this.getOctokit(accessToken);
    const config = await this.configService.getConfig();
    const owner = await this.resolveRepoOwner(accessToken, repoName, config.githubOrg);
    const org = config.githubOrg && config.githubOrg.trim() !== '' ? config.githubOrg.trim() : null;

    try {
      const repoCollabs = await octokit.paginate(octokit.repos.listCollaborators, {
        owner,
        repo: repoName,
        affiliation: 'all',
        per_page: 100,
      });

      const orgOwnerSet = new Set<string>();
      const orgMemberSet = new Set<string>();
      const outsideCollabSet = new Set<string>();

      if (org) {
        try {
          const orgOwners = await octokit.paginate(octokit.orgs.listMembers, {
            org,
            role: 'admin',
            per_page: 100,
          });
          orgOwners.forEach((m: any) => orgOwnerSet.add(m.login.toLowerCase()));
        } catch (e: any) {
          this.logger.warn(`Could not fetch org owners for ${org}: ${e.message}`);
        }

        try {
          const orgMembers = await octokit.paginate(octokit.orgs.listMembers, {
            org,
            role: 'member',
            per_page: 100,
          });
          orgMembers.forEach((m: any) => orgMemberSet.add(m.login.toLowerCase()));
        } catch (e: any) {
          this.logger.warn(`Could not fetch org members for ${org}: ${e.message}`);
        }

        try {
          const outsideCollabs = await octokit.paginate(octokit.repos.listCollaborators, {
            owner,
            repo: repoName,
            affiliation: 'outside',
            per_page: 100,
          });
          outsideCollabs.forEach((c: any) => outsideCollabSet.add(c.login.toLowerCase()));
        } catch (e: any) {
          this.logger.warn(`Could not fetch outside collabs for ${repoName}: ${e.message}`);
        }
      }

      return repoCollabs.map((collab: any) => {
        const login = collab.login.toLowerCase();
        const isOrganizationOwner = orgOwnerSet.has(login);
        const isOrganizationMember = orgMemberSet.has(login);
        const isOutsideCollaborator =
          outsideCollabSet.has(login) ||
          (!isOrganizationOwner && !isOrganizationMember && collab.role_name === 'outside') ||
          (!isOrganizationOwner && !isOrganizationMember && !org);

        const canRevokeAccess = isOutsideCollaborator && !isOrganizationOwner && !isOrganizationMember;

        return {
          username: collab.login,
          avatarUrl: collab.avatar_url,
          roleName: collab.role_name || (collab.permissions?.admin ? 'admin' : collab.permissions?.push ? 'push' : 'pull'),
          isOutside: isOutsideCollaborator,
          isOutsideCollaborator,
          isOrganizationMember,
          isOrganizationOwner,
          canRevokeAccess,
        };
      });
    } catch (error: any) {
      this.logger.error(`Failed to get collaborators for ${repoName}: ${error.message}`);
      this.handleGitHubError(error);
    }
  }

  async removeCollaborator(accessToken: string, repoName: string, username: string) {
    const octokit = this.getOctokit(accessToken);
    const config = await this.configService.getConfig();
    const owner = await this.resolveRepoOwner(accessToken, repoName, config.githubOrg);

    try {
      this.logger.log(`Removing collaborator ${username} from ${owner}/${repoName}`);
      await octokit.repos.removeCollaborator({
        owner,
        repo: repoName,
        username,
      });
      return { success: true, message: `Collaborator ${username} removed successfully` };
    } catch (error: any) {
      this.logger.error(`Failed to remove collaborator ${username}: ${error.message}`);
      this.handleGitHubError(error);
    }
  }

  async archiveRepository(accessToken: string, repoName: string) {
    const octokit = this.getOctokit(accessToken);
    const config = await this.configService.getConfig();
    const owner = await this.resolveRepoOwner(accessToken, repoName, config.githubOrg);

    try {
      this.logger.log(`Archiving repository ${owner}/${repoName}`);
      await octokit.repos.update({
        owner,
        repo: repoName,
        archived: true,
      });
      return { success: true, message: `Repository ${repoName} archived successfully` };
    } catch (error: any) {
      this.logger.error(`Failed to archive repository ${repoName}: ${error.message}`);
      this.handleGitHubError(error);
    }
  }

  async deleteRepository(accessToken: string, repoName: string) {
    const octokit = this.getOctokit(accessToken);
    const config = await this.configService.getConfig();
    const owner = await this.resolveRepoOwner(accessToken, repoName, config.githubOrg);

    try {
      this.logger.log(`Deleting repository ${owner}/${repoName}`);
      await octokit.repos.delete({
        owner,
        repo: repoName,
      });
      return { success: true, message: `Repository ${repoName} deleted successfully` };
    } catch (error: any) {
      this.logger.error(`Failed to delete repository ${repoName}: ${error.message}`);
      this.handleGitHubError(error);
    }
  }

  private async resolveRepoOwner(accessToken: string, repoName: string, configuredOrg?: string): Promise<string> {
    if (configuredOrg && configuredOrg.trim() !== '') {
      return configuredOrg.trim();
    }
    const octokit = this.getOctokit(accessToken);
    const { data } = await octokit.users.getAuthenticated();
    return data.login;
  }

  private handleGitHubError(error: any): never {
    const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error.response?.data?.message || error.message || 'GitHub API Error';
    
    if (status === 403 && message.includes('rate limit')) {
      throw new HttpException('GitHub API rate limit exceeded. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (status === 404) {
      throw new HttpException('Repository or GitHub resource not found.', HttpStatus.NOT_FOUND);
    }
    if (status === 401) {
      throw new HttpException('GitHub authentication failed or token expired.', HttpStatus.UNAUTHORIZED);
    }

    throw new HttpException(message, status);
  }
}
