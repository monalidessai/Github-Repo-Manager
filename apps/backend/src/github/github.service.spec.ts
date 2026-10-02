import { Test, TestingModule } from '@nestjs/testing';
import { GitHubService } from './github.service';
import { AppConfigService } from '../config/config.service';

describe('GitHubService Scoping & Classification', () => {
  let service: GitHubService;
  let configService: jest.Mocked<Partial<AppConfigService>>;
  let octokitMock: any;

  beforeEach(async () => {
    configService = {
      getConfig: jest.fn().mockResolvedValue({
        repoPrefix: 'pt-',
        retentionDays: 90,
        warningDays: 14,
        defaultExpiryAction: 'delete',
        githubOrg: 'pt-repo-org',
      }),
    };

    octokitMock = {
      paginate: jest.fn(),
      users: {
        getAuthenticated: jest.fn().mockResolvedValue({ data: { login: 'pt-repo-org' } }),
      },
      repos: {
        listCollaborators: jest.fn(),
        removeCollaborator: jest.fn(),
      },
      orgs: {
        listMembers: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubService,
        { provide: AppConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<GitHubService>(GitHubService);
    (service as any).getOctokit = jest.fn().mockReturnValue(octokitMock);
  });

  describe('getCollaborators dataset scoping tests', () => {
    it('TEST 7: Org members NOT having direct access are NOT duplicated into repo collaborator list', async () => {
      // Mock repo listCollaborators returns ONLY candidate-a (outside) and owner-1
      octokitMock.paginate.mockImplementation((method: any, params: any) => {
        if (method === octokitMock.repos.listCollaborators) {
          if (params.affiliation === 'outside') {
            return Promise.resolve([{ login: 'candidate-a', avatar_url: '', role_name: 'write' }]);
          }
          return Promise.resolve([
            { login: 'owner-1', avatar_url: '', role_name: 'admin', permissions: { admin: true } },
            { login: 'candidate-a', avatar_url: '', role_name: 'write', permissions: { push: true } },
          ]);
        }
        if (method === octokitMock.orgs.listMembers) {
          if (params.role === 'admin') {
            return Promise.resolve([{ login: 'owner-1', avatar_url: '', html_url: '' }]);
          }
          if (params.role === 'member') {
            // Unrelated org member who does NOT have access to pt-repo-1
            return Promise.resolve([{ login: 'unrelated-member-x', avatar_url: '', html_url: '' }]);
          }
        }
        return Promise.resolve([]);
      });

      const collabs = await service.getCollaborators('mock-token', 'pt-repo-1');

      // Must strictly equal 2 (owner-1 and candidate-a), unrelated-member-x MUST NOT be present
      expect(collabs).toHaveLength(2);
      const usernames = collabs.map((c) => c.username);
      expect(usernames).toContain('owner-1');
      expect(usernames).toContain('candidate-a');
      expect(usernames).not.toContain('unrelated-member-x');
    });

    it('TEST 8: Repository collaborator results remain strictly scoped to the specific repository', async () => {
      octokitMock.paginate.mockImplementation((method: any, params: any) => {
        if (method === octokitMock.repos.listCollaborators) {
          if (params.repo === 'pt-repo-alpha') {
            return Promise.resolve([
              { login: 'candidate-alpha', avatar_url: '', role_name: 'write', permissions: { push: true } },
            ]);
          }
          if (params.repo === 'pt-repo-beta') {
            return Promise.resolve([
              { login: 'candidate-beta', avatar_url: '', role_name: 'write', permissions: { push: true } },
            ]);
          }
        }
        if (method === octokitMock.orgs.listMembers) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      const alphaCollabs = await service.getCollaborators('mock-token', 'pt-repo-alpha');
      const betaCollabs = await service.getCollaborators('mock-token', 'pt-repo-beta');

      expect(alphaCollabs.map((c) => c.username)).toEqual(['candidate-alpha']);
      expect(betaCollabs.map((c) => c.username)).toEqual(['candidate-beta']);
    });
  });
});
