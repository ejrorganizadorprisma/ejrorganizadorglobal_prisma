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
