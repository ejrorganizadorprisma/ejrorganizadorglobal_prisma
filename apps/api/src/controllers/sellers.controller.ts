import { Response, NextFunction } from 'express';
import { SellersService } from '../services/sellers.service';
import type { AuthRequest } from '../middleware/auth';

export class SellersController {
  private service = new SellersService();

  getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;
      const data = await this.service.getStats({
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getSellerStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate, groupBy } = req.query;
      const data = await this.service.getSellerTimeSeries(id, {
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getComparison = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const data = await this.service.getComparison({
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
