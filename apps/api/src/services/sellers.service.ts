import { SellersRepository } from '../repositories/sellers.repository';

export class SellersService {
  private repository = new SellersRepository();

  async getStats(filters: { startDate?: string; endDate?: string }) {
    return this.repository.getSellerStats(filters);
  }

  async getSellerTimeSeries(sellerId: string, filters: {
    startDate?: string; endDate?: string; groupBy?: string;
  }) {
    return this.repository.getSellerTimeSeries(sellerId, filters);
  }

  async getComparison(filters: {
    startDate?: string; endDate?: string; groupBy?: string;
  }) {
    return this.repository.getComparison(filters);
  }

  async getSellerDetail(sellerId: string, filters: { startDate?: string; endDate?: string }) {
    return this.repository.getSellerDetail(sellerId, filters);
  }
}
