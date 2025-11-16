-- ============================================
-- CREATE DATABASE FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id TEXT,
  p_quantity INTEGER,
  p_user_id TEXT DEFAULT NULL,
  p_type VARCHAR(20) DEFAULT 'ADJUSTMENT',
  p_reason TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
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
  v_movement_id TEXT;
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
    id,
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
    gen_random_uuid()::text,
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
      id,
      user_id,
      type,
      title,
      message
    ) VALUES (
      gen_random_uuid()::text,
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

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_product_stock TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_stock TO service_role;
GRANT EXECUTE ON FUNCTION get_inventory_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_summary TO service_role;
