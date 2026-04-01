-- ============================================
-- CREATE BOM (Bill of Materials) FUNCTIONS
-- ============================================

-- Função para obter todas as peças de um produto (explosão de BOM)
CREATE OR REPLACE FUNCTION get_product_bom(p_product_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'part_id', pp.part_id,
      'part_code', p.code,
      'part_name', p.name,
      'quantity', pp.quantity,
      'is_optional', pp.is_optional,
      'is_assembly', p.is_assembly,
      'unit_cost', p.cost_price,
      'total_cost', pp.quantity * p.cost_price,
      'available_stock', p.current_stock
    )
  )
  INTO v_result
  FROM product_parts pp
  JOIN products p ON p.id = pp.part_id
  WHERE pp.product_id = p_product_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Função para calcular custo total de um produto baseado nas peças
CREATE OR REPLACE FUNCTION calculate_product_cost(p_product_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_cost INTEGER;
  v_assembly_cost INTEGER;
BEGIN
  -- Soma o custo de todas as peças
  SELECT COALESCE(SUM(pp.quantity * p.cost_price), 0)
  INTO v_total_cost
  FROM product_parts pp
  JOIN products p ON p.id = pp.part_id
  WHERE pp.product_id = p_product_id;

  -- Adiciona custo de montagem
  SELECT assembly_cost INTO v_assembly_cost
  FROM products
  WHERE id = p_product_id;

  RETURN v_total_cost + COALESCE(v_assembly_cost, 0);
END;
$$;

-- Função para verificar se há peças suficientes para montar produto
CREATE OR REPLACE FUNCTION check_assembly_availability(
  p_product_id TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_can_assemble BOOLEAN := TRUE;
  v_missing_parts JSON;
BEGIN
  -- Verifica cada peça necessária
  SELECT json_agg(
    json_build_object(
      'part_id', pp.part_id,
      'part_name', p.name,
      'required', pp.quantity * p_quantity,
      'available', p.current_stock,
      'missing', GREATEST(0, (pp.quantity * p_quantity) - p.current_stock)
    )
  )
  INTO v_missing_parts
  FROM product_parts pp
  JOIN products p ON p.id = pp.part_id
  WHERE pp.product_id = p_product_id
    AND p.current_stock < (pp.quantity * p_quantity);

  -- Se encontrou peças faltantes, não pode montar
  IF v_missing_parts IS NOT NULL THEN
    v_can_assemble := FALSE;
  END IF;

  RETURN json_build_object(
    'can_assemble', v_can_assemble,
    'missing_parts', COALESCE(v_missing_parts, '[]'::json)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_product_bom TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_product_cost TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_assembly_availability TO authenticated, service_role;
