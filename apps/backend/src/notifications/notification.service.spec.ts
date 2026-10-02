import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: {
    notification: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      notification: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should create new notification when no unread notification exists', async () => {
    prismaService.notification.findFirst.mockResolvedValue(null);
    prismaService.notification.create.mockResolvedValue({
      id: 'notif-1',
      repoName: 'pt-demo',
      message: 'Expiring soon',
      severity: 'warning',
      read: false,
    });

    const result = await service.createNotification({
      repoName: 'pt-demo',
      message: 'Expiring soon',
      severity: 'warning',
    });

    expect(prismaService.notification.create).toHaveBeenCalledWith({
      data: {
        repoName: 'pt-demo',
        message: 'Expiring soon',
        severity: 'warning',
      },
    });
    expect(result.id).toBe('notif-1');
  });

  it('should escalate unread warning notification to danger when target is danger', async () => {
    prismaService.notification.findFirst.mockResolvedValue({
      id: 'notif-1',
      repoName: 'pt-demo',
      message: 'Expiring in 7 days',
      severity: 'warning',
      read: false,
    });

    prismaService.notification.update.mockResolvedValue({
      id: 'notif-1',
      repoName: 'pt-demo',
      message: 'EXPIRED: Deletion pending',
      severity: 'danger',
      read: false,
    });

    const result = await service.createNotification({
      repoName: 'pt-demo',
      message: 'EXPIRED: Deletion pending',
      severity: 'danger',
    });

    expect(prismaService.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: {
        message: 'EXPIRED: Deletion pending',
        severity: 'danger',
      },
    });
    expect(result.severity).toBe('danger');
  });

  it('should not create duplicate or update when notification with same severity already exists unread', async () => {
    const existing = {
      id: 'notif-1',
      repoName: 'pt-demo',
      message: 'Expiring in 7 days',
      severity: 'warning',
      read: false,
    };
    prismaService.notification.findFirst.mockResolvedValue(existing);

    const result = await service.createNotification({
      repoName: 'pt-demo',
      message: 'Expiring in 7 days',
      severity: 'warning',
    });

    expect(prismaService.notification.create).not.toHaveBeenCalled();
    expect(prismaService.notification.update).not.toHaveBeenCalled();
    expect(result).toEqual(existing);
  });
});
