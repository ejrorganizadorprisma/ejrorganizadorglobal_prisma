-- Migration 024: Create Purchase Budgets Module
-- Description: Tables for purchase budgets, items, quotes, approval delegations
-- Also adapts goods_receipts to reference purchase_budget_id

-- =============================================
-- 1. Purchase Budgets (main table)
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_budgets (
  id TEXT PRIMARY KEY,
  budget_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  justification TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  department TEXT,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'PURCHASED', 'RECEIVED', 'CANCELLED')),
  total_amount INTEGER NOT NULL DEFAULT 0,

  -- Aprovação
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP(3),
  rejection_reason TEXT,

  -- Compra
  purchased_by TEXT REFERENCES users(id),
  purchased_at TIMESTAMP(3),
  invoice_number TEXT,
  final_amount INTEGER,

  -- Auditoria
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_budgets_status ON purchase_budgets(status);
CREATE INDEX IF NOT EXISTS idx_purchase_budgets_supplier ON purchase_budgets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_budgets_created_by ON purchase_budgets(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_budgets_number ON purchase_budgets(budget_number);
CREATE INDEX IF NOT EXISTS idx_purchase_budgets_priority ON purchase_budgets(priority);

CREATE TRIGGER update_purchase_budgets_updated_at
  BEFORE UPDATE ON purchase_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. Purchase Budget Items
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_budget_items (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES purchase_budgets(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'UNIT',
  notes TEXT,
  selected_quote_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pb_items_budget ON purchase_budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_pb_items_product ON purchase_budget_items(product_id);

-- =============================================
-- 3. Purchase Budget Quotes (cotações por item)
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_budget_quotes (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES purchase_budget_items(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  unit_price INTEGER NOT NULL,
  lead_time_days INTEGER,
  payment_terms TEXT,
  validity_date DATE,
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pb_quotes_item ON purchase_budget_quotes(item_id);
CREATE INDEX IF NOT EXISTS idx_pb_quotes_supplier ON purchase_budget_quotes(supplier_id);

-- =============================================
-- 4. Approval Delegations
-- =============================================
CREATE TABLE IF NOT EXISTS approval_delegations (
  id TEXT PRIMARY KEY,
  delegated_by TEXT NOT NULL REFERENCES users(id),
  delegated_to TEXT NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delegations_to ON approval_delegations(delegated_to);
CREATE INDEX IF NOT EXISTS idx_delegations_active ON approval_delegations(is_active, start_date, end_date);

-- =============================================
-- 5. Adapt Goods Receipts
-- =============================================
ALTER TABLE goods_receipts
ADD COLUMN IF NOT EXISTS purchase_budget_id TEXT REFERENCES purchase_budgets(id);

CREATE INDEX IF NOT EXISTS idx_gr_budget ON goods_receipts(purchase_budget_id);

-- =============================================
-- 6. Budget Number Generator
-- =============================================
CREATE OR REPLACE FUNCTION generate_budget_number()
RETURNS TEXT AS $$
DECLARE
  seq_num INTEGER;
  year_month TEXT;
  budget_num TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYMM');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(budget_number FROM 10) AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM purchase_budgets
  WHERE budget_number LIKE 'ORC-' || year_month || '-%';

  budget_num := 'ORC-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN budget_num;
END;
$$ LANGUAGE plpgsql;
