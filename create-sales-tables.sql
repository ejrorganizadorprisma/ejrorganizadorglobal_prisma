-- ============================================
-- SALES MODULE TABLES
-- ============================================

-- Enum para status de venda
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SaleStatus') THEN
    CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');
  END IF;
END $$;

-- Enum para método de pagamento
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM (
      'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER',
      'PIX', 'CHECK', 'PROMISSORY', 'BOLETO', 'OTHER'
    );
  END IF;
END $$;

-- Enum para status de pagamento
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
  END IF;
END $$;

-- Tabela de vendas (sales)
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  sale_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  quote_id TEXT REFERENCES quotes(id),
  status "SaleStatus" DEFAULT 'PENDING',
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  total_paid INTEGER NOT NULL DEFAULT 0,
  total_pending INTEGER NOT NULL DEFAULT 0,
  installments INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  internal_notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens de venda (sale_items)
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('PRODUCT', 'SERVICE')),
  product_id TEXT REFERENCES products(id),
  service_name TEXT,
  service_description TEXT,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pagamentos de venda (sale_payments)
CREATE TABLE IF NOT EXISTS sale_payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  payment_method "PaymentMethod" NOT NULL,
  amount INTEGER NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  status "PaymentStatus" DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS sales_customer_id_idx ON sales(customer_id);
CREATE INDEX IF NOT EXISTS sales_quote_id_idx ON sales(quote_id);
CREATE INDEX IF NOT EXISTS sales_status_idx ON sales(status);
CREATE INDEX IF NOT EXISTS sales_sale_date_idx ON sales(sale_date);
CREATE INDEX IF NOT EXISTS sales_created_by_idx ON sales(created_by);

CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS sale_items_product_id_idx ON sale_items(product_id);

CREATE INDEX IF NOT EXISTS sale_payments_sale_id_idx ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS sale_payments_status_idx ON sale_payments(status);
CREATE INDEX IF NOT EXISTS sale_payments_due_date_idx ON sale_payments(due_date);

COMMENT ON TABLE sales IS 'Vendas realizadas';
COMMENT ON TABLE sale_items IS 'Itens de cada venda';
COMMENT ON TABLE sale_payments IS 'Pagamentos/parcelas de vendas';
