import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { db } from '../config/database';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/gps/events
 * List GPS events with filters and pagination
 */
router.get(
  '/events',
  authorize(['OWNER', 'DIRECTOR', 'MANAGER']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const userId = req.query.userId as string | undefined;
      const eventType = req.query.eventType as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (userId) {
        conditions.push(`ge.user_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }
      if (eventType) {
        conditions.push(`ge.event_type = $${paramIndex}`);
        params.push(eventType);
        paramIndex++;
      }
      if (startDate) {
        conditions.push(`ge.created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        conditions.push(`ge.created_at <= $${paramIndex}::date + interval '1 day'`);
        params.push(endDate);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count
      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM gps_events ge ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || '0');

      // Data
      const dataResult = await db.query(
        `SELECT ge.*, u.name as user_name
         FROM gps_events ge
         JOIN users u ON ge.user_id = u.id
         ${whereClause}
         ORDER BY ge.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const data = dataResult.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventType: row.event_type,
        eventId: row.event_id,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        accuracy: row.accuracy ? parseFloat(row.accuracy) : undefined,
        createdAt: row.created_at,
        user: { id: row.user_id, name: row.user_name },
      }));

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      if (error?.code === '42P01') {
        return res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
      next(error);
    }
  }
);

export default router;
