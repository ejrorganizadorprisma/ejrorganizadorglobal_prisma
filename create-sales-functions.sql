-- ============================================
-- SALES MODULE RPC FUNCTIONS
-- ============================================

-- Função para obter os top clientes por volume de vendas
CREATE OR REPLACE FUNCTION get_top_customers(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  customer_id TEXT,
  customer_name TEXT,
  total_revenue BIGINT,
  sales_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.customer_id,
    c.name AS customer_name,
    SUM(s.total)::BIGINT AS total_revenue,
    COUNT(s.id)::BIGINT AS sales_count
  FROM sales s
  INNER JOIN customers c ON c.id = s.customer_id
  WHERE
    (p_start_date IS NULL OR s.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR s.sale_date <= p_end_date)
    AND s.status != 'CANCELLED'
  GROUP BY s.customer_id, c.name
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_top_customers IS 'Retorna os top clientes por volume de vendas em um período';
