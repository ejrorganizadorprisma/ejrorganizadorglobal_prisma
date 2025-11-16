-- ============================================
-- RUN ALL MIGRATIONS
-- ============================================
-- Este arquivo executa TODOS os scripts em ordem
-- Execute APENAS este arquivo no Supabase SQL Editor
-- ============================================

-- 1. Create ENUM types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('OWNER', 'DIRECTOR', 'MANAGER', 'SALESPERSON', 'STOCK', 'TECHNICIAN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
        CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerType') THEN
        CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteStatus') THEN
        CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED');
    END IF;
END $$;

-- 2. Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allowed_hours" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users"("is_active");

-- 3. Create products table
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "manufacturer" TEXT,
    "cost_price" INTEGER NOT NULL,
    "sale_price" INTEGER NOT NULL,
    "technical_description" TEXT,
    "commercial_description" TEXT,
    "warranty_months" INTEGER NOT NULL DEFAULT 0,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "minimum_stock" INTEGER NOT NULL DEFAULT 5,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "products_code_key" ON "products"("code");
CREATE INDEX IF NOT EXISTS "products_code_idx" ON "products"("code");
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products"("category");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status");
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products"("name");

-- 4. Create customers table
CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "customers_document_key" ON "customers"("document");
CREATE INDEX IF NOT EXISTS "customers_document_idx" ON "customers"("document");
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers"("email");
CREATE INDEX IF NOT EXISTS "customers_name_idx" ON "customers"("name");

-- 5. Create quotes tables
CREATE TABLE IF NOT EXISTS "quotes" (
    "id" TEXT NOT NULL,
    "quote_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "responsible_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_quote_number_key" ON "quotes"("quote_number");
CREATE INDEX IF NOT EXISTS "quotes_customer_id_idx" ON "quotes"("customer_id");
CREATE INDEX IF NOT EXISTS "quotes_quote_number_idx" ON "quotes"("quote_number");
CREATE INDEX IF NOT EXISTS "quotes_status_idx" ON "quotes"("status");
CREATE INDEX IF NOT EXISTS "quotes_responsible_user_id_idx" ON "quotes"("responsible_user_id");
CREATE INDEX IF NOT EXISTS "quote_items_quote_id_idx" ON "quote_items"("quote_id");
CREATE INDEX IF NOT EXISTS "quote_items_product_id_idx" ON "quote_items"("product_id");

-- 6. Create suppliers table
CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "document" VARCHAR(20) NOT NULL,
  "email" VARCHAR(255),
  "phone" VARCHAR(20),
  "address" TEXT,
  "city" VARCHAR(100),
  "state" VARCHAR(2),
  "postal_code" VARCHAR(10),
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_document_key" ON "suppliers"("document");
CREATE INDEX IF NOT EXISTS "suppliers_name_idx" ON "suppliers"("name");
CREATE INDEX IF NOT EXISTS "suppliers_document_idx" ON "suppliers"("document");
CREATE INDEX IF NOT EXISTS "suppliers_status_idx" ON "suppliers"("status");

-- 7. Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL CHECK (type IN ('LOW_STOCK', 'QUOTE_PENDING', 'SALE_COMPLETED', 'INFO')),
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- 8. Create inventory_movements table
CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'SALE', 'PURCHASE', 'RETURN')),
  "quantity" INTEGER NOT NULL,
  "previous_stock" INTEGER NOT NULL DEFAULT 0,
  "new_stock" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "reference_id" TEXT,
  "reference_type" VARCHAR(50),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inventory_movements_product_id_idx" ON "inventory_movements"("product_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_user_id_idx" ON "inventory_movements"("user_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_type_idx" ON "inventory_movements"("type");
CREATE INDEX IF NOT EXISTS "inventory_movements_created_at_idx" ON "inventory_movements"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "inventory_movements_reference_idx" ON "inventory_movements"("reference_id", "reference_type");

-- 9. Add foreign keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_customer_id_fkey') THEN
        ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_responsible_user_id_fkey') THEN
        ALTER TABLE "quotes" ADD CONSTRAINT "quotes_responsible_user_id_fkey"
            FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quote_items_quote_id_fkey') THEN
        ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey"
            FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quote_items_product_id_fkey') THEN
        ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_product_id_fkey') THEN
        ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_user_id_fkey') THEN
        ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 10. Create functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id TEXT, p_quantity INTEGER, p_user_id TEXT DEFAULT NULL,
  p_type VARCHAR(20) DEFAULT 'ADJUSTMENT', p_reason TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL, p_reference_type VARCHAR(50) DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE v_current_stock INTEGER; v_new_stock INTEGER; v_product_name VARCHAR(255); v_minimum_stock INTEGER; v_movement_id TEXT;
BEGIN
  SELECT current_stock, name, minimum_stock INTO v_current_stock, v_product_name, v_minimum_stock FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found: %', p_product_id; END IF;
  v_new_stock := v_current_stock + p_quantity;
  IF v_new_stock < 0 THEN RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_current_stock, -p_quantity; END IF;
  UPDATE products SET current_stock = v_new_stock, updated_at = NOW() WHERE id = p_product_id;
  INSERT INTO inventory_movements (id, product_id, user_id, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type)
  VALUES (gen_random_uuid()::text, p_product_id, p_user_id, p_type, p_quantity, v_current_stock, v_new_stock, p_reason, p_reference_id, p_reference_type)
  RETURNING id INTO v_movement_id;
  IF v_new_stock <= v_minimum_stock AND p_user_id IS NOT NULL THEN
    INSERT INTO notifications (id, user_id, type, title, message)
    VALUES (gen_random_uuid()::text, p_user_id, 'LOW_STOCK', 'Estoque Baixo',
            format('O produto "%s" está com estoque baixo: %s unidades (mínimo: %s)', v_product_name, v_new_stock, v_minimum_stock));
  END IF;
  RETURN json_build_object('success', TRUE, 'movement_id', v_movement_id, 'previous_stock', v_current_stock, 'new_stock', v_new_stock, 'product_name', v_product_name);
