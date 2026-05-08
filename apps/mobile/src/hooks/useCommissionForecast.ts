import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/authStore';

export interface CommissionForecastByOrder {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  forecastedAmount: number;
}

export interface CommissionForecast {
  pendingOrders: number;
  totalSubtotal: number;
  forecastedCommission: number;
  byOrder: CommissionForecastByOrder[];
}

const EMPTY: CommissionForecast = {
  pendingOrders: 0,
  totalSubtotal: 0,
  forecastedCommission: 0,
  byOrder: [],
};

export function useCommissionForecast() {
  const { token } = useAuthStore();
  const [data, setData] = useState<CommissionForecast>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const result = await apiRequest<CommissionForecast>('/commissions/forecast', { token });
      if (result.success && result.data) {
        const d = result.data as any;
        setData({
          pendingOrders: Number(d.pendingOrders) || 0,
          totalSubtotal: Number(d.totalSubtotal) || 0,
          forecastedCommission: Number(d.forecastedCommission) || 0,
          byOrder: Array.isArray(d.byOrder) ? d.byOrder.map((it: any) => ({
            orderId: String(it.orderId),
            orderNumber: String(it.orderNumber || ''),
            subtotal: Number(it.subtotal) || 0,
            forecastedAmount: Number(it.forecastedAmount) || 0,
          })) : [],
        });
      } else {
        setData(EMPTY);
        const msg = result.error?.message;
        if (msg) setError(msg);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar previsao de comissao');
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
