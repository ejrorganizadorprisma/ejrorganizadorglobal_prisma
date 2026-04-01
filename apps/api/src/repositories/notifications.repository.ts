import { db } from '../config/database';

export class NotificationsRepository {
  async findByUserId(userId: string, limit: number = 10) {
    const query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [userId, limit]);

    return result.rows.map(this.mapNotification);
  }

  async markAsRead(id: string) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
    `;

    await db.query(query, [id]);

    return { success: true };
  }

  async create(notification: { userId: string; type: string; title: string; message: string }) {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const query = `
      INSERT INTO notifications (id, user_id, type, title, message, is_read)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      false,
    ]);

    return this.mapNotification(result.rows[0]);
  }

  async countUnread(userId: string) {
    const query = `
      SELECT COUNT(*)::int as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;

    const result = await db.query(query, [userId]);

    return result.rows[0]?.count || 0;
  }

  private mapNotification(data: any) {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: data.is_read,
      createdAt: new Date(data.created_at),
    };
  }
}