END;
$$;

CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_products', COUNT(*), 'total_stock_value', COALESCE(SUM(current_stock * cost_price), 0),
    'low_stock_count', COUNT(*) FILTER (WHERE current_stock <= minimum_stock),
    'out_of_stock_count', COUNT(*) FILTER (WHERE current_stock = 0),
    'active_products', COUNT(*) FILTER (WHERE status = 'ACTIVE')
  ) INTO v_result FROM products;
  RETURN v_result;
END;
$$;

-- 11. Create triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON "products";
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_customers_updated_at ON "customers";
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON "customers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_quotes_updated_at ON "quotes";
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON "quotes" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_notifications_updated_at ON "notifications";
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON "notifications" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON "suppliers";
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON "suppliers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Enable RLS
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quote_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own data" ON "users";
CREATE POLICY "Users can view their own data" ON "users" FOR SELECT USING (auth.uid()::text = id);
DROP POLICY IF EXISTS "Service role can manage users" ON "users";
CREATE POLICY "Service role can manage users" ON "users" FOR ALL USING (true);
DROP POLICY IF EXISTS "Anyone can view active products" ON "products";
CREATE POLICY "Anyone can view active products" ON "products" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role can manage products" ON "products";
CREATE POLICY "Service role can manage products" ON "products" FOR ALL USING (true);
DROP POLICY IF EXISTS "Authenticated users can view customers" ON "customers";
CREATE POLICY "Authenticated users can view customers" ON "customers" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role can manage customers" ON "customers";
CREATE POLICY "Service role can manage customers" ON "customers" FOR ALL USING (true);
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON "quotes";
CREATE POLICY "Authenticated users can view quotes" ON "quotes" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role can manage quotes" ON "quotes";
CREATE POLICY "Service role can manage quotes" ON "quotes" FOR ALL USING (true);
DROP POLICY IF EXISTS "Authenticated users can view quote items" ON "quote_items";
CREATE POLICY "Authenticated users can view quote items" ON "quote_items" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role can manage quote items" ON "quote_items";
CREATE POLICY "Service role can manage quote items" ON "quote_items" FOR ALL USING (true);
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON "suppliers";
CREATE POLICY "Authenticated users can view suppliers" ON "suppliers" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role can manage suppliers" ON "suppliers";
CREATE POLICY "Service role can manage suppliers" ON "suppliers" FOR ALL USING (true);
DROP POLICY IF EXISTS "Users can view their own notifications" ON "notifications";
CREATE POLICY "Users can view their own notifications" ON "notifications" FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON "notifications";
CREATE POLICY "Users can update their own notifications" ON "notifications" FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Service role can manage notifications" ON "notifications";
CREATE POLICY "Service role can manage notifications" ON "notifications" FOR ALL USING (true);
DROP POLICY IF EXISTS "Authenticated users can view inventory movements" ON "inventory_movements";
CREATE POLICY "Authenticated users can view inventory movements" ON "inventory_movements" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role can manage inventory movements" ON "inventory_movements";
CREATE POLICY "Service role can manage inventory movements" ON "inventory_movements" FOR ALL USING (true);

-- 14. Grant permissions
GRANT EXECUTE ON FUNCTION update_product_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_inventory_summary TO authenticated, service_role;

-- 15. Seed data
INSERT INTO "users" ("id", "email", "password_hash", "name", "role", "is_active", "updated_at")
VALUES ('mock-user-id', 'admin@ejr.com', '$2a$10$EdOY.89C6aZNgEbZPf6NBOjQJL2ppwPk3ZuRtDgXhHGDwTbxCx.Da', 'Administrador', 'OWNER', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "products" ("id", "code", "name", "category", "cost_price", "sale_price", "current_stock", "minimum_stock", "status", "updated_at")
VALUES
  ('prod-001', 'PROD-001', 'Produto Exemplo 1', 'Eletrônicos', 10000, 15000, 50, 10, 'ACTIVE', CURRENT_TIMESTAMP),
  ('prod-002', 'PROD-002', 'Produto Exemplo 2', 'Informática', 20000, 30000, 30, 5, 'ACTIVE', CURRENT_TIMESTAMP),
  ('prod-003', 'PROD-003', 'Produto Exemplo 3', 'Acessórios', 5000, 8000, 100, 20, 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "customers" ("id", "type", "name", "document", "email", "phone", "updated_at")
VALUES
  ('cust-001', 'INDIVIDUAL', 'Cliente Exemplo 1', '123.456.789-00', 'cliente1@example.com', '(11) 98765-4321', CURRENT_TIMESTAMP),
  ('cust-002', 'BUSINESS', 'Empresa Exemplo LTDA', '12.345.678/0001-90', 'contato@empresaexemplo.com', '(11) 3456-7890', CURRENT_TIMESTAMP)
ON CONFLICT ("document") DO NOTHING;

INSERT INTO "suppliers" ("id", "name", "document", "email", "phone", "status")
VALUES ('supp-001', 'Fornecedor Exemplo', '98.765.432/0001-10', 'vendas@fornecedor.com', '(11) 2345-6789', 'ACTIVE')
ON CONFLICT ("document") DO NOTHING;
