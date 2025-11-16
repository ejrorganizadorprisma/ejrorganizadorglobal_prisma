import { NotificationsRepository } from '../repositories/notifications.repository';

export class NotificationsService {
  private repository = new NotificationsRepository();

  async getUserNotifications(userId: string, limit?: number) {
    return this.repository.findByUserId(userId, limit);
  }

  async markAsRead(id: string) {
    return this.repository.markAsRead(id);
  }

  async getUnreadCount(userId: string) {
    return this.repository.countUnread(userId);
  }

  async createNotification(data: { userId: string; type: string; title: string; message: string }) {
    return this.repository.create(data);
  }
}
