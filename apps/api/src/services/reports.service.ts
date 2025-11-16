import { ReportsRepository } from '../repositories/reports.repository';

export class ReportsService {
  private repository = new ReportsRepository();

  async getSalesReport(params: { startDate?: string; endDate?: string }) {
    return this.repository.getSalesReport(params);
  }

  async getInventoryReport() {
    return this.repository.getInventoryReport();
  }
}
