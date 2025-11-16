import { Response, NextFunction } from 'express';
import { NotificationsService } from '../services/notifications.service';
import type { AuthRequest } from '../middleware/auth';

export class NotificationsController {
  private service = new NotificationsService();

  getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const notifications = await this.service.getUserNotifications(userId, limit);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const count = await this.service.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.markAsRead(id);

      res.json({
        success: true,
        message: 'Notificação marcada como lida',
      });
    } catch (error) {
      next(error);
    }
  };
}
