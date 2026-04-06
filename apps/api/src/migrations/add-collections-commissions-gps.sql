-- Migration: Collections, Commissions, GPS
-- Date: 2026-04-05
-- Note: All ID columns use TEXT to match existing schema

-- =====================================================
-- 1. Commission Settlements (must be created BEFORE commission_entries)
-- =====================================================
CREATE TABLE IF NOT EXISTS commission_settlements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  settlement_number VARCHAR(20) UNIQUE NOT NULL,
  seller_id TEXT NOT NULL REFERENCES users(id),
  total_amount INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ,
  paid_by TEXT REFERENCES users(id),
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. Collections (Cobranças)
-- =====================================================
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  collection_number VARCHAR(20) UNIQUE NOT NULL,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING_APPROVAL',
  check_number VARCHAR(50),
  check_bank VARCHAR(100),
  check_date DATE,
  photo_urls TEXT[],
  notes TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. Seller Commission Configs
-- =====================================================
CREATE TABLE IF NOT EXISTS seller_commission_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  seller_id TEXT NOT NULL REFERENCES users(id) UNIQUE,
  commission_on_sales DECIMAL(5,2) DEFAULT 0,
  commission_on_collections DECIMAL(5,2) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. Commission Entries
-- =====================================================
CREATE TABLE IF NOT EXISTS commission_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  seller_id TEXT NOT NULL REFERENCES users(id),
  source_type VARCHAR(20) NOT NULL,
  source_id TEXT NOT NULL,
  base_amount INTEGER NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  settlement_id TEXT REFERENCES commission_settlements(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. GPS Events
-- =====================================================
CREATE TABLE IF NOT EXISTS gps_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_type VARCHAR(20) NOT NULL,
  event_id TEXT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. ALTER existing tables for GPS
-- =====================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

-- =====================================================
-- 7. Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_collections_sale_id ON collections(sale_id);
CREATE INDEX IF NOT EXISTS idx_collections_customer_id ON collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_seller_id ON collections(seller_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_commission_entries_seller_id ON commission_entries(seller_id);
CREATE INDEX IF NOT EXISTS idx_commission_entries_status ON commission_entries(status);
CREATE INDEX IF NOT EXISTS idx_commission_entries_settlement_id ON commission_entries(settlement_id);
CREATE INDEX IF NOT EXISTS idx_commission_settlements_seller_id ON commission_settlements(seller_id);
CREATE INDEX IF NOT EXISTS idx_gps_events_user_id ON gps_events(user_id);
CREATE INDEX IF NOT EXISTS idx_gps_events_event_type ON gps_events(event_type);
