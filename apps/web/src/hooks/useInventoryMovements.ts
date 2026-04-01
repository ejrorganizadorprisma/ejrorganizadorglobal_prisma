import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface InventoryMovement {
  id: string;
  product_id: string;
  user_id: string | null;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'PURCHASE' | 'RETURN';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
  product: { name: string; code: string } | null;
  user: { name: string; email: string } | null;
}

export function useInventoryMovements(
  productId: string,
  options?: { enabled?: boolean; type?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['inventory-movements', productId, options?.type, options?.limit],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (options?.type) params.type = options.type;
      if (options?.limit) params.limit = String(options.limit);

      const { data } = await api.get<{ success: boolean; data: InventoryMovement[] }>(
        `/inventory-movements/product/${productId}`,
        { params }
      );
      return data.data;
    },
    enabled: options?.enabled !== false && !!productId,
  });
}
