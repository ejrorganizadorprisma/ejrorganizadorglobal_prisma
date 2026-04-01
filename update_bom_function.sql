-- Update get_product_bom function to include is_assembly field
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
