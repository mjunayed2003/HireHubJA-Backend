import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  // ==================================================
  // 1. GET ALL NOTIFICATIONS
  // ==================================================
  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================================================
  // 2. MARK ONE AS READ
  // ==================================================
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // ==================================================
  // 3. MARK ALL AS READ
  // ==================================================
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'All notifications marked as read' };
  }

  // ==================================================
  // 4. DELETE ONE NOTIFICATION
  // ==================================================
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted' };
  }

  // ==================================================
  // 5. DELETE ALL NOTIFICATIONS
  // ==================================================
  async deleteAllNotifications(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { message: 'All notifications deleted' };
  }

  // ==================================================
  // 6. UNREAD COUNT
  // ==================================================
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  // ==================================================
  // HELPER: CREATE NOTIFICATION (other services use this)
  // ==================================================
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, title, message, type },
    });
  }
}