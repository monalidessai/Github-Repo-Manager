import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(params: { repoName: string; message: string; severity?: 'warning' | 'danger' }) {
    const targetSeverity = params.severity || 'warning';

    // Check if an unread notification already exists for this repo to avoid spamming
    const existing = await this.prisma.notification.findFirst({
      where: {
        repoName: params.repoName,
        read: false,
      },
    });

    if (existing) {
      // If escalating from warning to danger, update the existing unread notification
      if (targetSeverity === 'danger' && existing.severity !== 'danger') {
        this.logger.log(
          `Escalating in-app notification for repo ${params.repoName} from warning to danger: ${params.message}`,
        );
        return this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            message: params.message,
            severity: 'danger',
          },
        });
      }
      return existing;
    }

    this.logger.log(`Creating in-app notification for repo ${params.repoName}: ${params.message}`);

    return this.prisma.notification.create({
      data: {
        repoName: params.repoName,
        message: params.message,
        severity: targetSeverity,
      },
    });
  }

  async getNotifications() {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { read: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead() {
    await this.prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return { success: true, message: 'All notifications marked as read' };
  }
}
