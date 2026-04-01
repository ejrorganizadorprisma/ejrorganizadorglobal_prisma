-- Triggers de updated_at para tabelas de vendas
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_payments_updated_at
  BEFORE UPDATE ON sale_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
