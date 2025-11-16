import { Request, Response, NextFunction } from 'express';
import { ReportsService } from '../services/reports.service';

export class ReportsController {
  private service = new ReportsService();

  getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;

      const report = await this.service.getSalesReport({
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  getInventoryReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await this.service.getInventoryReport();

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };
}
