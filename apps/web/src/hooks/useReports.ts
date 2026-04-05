import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

// ---- Filtros genéricos ----
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

// ---- Hook genérico para qualquer relatório ----
export function useReport(category: string, type: string, filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['reports', category, type, filters],
    queryFn: async () => {
      const params: any = { type };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.groupBy) params.groupBy = filters.groupBy;
      const { data } = await api.get(`/reports/${category}`, { params });
      return data.data;
    },
    enabled: !!type,
  });
}

// ---- Hooks por categoria (convenience wrappers) ----

export function useSuppliersReport(type: string, filters: ReportFilters = {}) {
  return useReport('suppliers', type, filters);
}

export function useProductsReport(type: string, filters: ReportFilters = {}) {
  return useReport('products', type, filters);
}

export function useCustomersReport(type: string, filters: ReportFilters = {}) {
  return useReport('customers', type, filters);
}

export function useSalesReportV2(type: string, filters: ReportFilters = {}) {
  return useReport('sales-report', type, filters);
}

export function useFinancialReport(type: string, filters: ReportFilters = {}) {
  return useReport('financial-report', type, filters);
}

export function usePurchasesReport(type: string, filters: ReportFilters = {}) {
  return useReport('purchases', type, filters);
}

export function useOrdersReport(type: string, filters: ReportFilters = {}) {
  return useReport('orders', type, filters);
}

export function useProductionReport(type: string, filters: ReportFilters = {}) {
  return useReport('production', type, filters);
}

export function useServiceOrdersReport(type: string, filters: ReportFilters = {}) {
  return useReport('service-orders', type, filters);
}

// ---- Legacy hooks (backward compatibility) ----

export function useSalesReport(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/sales', { params });
      return data.data;
    },
  });
}

export function useInventoryReport() {
  return useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: async () => {
      const { data } = await api.get('/reports/inventory');
      return data.data;
    },
  });
}
