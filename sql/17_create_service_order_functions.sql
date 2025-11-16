-- ============================================
-- CREATE SERVICE ORDER FUNCTIONS
-- ============================================

-- Função para gerar número de OS sequencial
CREATE OR REPLACE FUNCTION generate_service_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Conta quantas OS existem no ano atual
  SELECT COUNT(*) + 1
  INTO v_count
  FROM service_orders
  WHERE order_number LIKE 'OS-' || v_year || '-%';

  -- Formata: OS-2025-0001
  v_number := 'OS-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_number;
END;
$$;

-- Função para adicionar peça em OS e baixar do estoque
CREATE OR REPLACE FUNCTION add_service_part(
  p_service_order_id TEXT,
  p_product_id TEXT,
  p_quantity INTEGER,
  p_user_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_service_part_id TEXT;
  v_unit_cost INTEGER;
  v_total_cost INTEGER;
  v_current_stock INTEGER;
  v_parts_cost INTEGER;
  v_order_total INTEGER;
BEGIN
  -- Obtém custo atual do produto
  SELECT cost_price, current_stock
  INTO v_unit_cost, v_current_stock
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado: %', p_product_id;
  END IF;

  -- Verifica estoque
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', v_current_stock, p_quantity;
  END IF;

  v_total_cost := v_unit_cost * p_quantity;

  -- Cria registro de peça usada
  v_service_part_id := gen_random_uuid()::text;

  INSERT INTO service_parts (
    id, service_order_id, product_id, quantity, unit_cost, total_cost
  ) VALUES (
    v_service_part_id, p_service_order_id, p_product_id, p_quantity, v_unit_cost, v_total_cost
  );

  -- Baixa do estoque
  UPDATE products
  SET
    current_stock = current_stock - p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id;

  -- Cria movimentação de estoque
  INSERT INTO inventory_movements (
    id, product_id, user_id, type, quantity, previous_stock, new_stock,
    reason, reference_id, reference_type
  ) VALUES (
    gen_random_uuid()::text,
    p_product_id,
    p_user_id,
    'SERVICE',
    -p_quantity,
    v_current_stock,
    v_current_stock - p_quantity,
    'Peça usada em ordem de serviço',
    p_service_order_id,
    'SERVICE_ORDER'
  );

  -- Atualiza custo de peças na OS
  SELECT COALESCE(SUM(total_cost), 0)
  INTO v_parts_cost
  FROM service_parts
  WHERE service_order_id = p_service_order_id;

  -- Atualiza OS
  UPDATE service_orders
  SET
    parts_cost = v_parts_cost,
    total_cost = labor_cost + v_parts_cost,
    updated_at = NOW()
  WHERE id = p_service_order_id
  RETURNING total_cost INTO v_order_total;

  RETURN json_build_object(
    'success', TRUE,
    'service_part_id', v_service_part_id,
    'parts_cost', v_parts_cost,
    'order_total', v_order_total
  );
END;
$$;

-- Função para completar OS
CREATE OR REPLACE FUNCTION complete_service_order(
  p_service_order_id TEXT,
  p_service_performed TEXT DEFAULT NULL,
  p_completion_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_number TEXT;
  v_customer_id TEXT;
BEGIN
  -- Atualiza OS
  UPDATE service_orders
  SET
    status = 'COMPLETED',
    service_performed = COALESCE(p_service_performed, service_performed),
    completion_date = p_completion_date,
    updated_at = NOW()
  WHERE id = p_service_order_id
  RETURNING order_number, customer_id INTO v_order_number, v_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada: %', p_service_order_id;
  END IF;

  -- Cria notificação
  INSERT INTO notifications (
    id, user_id, type, title, message
  ) VALUES (
    gen_random_uuid()::text,
    v_customer_id,
    'INFO',
    'Ordem de Serviço Concluída',
    format('A ordem de serviço %s foi concluída e está pronta para retirada.', v_order_number)
  );

  RETURN json_build_object(
    'success', TRUE,
    'order_number', v_order_number,
    'status', 'COMPLETED'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_service_order_number TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_service_part TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION complete_service_order TO authenticated, service_role;
