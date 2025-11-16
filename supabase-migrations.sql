-- ==============================================
-- EJR Organizador - Database Migrations
-- Missing Tables and Functions
-- ==============================================

-- ==============================================
-- NOTIFICATIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('LOW_STOCK', 'QUOTE_PENDING', 'SALE_COMPLETED', 'INFO')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ==============================================
-- SUPPLIERS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  document VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  postal_code VARCHAR(10),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searches
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_document ON suppliers(document);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

-- ==============================================
-- INVENTORY MOVEMENTS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'SALE', 'PURCHASE', 'RETURN')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL DEFAULT 0,
  new_stock INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  reference_id UUID, -- Can reference a sale, purchase, or quote
  reference_type VARCHAR(50), -- 'SALE', 'PURCHASE', 'QUOTE', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON inventory_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_id, reference_type);

-- ==============================================
-- RPC FUNCTIONS
-- ==============================================

-- Function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_type VARCHAR(20) DEFAULT 'ADJUSTMENT',
  p_reason TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_product_name VARCHAR(255);
  v_minimum_stock INTEGER;
  v_movement_id UUID;
BEGIN
  -- Get current stock and product info
  SELECT current_stock, name, minimum_stock
  INTO v_current_stock, v_product_name, v_minimum_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE; -- Lock the row to prevent race conditions

  -- Check if product exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Calculate new stock
  v_new_stock := v_current_stock + p_quantity;

  -- Prevent negative stock
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_current_stock, -p_quantity;
  END IF;

  -- Update product stock
  UPDATE products
  SET
    current_stock = v_new_stock,
    updated_at = NOW()
  WHERE id = p_product_id;

  -- Create inventory movement record
  INSERT INTO inventory_movements (
    product_id,
    user_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    reference_id,
    reference_type
  ) VALUES (
    p_product_id,
    p_user_id,
    p_type,
    p_quantity,
    v_current_stock,
    v_new_stock,
    p_reason,
    p_reference_id,
    p_reference_type
  )
  RETURNING id INTO v_movement_id;

  -- Create low stock notification if needed
  IF v_new_stock <= v_minimum_stock AND p_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message
    ) VALUES (
      p_user_id,
      'LOW_STOCK',
      'Estoque Baixo',
      format('O produto "%s" está com estoque baixo: %s unidades (mínimo: %s)',
             v_product_name, v_new_stock, v_minimum_stock)
    );
  END IF;

  -- Return success response
  RETURN json_build_object(
    'success', TRUE,
    'movement_id', v_movement_id,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock,
    'product_name', v_product_name
  );
END;
$$;

-- Function to get inventory summary
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_products', COUNT(*),
    'total_stock_value', COALESCE(SUM(current_stock * cost_price), 0),
    'low_stock_count', COUNT(*) FILTER (WHERE current_stock <= minimum_stock),
    'out_of_stock_count', COUNT(*) FILTER (WHERE current_stock = 0),
    'active_products', COUNT(*) FILTER (WHERE status = 'ACTIVE')
  )
  INTO v_result
  FROM products;

  RETURN v_result;
END;
$$;

-- ==============================================
-- TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for suppliers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Suppliers policies (all authenticated users can view, only certain roles can modify)
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON suppliers;
CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authorized users can manage suppliers" ON suppliers;
CREATE POLICY "Authorized users can manage suppliers"
  ON suppliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('OWNER', 'DIRECTOR', 'MANAGER')
    )
  );

-- Inventory movements policies
DROP POLICY IF EXISTS "Authenticated users can view inventory movements" ON inventory_movements;
CREATE POLICY "Authenticated users can view inventory movements"
  ON inventory_movements FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authorized users can create inventory movements" ON inventory_movements;
CREATE POLICY "Authorized users can create inventory movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('OWNER', 'DIRECTOR', 'MANAGER', 'SALESPERSON')
    )
  );

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

-- Grant usage on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT ON suppliers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON suppliers TO authenticated;
GRANT SELECT, INSERT ON inventory_movements TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION update_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_summary TO authenticated;

-- ==============================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ==============================================

-- Insert a test supplier (commented out by default)
-- INSERT INTO suppliers (name, document, email, phone, status) VALUES
-- ('Fornecedor Teste', '12345678000190', 'teste@fornecedor.com', '(11) 98765-4321', 'ACTIVE');

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check if tables were created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('notifications', 'suppliers', 'inventory_movements');

-- Check if functions were created
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('update_product_stock', 'get_inventory_summary');
