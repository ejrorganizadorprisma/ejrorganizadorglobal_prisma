import { ReportsRepository } from '../repositories/reports.repository';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export class ReportsService {
  private repository = new ReportsRepository();

  // Legacy
  async getSalesReport(params: { startDate?: string; endDate?: string }) {
    return this.repository.getSalesReport(params);
  }
  async getInventoryReport() {
    return this.repository.getInventoryReport();
  }

  // ==========================================
  // SUPPLIERS
  // ==========================================
  async getSuppliersReport(type: string, filters: ReportFilters) {
    switch (type) {
      case 'ranking': return this.repository.getSuppliersRanking(filters);
      case 'lead-time': return this.repository.getSuppliersLeadTime(filters);
      case 'status-map': return this.repository.getSuppliersStatusMap(filters);
      case 'price-history': return this.repository.getSuppliersPriceHistory(filters);
      case 'pending-orders': return this.repository.getSuppliersPendingOrders(filters);
      default: throw new Error(`Unknown supplier report type: ${type}`);
    }
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  async getProductsReport(type: string, filters: ReportFilters) {
    switch (type) {
      case 'abc-curve': return this.repository.getProductsAbcCurve(filters);
      case 'critical-stock': return this.repository.getProductsCriticalStock(filters);
      case 'turnover': return this.repository.getProductsTurnover(filters);
      case 'margin': return this.repository.getProductsMargin(filters);
      case 'best-sellers': return this.repository.getProductsBestSellers(filters);
      default: throw new Error(`Unknown product report type: ${type}`);
    }
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================
  async getCustomersReport(type: string, filters: ReportFilters) {
    switch (type) {
      case 'revenue-ranking': return this.repository.getCustomersRevenueRanking(filters);
      case 'defaulters': return this.repository.getCustomersDefaulters(filters);
      case 'frequency': return this.repository.getCustomersFrequency(filters);
      case 'by-type': return this.repository.getCustomersByType(filters);
      case 'avg-ticket': return this.repository.getCustomersAvgTicket(filters);
      default: throw new Error(`Unknown customer report type: ${type}`);
    }
  }

  // ==========================================
  // SALES
  // ==========================================
  async getSalesReportV2(type: string, filters: ReportFilters) {
    switch (type) {
      case 'by-period': return this.repository.getSalesByPeriod(filters);
      case 'by-seller': return this.repository.getSalesBySeller(filters);
      case 'by-payment': return this.repository.getSalesByPayment(filters);
      case 'comparison': return this.repository.getSalesComparison(filters);
      case 'by-category': return this.repository.getSalesByCategory(filters);
      default: throw new Error(`Unknown sales report type: ${type}`);
    }
  }

  // ==========================================
  // FINANCIAL
  // ==========================================
  async getFinancialReport(type: string, filters: ReportFilters) {
    switch (type) {
      case 'cash-flow': return this.repository.getFinancialCashFlow(filters);
      case 'aging-receivables': return this.repository.getFinancialAgingReceivables(filters);
      case 'aging-payables': return this.repository.getFinancialAgingPayables(filters);
      case 'dre': return this.repository.getFinancialDre(filters);
      case 'delinquency': return this.repository.getFinancialDelinquency(filters);
      default: throw new Error(`Unknown financial report type: ${type}`);
    }
  }

  // ==========================================
  // PURCHASES
  // ==========================================
  async getPurchasesReport(type: string, filters: ReportFilters) {
    switch (type) {
      case 'by-status': return this.repository.getPurchasesByStatus(filters);
      case 'by-priority': return this.repository.getPurchasesByPriority(filters);
      case 'quote-comparison': return this.repository.getPurchasesQuoteComparison(filters);
      case 'by-period': return this.repository.getPurchasesByPeriod(filters);
      case 'approval-time': return this.repository.getPurchasesApprovalTime(filters);
      default: throw new Error(`Unknown purchases report type: ${type}`);
    }
  }

  // ==========================================
  // ORDERS
  // ==========================================
  async getOrdersReport(type: string, filters: ReportFilters) {
    switch (type) {
      case 'by-status': return this.repository.getOrdersByStatus(filters);
      case 'delays': return this.repository.getOrdersDelays(filters);
      case 'pending-receipts': return this.repository.getOrdersPendingReceipts(filters);
      case 'by-supplier': return this.repository.getOrdersBySupplier(filters);
      case 'compliance': return this.repository.getOrdersCompliance(filters);
      default: throw new Error(`Unknown orders report type: ${type}`);
    }
  }

  // ==========================================
  // PRODUCTION
  // ==========================================
  async getProductionReport(type: string, filters: ReportFilters) {
    switch (type) {
      case 'efficiency': return this.repository.getProductionEfficiency(filters);
      case 'defect-rate': return this.repository.getProductionDefectRate(filters);
      case 'by-period': return this.repository.getProductionByPeriod(filters);
      case 'by-operator': return this.repository.getProductionByOperator(filters);
      case 'test-results': return this.repository.getProductionTestResults(filters);
      default: throw new Error(`Unknown production report type: ${type}`);
    }
  }

  // ==========================================
  // SERVICE ORDERS
  // ==========================================
  async getServiceOrdersReport(type: string, filters: ReportFilters) {
    switch (type) {
      case 'by-status': return this.repository.getServiceOrdersByStatus(filters);
      case 'avg-time': return this.repository.getServiceOrdersAvgTime(filters);
      case 'by-technician': return this.repository.getServiceOrdersByTechnician(filters);
      case 'costs': return this.repository.getServiceOrdersCosts(filters);
      case 'warranty': return this.repository.getServiceOrdersWarranty(filters);
      default: throw new Error(`Unknown service orders report type: ${type}`);
    }
  }
}
