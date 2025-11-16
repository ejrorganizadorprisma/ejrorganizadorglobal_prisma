-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for products table
DROP TRIGGER IF EXISTS update_products_updated_at ON "products";
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON "products"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for customers table
DROP TRIGGER IF EXISTS update_customers_updated_at ON "customers";
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON "customers"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for quotes table
DROP TRIGGER IF EXISTS update_quotes_updated_at ON "quotes";
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON "quotes"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for notifications table
DROP TRIGGER IF EXISTS update_notifications_updated_at ON "notifications";
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON "notifications"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for suppliers table
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON "suppliers";
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON "suppliers"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
