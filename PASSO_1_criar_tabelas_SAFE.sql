-- ============================================
-- PASSO 1: CRIAR TABELAS (SAFE VERSION)
-- ============================================
-- This version handles existing database objects gracefully
-- Execute este SQL no SQL Editor do Supabase
-- URL: https://supabase.com/dashboard/project/pqufymtbzrhzjfowaqgt/sql/new
-- ============================================

-- Criar ENUMs (com verificação de existência)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('OWNER', 'DIRECTOR', 'MANAGER', 'SALESPERSON', 'STOCK', 'TECHNICIAN');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
        CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerType') THEN
        CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteStatus') THEN
        CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED');
    END IF;
END $$;

-- Tabela: Users (se não existir)
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allowed_hours" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Tabela: Products (se não existir)
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- Tabela: Customers (se não existir)
CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- Tabela: Quotes (se não existir)
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- Tabela: Quote Items (se não existir)
CREATE TABLE IF NOT EXISTS "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- Índices (CREATE INDEX IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "products_code_key" ON "products"("code");
CREATE INDEX IF NOT EXISTS "products_code_idx" ON "products"("code");
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products"("category");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_document_key" ON "customers"("document");
CREATE INDEX IF NOT EXISTS "customers_document_idx" ON "customers"("document");
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_quote_number_key" ON "quotes"("quote_number");
CREATE INDEX IF NOT EXISTS "quotes_customer_id_idx" ON "quotes"("customer_id");
CREATE INDEX IF NOT EXISTS "quotes_quote_number_idx" ON "quotes"("quote_number");
CREATE INDEX IF NOT EXISTS "quotes_status_idx" ON "quotes"("status");

-- Chaves Estrangeiras (adicionar apenas se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quotes_customer_id_fkey'
    ) THEN
        ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quotes_responsible_user_id_fkey'
    ) THEN
        ALTER TABLE "quotes" ADD CONSTRAINT "quotes_responsible_user_id_fkey"
            FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quote_items_quote_id_fkey'
    ) THEN
        ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey"
            FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quote_items_product_id_fkey'
    ) THEN
        ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
