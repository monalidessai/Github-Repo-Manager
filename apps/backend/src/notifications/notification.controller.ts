import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SessionGuard } from '../common/guards/session.guard';

@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications() {
    return this.notificationService.getNotifications();
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('read-all')
  async markAllAsRead() {
    return this.notificationService.markAllAsRead();
  }
}
