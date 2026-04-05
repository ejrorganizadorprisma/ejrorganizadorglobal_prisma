import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/authStore';
import NetInfo from '@react-native-community/netinfo';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  salePrice: number;
  currentStock: number;
  unit: string;
  imageUrls?: string[];
}

export function useProducts(search?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  const loadFromDb = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string; data: string }>(
      'SELECT id, data FROM products ORDER BY rowid DESC'
    );
    let items = rows.map(r => JSON.parse(r.data) as Product);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s));
    }
    setProducts(items);
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected && token) {
      try {
        const result = await apiRequest('/products?limit=1000', { token });
        if (result.success && result.data) {
          const db = await getDatabase();
          const list = Array.isArray(result.data) ? result.data : [];
          for (const p of list) {
            await db.runAsync(
              "INSERT OR REPLACE INTO products (id, data, updated_at) VALUES (?, ?, datetime('now'))",
              [p.id, JSON.stringify(p)]
            );
          }
        }
      } catch (e) { /* offline */ }
    }
    await loadFromDb();
  }, [token, loadFromDb]);

  useEffect(() => { refresh(); }, [search]);

  return { products, loading, refresh };
}
