import { Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import type { AuthRequest } from '../middleware/auth';

export class DashboardController {
  private service = new DashboardService();

  getCompleteOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const overview = await this.service.getCompleteOverview();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  };

  getMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user!.role;
      const metrics = await this.service.getMetrics(userRole);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };
}
