import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/authStore';

export interface MyCommissionsSummary {
  currentMonth: number;
  previousMonth: number;
  deltaPercent: number;
  totalPending: number;
  totalSettled: number;
  totalAllTime: number;
  entriesCount: number;
  configSalesRate: number;
  configCollectionsRate: number;
}

export interface MyCommissionEntry {
  id: string;
  sourceType: 'SALE' | 'COLLECTION';
  sourceId: string;
  sourceNumber: string;
  customerId: string | null;
  customerName: string | null;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'PENDING' | 'SETTLED';
  createdAt: string;
}

export interface MyMonthlyPoint {
  month: string; // YYYY-MM
  amount: number;
  entriesCount: number;
}

export interface MyCustomerAgg {
  customerId: string;
  customerName: string;
  totalAmount: number;
  entriesCount: number;
}

export interface EntriesFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  sourceType?: 'SALE' | 'COLLECTION';
  status?: 'PENDING' | 'SETTLED';
  page?: number;
  limit?: number;
}

const EMPTY_SUMMARY: MyCommissionsSummary = {
  currentMonth: 0,
  previousMonth: 0,
  deltaPercent: 0,
  totalPending: 0,
  totalSettled: 0,
  totalAllTime: 0,
  entriesCount: 0,
  configSalesRate: 0,
  configCollectionsRate: 0,
};

function buildEntriesQuery(filters: EntriesFilters): string {
  const parts: string[] = [];
  if (filters.startDate) parts.push(`startDate=${encodeURIComponent(filters.startDate)}`);
  if (filters.endDate) parts.push(`endDate=${encodeURIComponent(filters.endDate)}`);
  if (filters.customerId) parts.push(`customerId=${encodeURIComponent(filters.customerId)}`);
  if (filters.sourceType) parts.push(`sourceType=${filters.sourceType}`);
  if (filters.status) parts.push(`status=${filters.status}`);
  if (filters.page) parts.push(`page=${filters.page}`);
  if (filters.limit) parts.push(`limit=${filters.limit}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function useMyCommissions() {
  const { token } = useAuthStore();
  const [summary, setSummary] = useState<MyCommissionsSummary>(EMPTY_SUMMARY);
  const [entries, setEntries] = useState<MyCommissionEntry[]>([]);
  const [monthly, setMonthly] = useState<MyMonthlyPoint[]>([]);
  const [topCustomers, setTopCustomers] = useState<MyCustomerAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!token) return EMPTY_SUMMARY;
    try {
      const result = await apiRequest<MyCommissionsSummary>('/commissions/my/summary', { token });
      if (result.success && result.data) return result.data;
      return EMPTY_SUMMARY;
    } catch {
      return EMPTY_SUMMARY;
    }
  }, [token]);

  const fetchMonthly = useCallback(async (months = 6): Promise<MyMonthlyPoint[]> => {
    if (!token) return [];
    try {
      const result = await apiRequest<MyMonthlyPoint[]>(`/commissions/my/monthly?months=${months}`, { token });
      if (result.success && Array.isArray(result.data)) return result.data;
      return [];
    } catch {
      return [];
    }
  }, [token]);

  const fetchTopCustomers = useCallback(async (limit = 10): Promise<MyCustomerAgg[]> => {
    if (!token) return [];
    try {
      const result = await apiRequest<MyCustomerAgg[]>(`/commissions/my/by-customer?limit=${limit}`, { token });
      if (result.success && Array.isArray(result.data)) return result.data;
      return [];
    } catch {
      return [];
    }
  }, [token]);

  const fetchEntries = useCallback(async (filters: EntriesFilters = {}): Promise<MyCommissionEntry[]> => {
    if (!token) return [];
    try {
      const query = buildEntriesQuery(filters);
      const result = await apiRequest<MyCommissionEntry[]>(`/commissions/my/entries${query}`, { token });
      if (result.success && Array.isArray(result.data)) return result.data;
      return [];
    } catch {
      return [];
    }
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) {
      setSummary(EMPTY_SUMMARY);
      setEntries([]);
      setMonthly([]);
      setTopCustomers([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [s, m, c, e] = await Promise.all([
        fetchSummary(),
        fetchMonthly(6),
        fetchTopCustomers(10),
        fetchEntries({ page: 1, limit: 20 }),
      ]);
      setSummary(s);
      setMonthly(m);
      setTopCustomers(c);
      setEntries(e);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar comissoes');
      setSummary(EMPTY_SUMMARY);
      setEntries([]);
      setMonthly([]);
      setTopCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [token, fetchSummary, fetchMonthly, fetchTopCustomers, fetchEntries]);

  const loadEntries = useCallback(async (filters: EntriesFilters = {}) => {
    setError(null);
    const result = await fetchEntries(filters);
    setEntries(result);
    return result;
  }, [fetchEntries]);

  const loadMonthly = useCallback(async (months = 6) => {
    const result = await fetchMonthly(months);
    setMonthly(result);
    return result;
  }, [fetchMonthly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    summary,
    entries,
    monthly,
    topCustomers,
    loading,
    error,
    refresh,
    loadEntries,
    loadMonthly,
  };
}
