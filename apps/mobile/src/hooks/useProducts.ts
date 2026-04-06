import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db/migrations';

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

  const loadFromDb = useCallback(async () => {
    try {
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
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  const refresh = useCallback(async () => {
    await loadFromDb();
  }, [loadFromDb]);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  return { products, loading, refresh };
}
