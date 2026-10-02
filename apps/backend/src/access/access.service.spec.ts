import { Test, TestingModule } from '@nestjs/testing';
import { AccessService } from './access.service';
import { GitHubService } from '../github/github.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException } from '@nestjs/common';
import { CollaboratorItem, UserRole, UserSession } from '@repo-manager/shared';

describe('AccessService', () => {
  let service: AccessService;
  let githubService: jest.Mocked<Partial<GitHubService>>;
  let auditService: jest.Mocked<Partial<AuditService>>;

  const mockUser: UserSession = {
    username: 'test-lead',
    avatarUrl: 'https://github.com/test-lead.png',
    accessToken: 'gho_mocktoken123',
    role: UserRole.USER,
  };

  const mockRepo = 'pt-go-barry';

  const mockCollaborators: CollaboratorItem[] = [
    {
      username: 'sharv-dessai',
      avatarUrl: 'https://github.com/sharv-dessai.png',
      roleName: 'admin',
      isOutside: false,
      isOutsideCollaborator: false,
      isOrganizationMember: false,
      isOrganizationOwner: true,
      canRevokeAccess: false,
    },
    {
      username: 'org-member-1',
      avatarUrl: 'https://github.com/org-member-1.png',
      roleName: 'push',
      isOutside: false,
      isOutsideCollaborator: false,
      isOrganizationMember: true,
      isOrganizationOwner: false,
      canRevokeAccess: false,
    },
    {
      username: 'swayamprabhu2005',
      avatarUrl: 'https://github.com/swayamprabhu2005.png',
      roleName: 'write',
      isOutside: true,
      isOutsideCollaborator: true,
      isOrganizationMember: false,
      isOrganizationOwner: false,
      canRevokeAccess: true,
    },
  ];

  beforeEach(async () => {
    githubService = {
      getCollaborators: jest.fn().mockResolvedValue(mockCollaborators),
      removeCollaborator: jest.fn().mockResolvedValue({ success: true, message: 'Removed' }),
    };

    auditService = {
      log: jest.fn().mockResolvedValue({} as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: GitHubService, useValue: githubService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AccessService>(AccessService);
  });

  describe('getCollaborators', () => {
    it('should return collaborators for a repository', async () => {
      const result = await service.getCollaborators(mockUser, mockRepo);
      expect(result).toHaveLength(3);
      expect(githubService.getCollaborators).toHaveBeenCalledWith(mockUser.accessToken, mockRepo);
    });
  });

  describe('revokeCollaborator Safeguards', () => {
    it('TEST 1: Organization owner cannot be revoked and throws BadRequestException', async () => {
      await expect(
        service.revokeCollaborator(mockUser, mockRepo, 'sharv-dessai', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);

      expect(githubService.removeCollaborator).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('TEST 2: Organization member cannot be revoked and throws BadRequestException', async () => {
      await expect(
        service.revokeCollaborator(mockUser, mockRepo, 'org-member-1', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);

      expect(githubService.removeCollaborator).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('TEST 3 & 5: Outside collaborator swayamprabhu2005 can be revoked and logs audit entry', async () => {
      const result = await service.revokeCollaborator(
        mockUser,
        mockRepo,
        'swayamprabhu2005',
        '127.0.0.1',
      );

      expect(result).toEqual({ success: true, message: 'Removed' });
      expect(githubService.removeCollaborator).toHaveBeenCalledWith(
        mockUser.accessToken,
        mockRepo,
        'swayamprabhu2005',
      );
      expect(auditService.log).toHaveBeenCalledWith({
        actor: mockUser.username,
        action: 'REVOKE_COLLABORATOR',
        repository: mockRepo,
        ipAddress: '127.0.0.1',
        context: { revokedUser: 'swayamprabhu2005' },
      });
    });
  });

  describe('revokeAllOutsideCollaborators Safeguards', () => {
    it('TEST 4 & 6: Bulk revoke targets ONLY actual outside collaborators and never org owners or members', async () => {
      const result = await service.revokeAllOutsideCollaborators(mockUser, mockRepo, '127.0.0.1');

      expect(result.revokedUsers).toEqual(['swayamprabhu2005']);
      expect(result.revokedUsers).not.toContain('sharv-dessai');
      expect(result.revokedUsers).not.toContain('org-member-1');

      expect(githubService.removeCollaborator).toHaveBeenCalledTimes(1);
      expect(githubService.removeCollaborator).toHaveBeenCalledWith(
        mockUser.accessToken,
        mockRepo,
        'swayamprabhu2005',
      );

      expect(auditService.log).toHaveBeenCalledWith({
        actor: mockUser.username,
        action: 'REVOKE_ALL_OUTSIDE_COLLABORATORS',
        repository: mockRepo,
        ipAddress: '127.0.0.1',
        context: { count: 1, revokedUsers: ['swayamprabhu2005'] },
      });
    });
  });
});
