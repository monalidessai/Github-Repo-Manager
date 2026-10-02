import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@repo-manager/shared';
import axios from 'axios';
import { Octokit } from '@octokit/rest';

jest.mock('axios');
jest.mock('@octokit/rest');

describe('AuthService', () => {
  let service: AuthService;
  let configService: Partial<ConfigService>;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'GITHUB_CLIENT_ID') return 'test_client_id';
        if (key === 'GITHUB_CLIENT_SECRET') return 'test_client_secret';
        if (key === 'BACKEND_URL') return 'http://localhost:3000';
        return null;
      }),
    };

    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGitHubAuthUrl', () => {
    it('should generate OAuth URL with prompt=select_account', () => {
      const url = service.getGitHubAuthUrl();
      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('prompt=select_account');
    });
  });

  describe('handleCallback', () => {
    it('should authenticate and return session for provisioned user with assigned role', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { access_token: 'mock_gh_token' },
      });

      const mockGetAuthenticated = jest.fn().mockResolvedValue({
        data: {
          login: 'repomanager-test',
          avatar_url: 'https://github.com/repomanager-test.png',
          name: 'Repo Manager Test',
        },
      });

      (Octokit as unknown as jest.Mock).mockImplementation(() => ({
        users: {
          getAuthenticated: mockGetAuthenticated,
        },
      }));

      prismaService.user.findUnique.mockResolvedValue({
        id: '1',
        githubUsername: 'repomanager-test',
        role: UserRole.ADMIN,
        name: 'Repo Manager Test',
        avatarUrl: 'https://github.com/repomanager-test.png',
      });

      const result = await service.handleCallback('valid_code');

      expect(result).toEqual({
        username: 'repomanager-test',
        avatarUrl: 'https://github.com/repomanager-test.png',
        name: 'Repo Manager Test',
        accessToken: 'mock_gh_token',
        role: UserRole.ADMIN,
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { githubUsername: 'repomanager-test' },
      });
    });

    it('should reject unprovisioned user with UNPROVISIONED_USER UnauthorizedException', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { access_token: 'mock_gh_token' },
      });

      const mockGetAuthenticated = jest.fn().mockResolvedValue({
        data: {
          login: 'unauthorized-stranger',
          avatar_url: 'https://github.com/unauthorized-stranger.png',
          name: 'Stranger',
        },
      });

      (Octokit as unknown as jest.Mock).mockImplementation(() => ({
        users: {
          getAuthenticated: mockGetAuthenticated,
        },
      }));

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.handleCallback('valid_code')).rejects.toThrow(
        new UnauthorizedException('UNPROVISIONED_USER'),
      );
    });
  });
});
