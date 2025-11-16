-- ============================================
-- CREATE ENUM TYPES
-- ============================================
-- Safe to run multiple times
-- ============================================

-- UserRole enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('OWNER', 'DIRECTOR', 'MANAGER', 'SALESPERSON', 'STOCK', 'TECHNICIAN');
    END IF;
END $$;

-- ProductStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
        CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
    END IF;
END $$;

-- CustomerType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerType') THEN
        CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');
    END IF;
END $$;

-- QuoteStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteStatus') THEN
        CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED');
    END IF;
END $$;
