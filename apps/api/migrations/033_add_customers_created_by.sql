ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
UPDATE customers SET created_by = (SELECT id FROM users WHERE role = 'OWNER' LIMIT 1) WHERE created_by IS NULL;
