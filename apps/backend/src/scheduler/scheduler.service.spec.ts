import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { AppConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { ConfigService } from '@nestjs/config';
import { SimulationService } from '../simulation/simulation.service';
import { calculateRepoExpiry } from '../common/utils/expiry.util';

describe('SchedulerService Simulation & Retention Boundaries', () => {
  let service: SchedulerService;
  let simulationService: SimulationService;
  let auditService: jest.Mocked<Partial<AuditService>>;
  let notificationService: jest.Mocked<Partial<NotificationService>>;

  const config = {
    repoPrefix: 'pt-',
    retentionDays: 10,
    warningDays: 3,
    defaultExpiryAction: 'delete' as const,
    githubOrg: 'pt-repo-org',
  };

  beforeEach(async () => {
    simulationService = new SimulationService();

    auditService = {
      log: jest.fn().mockResolvedValue({} as any),
    };

    notificationService = {
      createNotification: jest.fn().mockResolvedValue({} as any),
    };

    const mockPrisma = {
      repoOverride: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const mockAppConfig = {
      getConfig: jest.fn().mockResolvedValue(config),
    };

    const mockNestConfig = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: SimulationService, useValue: simulationService },
        { provide: AppConfigService, useValue: mockAppConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: ConfigService, useValue: mockNestConfig },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  describe('Regression Tests: Simulation & Lifecycle States', () => {
    it('1. Live repository before expiry -> positive remaining days', () => {
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const override = { customExpiryDate: new Date('2026-08-11T00:00:00.000Z'), customAction: 'archive' };
      const effectiveNow = new Date('2026-08-05T00:00:00.000Z');

      const info = calculateRepoExpiry(createdAt, config, override, effectiveNow, false);
      expect(info.remainingDays).toBe(6);
      expect(info.isExpired).toBe(false);
    });

    it('2. Repository reaches expiry during simulation and is archived -> Archived state & 0 remaining days', () => {
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const override = { customExpiryDate: new Date('2026-08-11T00:00:00.000Z'), customAction: 'archive' };
      const effectiveNow = new Date('2026-08-11T12:00:00.000Z');
      const isArchivedOnGitHub = true;

      const info = calculateRepoExpiry(createdAt, config, override, effectiveNow, isArchivedOnGitHub);
      expect(info.remainingDays).toBe(0);
      expect(info.isExpired).toBe(true);
      expect(info.targetAction).toBe('archive');
    });

    it('3. Reset simulation after archive -> repository remains Archived and does not regain a positive countdown', () => {
      simulationService.advanceTime(10);
      expect(simulationService.getOffsetDays()).toBe(10);

      // Simulation is reset back to 0 offset (real date 2026-08-01)
      simulationService.resetSimulation();
      expect(simulationService.getOffsetDays()).toBe(0);

      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const override = { customExpiryDate: new Date('2026-08-11T00:00:00.000Z'), customAction: 'archive' };
      const realNow = simulationService.getEffectiveNow(); // Real date
      const isArchivedOnGitHub = true; // GitHub repository remains archived

      const info = calculateRepoExpiry(createdAt, config, override, realNow, isArchivedOnGitHub);

      expect(info.remainingDays).toBe(0);
      expect(info.isExpired).toBe(true);
    });

    it('4. Live repository reset without lifecycle action -> normal countdown is restored', () => {
      simulationService.advanceTime(3);
      expect(simulationService.getOffsetDays()).toBe(3);

      simulationService.resetSimulation();
      expect(simulationService.getOffsetDays()).toBe(0);

      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const override = { customExpiryDate: new Date('2026-08-11T00:00:00.000Z'), customAction: 'archive' };
      const realNow = new Date('2026-08-01T00:00:00.000Z');
      const isArchivedOnGitHub = false;

      const info = calculateRepoExpiry(createdAt, config, override, realNow, isArchivedOnGitHub);

      expect(info.remainingDays).toBe(10);
      expect(info.isExpired).toBe(false);
    });

    it('5. Auto-delete behavior remains unchanged', () => {
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const override = { customExpiryDate: new Date('2026-08-11T00:00:00.000Z'), customAction: 'delete' };
      const effectiveNow = new Date('2026-08-11T14:00:00.000Z');

      const info = calculateRepoExpiry(createdAt, config, override, effectiveNow, false);

      expect(info.targetAction).toBe('delete');
      expect(info.isExpired).toBe(true);
    });

    it('6. Existing custom expiry behavior remains unchanged', () => {
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const override = { customExpiryDate: new Date('2026-08-20T00:00:00.000Z'), customAction: 'archive' };
      const effectiveNow = new Date('2026-08-05T00:00:00.000Z');

      const info = calculateRepoExpiry(createdAt, config, override, effectiveNow, false);

      expect(info.expiryDate.toISOString()).toBe('2026-08-20T00:00:00.000Z');
      expect(info.remainingDays).toBe(15);
      expect(info.isExpired).toBe(false);
    });
  });
});
