-- ==============================================
-- EJR Organizador - Prevent Negative Stock Migration
-- Adiciona regra para impedir estoque negativo
-- ==============================================

-- 1. Primeiro, corrigir estoques negativos existentes (definir para 0)
UPDATE products
SET current_stock = 0
WHERE current_stock < 0;

-- 2. Adicionar constraint CHECK para impedir estoque negativo
-- Remove a constraint se já existir (para poder recriar)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_non_negative;

-- Adiciona a constraint
ALTER TABLE products ADD CONSTRAINT products_stock_non_negative
CHECK (current_stock >= 0);

-- 3. Criar função que ajusta estoque negativo para 0 automaticamente
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o novo estoque for negativo, ajustar para 0
  IF NEW.current_stock < 0 THEN
    RAISE NOTICE 'Estoque negativo detectado para produto %. Ajustando de % para 0.',
      NEW.name, NEW.current_stock;
    NEW.current_stock := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para ajustar antes de atualizar
DROP TRIGGER IF EXISTS trigger_prevent_negative_stock ON products;

CREATE TRIGGER trigger_prevent_negative_stock
BEFORE UPDATE OF current_stock ON products
FOR EACH ROW
EXECUTE FUNCTION prevent_negative_stock();

-- 5. Criar trigger para ajustar em INSERT também
DROP TRIGGER IF EXISTS trigger_prevent_negative_stock_insert ON products;

CREATE TRIGGER trigger_prevent_negative_stock_insert
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION prevent_negative_stock();
