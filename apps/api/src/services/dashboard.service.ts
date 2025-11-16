import { DashboardRepository } from '../repositories/dashboard.repository';

export class DashboardService {
  private repository = new DashboardRepository();

  async getCompleteOverview() {
    return this.repository.getCompleteOverview();
  }

  async getMetrics(userRole: string) {
    if (userRole === 'OWNER' || userRole === 'DIRECTOR' || userRole === 'MANAGER') {
      return this.repository.getOwnerMetrics();
    }

    return { message: 'Métricas básicas' };
  }
}
