import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GitHubService } from '../github/github.service';
import { AuditService } from '../audit/audit.service';
import { UserSession } from '@repo-manager/shared';

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);

  constructor(
    private readonly githubService: GitHubService,
    private readonly auditService: AuditService,
  ) {}

  async getCollaborators(user: UserSession, repoName: string) {
    return this.githubService.getCollaborators(user.accessToken, repoName);
  }

  async revokeCollaborator(
    user: UserSession,
    repoName: string,
    username: string,
    ipAddress: string,
  ) {
    const collaborators = await this.githubService.getCollaborators(
      user.accessToken,
      repoName,
    );

    const target = collaborators.find(
      (c) => c.username.toLowerCase() === username.toLowerCase(),
    );

    if (
      target &&
      (!target.canRevokeAccess ||
        !target.isOutsideCollaborator ||
        target.isOrganizationOwner ||
        target.isOrganizationMember)
    ) {
      throw new BadRequestException(
        `Cannot revoke access for '${username}'. Revoking access is restricted to outside collaborators and cannot target organization owners or members.`,
      );
    }

    const result = await this.githubService.removeCollaborator(
      user.accessToken,
      repoName,
      username,
    );

    await this.auditService.log({
      actor: user.username,
      action: 'REVOKE_COLLABORATOR',
      repository: repoName,
      ipAddress,
      context: { revokedUser: username },
    });

    return result;
  }

  async revokeAllOutsideCollaborators(
    user: UserSession,
    repoName: string,
    ipAddress: string,
  ) {
    const collaborators = await this.githubService.getCollaborators(
      user.accessToken,
      repoName,
    );

    const outsideCollabs = collaborators.filter(
      (c) =>
        c.isOutsideCollaborator &&
        c.canRevokeAccess &&
        !c.isOrganizationOwner &&
        !c.isOrganizationMember,
    );

    this.logger.log(
      `Found ${outsideCollabs.length} eligible outside collaborators to revoke in ${repoName}`,
    );

    const revokedUsers: string[] = [];

    for (const collab of outsideCollabs) {
      await this.githubService.removeCollaborator(
        user.accessToken,
        repoName,
        collab.username,
      );
      revokedUsers.push(collab.username);
    }

    await this.auditService.log({
      actor: user.username,
      action: 'REVOKE_ALL_OUTSIDE_COLLABORATORS',
      repository: repoName,
      ipAddress,
      context: { count: revokedUsers.length, revokedUsers },
    });

    return {
      success: true,
      message: `Successfully revoked ${revokedUsers.length} outside collaborators`,
      revokedUsers,
    };
  }
}
