-- Criar tabela de histórico de ajustes de estoque
CREATE TABLE IF NOT EXISTS stock_adjustment_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  old_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  quantity_changed INTEGER NOT NULL,
  operation TEXT NOT NULL, -- 'add' ou 'subtract'
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_history_product_id ON stock_adjustment_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_history_created_at ON stock_adjustment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_history_user_id ON stock_adjustment_history(user_id);
