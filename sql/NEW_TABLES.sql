-- ============================================
-- CREATE PRODUCT_PARTS TABLE (BOM - Bill of Materials)
-- ============================================
-- Relacionamento N:N entre produtos e suas peças componentes

CREATE TABLE IF NOT EXISTS "product_parts" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,  -- produto principal (assembly)
  "part_id" TEXT NOT NULL,     -- peça componente
  "quantity" INTEGER NOT NULL DEFAULT 1,  -- quantidade necessária
  "is_optional" BOOLEAN NOT NULL DEFAULT FALSE,  -- peça opcional?
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "product_parts_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_parts_product_id_fkey'
    ) THEN
        ALTER TABLE "product_parts" ADD CONSTRAINT "product_parts_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_parts_part_id_fkey'
    ) THEN
        ALTER TABLE "product_parts" ADD CONSTRAINT "product_parts_part_id_fkey"
            FOREIGN KEY ("part_id") REFERENCES "products"("id") ON DELETE RESTRICT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "product_parts_product_id_idx" ON "product_parts"("product_id");
CREATE INDEX IF NOT EXISTS "product_parts_part_id_idx" ON "product_parts"("part_id");
CREATE UNIQUE INDEX IF NOT EXISTS "product_parts_unique_idx" ON "product_parts"("product_id", "part_id");

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_product_parts_updated_at ON "product_parts";
CREATE TRIGGER update_product_parts_updated_at
  BEFORE UPDATE ON "product_parts"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE "product_parts" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view product parts" ON "product_parts";
CREATE POLICY "Authenticated users can view product parts"
  ON "product_parts" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage product parts" ON "product_parts";
CREATE POLICY "Service role can manage product parts"
  ON "product_parts" FOR ALL
  USING (true);

-- Grant permissions
GRANT ALL ON "product_parts" TO authenticated;
GRANT ALL ON "product_parts" TO service_role;
-- ============================================
-- ALTER PRODUCTS TABLE - Add BOM fields
-- ============================================
-- Adiciona campos para controle de produtos compostos

-- Adicionar coluna is_assembly (produto montado a partir de peças)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'is_assembly'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "is_assembly" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar coluna is_part (é uma peça componente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'is_part'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "is_part" BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar coluna assembly_cost (custo de montagem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'assembly_cost'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "assembly_cost" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Adicionar índices
CREATE INDEX IF NOT EXISTS "products_is_assembly_idx" ON "products"("is_assembly");
CREATE INDEX IF NOT EXISTS "products_is_part_idx" ON "products"("is_part");
-- ============================================
-- CREATE SERVICE_ORDERS TABLE (Ordens de Serviço)
-- ============================================

-- Criar ENUM para status de OS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceOrderStatus') THEN
        CREATE TYPE "ServiceOrderStatus" AS ENUM (
            'OPEN',              -- Aberta
            'AWAITING_PARTS',    -- Aguardando peças
            'IN_SERVICE',        -- Em manutenção
            'AWAITING_APPROVAL', -- Aguardando aprovação do cliente
            'COMPLETED',         -- Concluída
            'CANCELLED'          -- Cancelada
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "service_orders" (
  "id" TEXT NOT NULL,
  "order_number" TEXT NOT NULL UNIQUE,  -- OS-2025-0001

  -- Relacionamentos
  "customer_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "technician_id" TEXT,

  -- Status
  "status" "ServiceOrderStatus" NOT NULL DEFAULT 'OPEN',

  -- Classificação
  "is_warranty" BOOLEAN NOT NULL DEFAULT FALSE,

  -- Descrições
  "issue_description" TEXT,      -- Problema relatado pelo cliente
  "diagnosis" TEXT,               -- Diagnóstico técnico
  "service_performed" TEXT,       -- Serviço realizado
  "customer_notes" TEXT,          -- Observações do cliente
  "internal_notes" TEXT,          -- Notas internas

  -- Custos (em centavos)
  "labor_cost" INTEGER NOT NULL DEFAULT 0,     -- Mão de obra
  "parts_cost" INTEGER NOT NULL DEFAULT 0,     -- Peças
  "total_cost" INTEGER NOT NULL DEFAULT 0,     -- Total

  -- Datas
  "entry_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "estimated_delivery" TIMESTAMPTZ,
  "completion_date" TIMESTAMPTZ,

  -- Anexos
  "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Auditoria
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_customer_id_fkey'
    ) THEN
        ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_product_id_fkey'
    ) THEN
        ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_technician_id_fkey'
    ) THEN
        ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_technician_id_fkey"
            FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "service_orders_order_number_key" ON "service_orders"("order_number");
CREATE INDEX IF NOT EXISTS "service_orders_customer_id_idx" ON "service_orders"("customer_id");
CREATE INDEX IF NOT EXISTS "service_orders_product_id_idx" ON "service_orders"("product_id");
CREATE INDEX IF NOT EXISTS "service_orders_technician_id_idx" ON "service_orders"("technician_id");
CREATE INDEX IF NOT EXISTS "service_orders_status_idx" ON "service_orders"("status");
CREATE INDEX IF NOT EXISTS "service_orders_is_warranty_idx" ON "service_orders"("is_warranty");
CREATE INDEX IF NOT EXISTS "service_orders_entry_date_idx" ON "service_orders"("entry_date" DESC);
CREATE INDEX IF NOT EXISTS "service_orders_completion_date_idx" ON "service_orders"("completion_date" DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_service_orders_updated_at ON "service_orders";
CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON "service_orders"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE "service_orders" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view service orders" ON "service_orders";
CREATE POLICY "Authenticated users can view service orders"
  ON "service_orders" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage service orders" ON "service_orders";
CREATE POLICY "Service role can manage service orders"
  ON "service_orders" FOR ALL
  USING (true);

-- Grant permissions
GRANT ALL ON "service_orders" TO authenticated;
GRANT ALL ON "service_orders" TO service_role;
-- ============================================
-- CREATE SERVICE_PARTS TABLE
-- ============================================
-- Peças utilizadas em ordens de serviço

CREATE TABLE IF NOT EXISTS "service_parts" (
  "id" TEXT NOT NULL,
  "service_order_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,  -- peça usada (referencia products)
  "quantity" INTEGER NOT NULL,
  "unit_cost" INTEGER NOT NULL,  -- centavos (custo unitário no momento do uso)
  "total_cost" INTEGER NOT NULL, -- centavos (quantity * unit_cost)
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "service_parts_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_parts_service_order_id_fkey'
    ) THEN
        ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_service_order_id_fkey"
            FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'service_parts_product_id_fkey'
    ) THEN
        ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "service_parts_service_order_id_idx" ON "service_parts"("service_order_id");
CREATE INDEX IF NOT EXISTS "service_parts_product_id_idx" ON "service_parts"("product_id");

-- Enable RLS
ALTER TABLE "service_parts" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view service parts" ON "service_parts";
CREATE POLICY "Authenticated users can view service parts"
  ON "service_parts" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage service parts" ON "service_parts";
CREATE POLICY "Service role can manage service parts"
  ON "service_parts" FOR ALL
  USING (true);

-- Grant permissions
GRANT ALL ON "service_parts" TO authenticated;
GRANT ALL ON "service_parts" TO service_role;
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
