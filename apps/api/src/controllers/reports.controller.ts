import { Request, Response, NextFunction } from 'express';
import { ReportsService } from '../services/reports.service';

export class ReportsController {
  private service = new ReportsService();

  // Legacy endpoints
  getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;
      const report = await this.service.getSalesReport({
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json({ success: true, data: report });
    } catch (error) { next(error); }
  };

  getInventoryReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await this.service.getInventoryReport();
      res.json({ success: true, data: report });
    } catch (error) { next(error); }
  };

  // Generic handler factory
  private makeHandler(method: (type: string, filters: any) => Promise<any>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { type, startDate, endDate, groupBy } = req.query;
        if (!type) {
          res.status(400).json({ success: false, error: { message: 'Query param "type" is required' } });
          return;
        }
        const filters: any = {};
        if (startDate) filters.startDate = startDate as string;
        if (endDate) filters.endDate = endDate as string;
        if (groupBy) filters.groupBy = groupBy as string;
        const data = await method.call(this.service, type as string, filters);
        res.json({ success: true, data });
      } catch (error: any) {
        if (error.message?.startsWith('Unknown')) {
          res.status(400).json({ success: false, error: { message: error.message } });
          return;
        }
        next(error);
      }
    };
  }

  // Category handlers
  getSuppliersReport = this.makeHandler(this.service.getSuppliersReport);
  getProductsReport = this.makeHandler(this.service.getProductsReport);
  getCustomersReport = this.makeHandler(this.service.getCustomersReport);
  getSalesReportV2 = this.makeHandler(this.service.getSalesReportV2);
  getFinancialReport = this.makeHandler(this.service.getFinancialReport);
  getPurchasesReport = this.makeHandler(this.service.getPurchasesReport);
  getOrdersReport = this.makeHandler(this.service.getOrdersReport);
  getProductionReport = this.makeHandler(this.service.getProductionReport);
  getServiceOrdersReport = this.makeHandler(this.service.getServiceOrdersReport);
}
