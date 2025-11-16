-- ============================================
-- DROP ALL TABLES (Use with caution!)
-- ============================================
-- Execute this ONLY if you want to start fresh
-- This will DELETE ALL DATA!
-- ============================================

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_product_stock CASCADE;
DROP FUNCTION IF EXISTS get_inventory_summary CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Drop types
DROP TYPE IF EXISTS "QuoteStatus" CASCADE;
DROP TYPE IF EXISTS "CustomerType" CASCADE;
DROP TYPE IF EXISTS "ProductStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
