-- Migration: Novo fluxo Pedido → Venda
--
-- Até v1.4.2, vendedores criavam "Vendas" direto. A partir de v1.5.0:
--   1. Vendedor no mobile cria Pedido (sales_orders)
--   2. Admin no web transforma Pedido em Venda (sales.sales_order_id preenchido)
--   3. Venda mantém sales.seller_id apontando ao autor do pedido (diferente do createdBy)
--
-- Esta migration cria as tabelas sales_orders + sales_order_items e adiciona
-- as FKs sales_order_id e seller_id em sales.

-- Status possíveis de um Pedido
DO $$ BEGIN
  CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'CONVERTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabela principal de Pedidos
CREATE TABLE IF NOT EXISTS sales_orders (
  id              TEXT PRIMARY KEY,
  order_number    TEXT NOT NULL UNIQUE,
  customer_id     TEXT NOT NULL REFERENCES customers(id),
  quote_id        TEXT REFERENCES quotes(id),
  seller_id       TEXT NOT NULL REFERENCES users(id),
  status          "SalesOrderStatus" NOT NULL DEFAULT 'PENDING',
  order_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal        INTEGER NOT NULL DEFAULT 0,
  discount        INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  internal_notes  TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  sale_id         TEXT REFERENCES sales(id),
  converted_at    TIMESTAMPTZ,
  converted_by    TEXT REFERENCES users(id),
  cancelled_at    TIMESTAMPTZ,
  cancelled_by    TEXT REFERENCES users(id),
  cancel_reason   TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_seller_id   ON sales_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status      ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date  ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sale_id     ON sales_orders(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_quote_id    ON sales_orders(quote_id) WHERE quote_id IS NOT NULL;

-- Itens do pedido (espelha sale_items)
CREATE TABLE IF NOT EXISTS sales_order_items (
  id              TEXT PRIMARY KEY,
  sales_order_id  TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  item_type       TEXT NOT NULL,              -- 'PRODUCT' | 'SERVICE'
  product_id      TEXT REFERENCES products(id),
  service_name    TEXT,
  quantity        INTEGER NOT NULL,
  unit_price      INTEGER NOT NULL,
  discount        INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id   ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product_id ON sales_order_items(product_id) WHERE product_id IS NOT NULL;

-- Trigger updated_at (usa função padrão do schema)
DROP TRIGGER IF EXISTS update_sales_orders_updated_at ON sales_orders;
CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ligação Venda → Pedido (opcional: venda pode existir sem pedido se admin criar direto)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sales_order_id TEXT REFERENCES sales_orders(id);
CREATE INDEX IF NOT EXISTS idx_sales_sales_order_id ON sales(sales_order_id) WHERE sales_order_id IS NOT NULL;

-- Vendedor responsável pela negociação (pode ser diferente de created_by que é quem faturou).
-- Este é o campo usado para comissão.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON sales(seller_id) WHERE seller_id IS NOT NULL;
