-- ============================================
-- EJR Organizador - Schema Completo para Supabase
-- Gerado automaticamente do banco local
-- ============================================
-- INSTRUCOES:
-- 1. Abra o Supabase SQL Editor
-- 2. Cole TODO este conteudo e execute
-- 3. Depois execute o supabase-seed.sql
-- ============================================

--
-- PostgreSQL database dump
--

\restrict a0IRjqrzb7ofcKFFl4c7IAum6u60ypz9aI7XCh5rcsX8n08exiAVLJoWcinlTzV

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: CustomerType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerType" AS ENUM (
    'INDIVIDUAL',
    'BUSINESS'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'BANK_TRANSFER',
    'PIX',
    'CHECK',
    'PROMISSORY',
    'BOLETO',
    'OTHER'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DISCONTINUED'
);


--
-- Name: QuoteStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuoteStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'CONVERTED'
);


--
-- Name: SaleStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SaleStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PARTIAL',
    'OVERDUE',
    'CANCELLED'
);


--
-- Name: ServiceOrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ServiceOrderStatus" AS ENUM (
    'OPEN',
    'AWAITING_PARTS',
    'IN_SERVICE',
    'AWAITING_APPROVAL',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'OWNER',
    'DIRECTOR',
    'MANAGER',
    'SALESPERSON',
    'STOCK',
    'TECHNICIAN'
);


--
-- Name: add_finished_goods_to_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_finished_goods_to_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    UPDATE products SET current_stock = current_stock + NEW.quantity_produced WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: calculate_bom_cost_with_scrap(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_bom_cost_with_scrap(p_product_id text, p_version_id text DEFAULT NULL::text) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_total DECIMAL := 0;
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT bi.quantity, bi.scrap_percentage, p.cost_price
    FROM bom_items bi
    JOIN products p ON p.id = bi.component_id
    WHERE bi.product_id = p_product_id
      AND (p_version_id IS NULL OR bi.bom_version_id = p_version_id)
      AND bi.is_optional = FALSE
  LOOP
    v_total := v_total + (v_item.quantity * (1 + (v_item.scrap_percentage / 100)) * v_item.cost_price);
  END LOOP;

  RETURN v_total;
END;
$$;


--
-- Name: calculate_product_cost(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_product_cost(p_product_id text) RETURNS integer
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


--
-- Name: check_assembly_availability(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_assembly_availability(p_product_id text, p_quantity integer DEFAULT 1) RETURNS json
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


--
-- Name: consume_production_materials(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_production_materials() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.quantity_consumed > OLD.quantity_consumed THEN
    UPDATE products SET current_stock = current_stock - (NEW.quantity_consumed - OLD.quantity_consumed) WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: ensure_single_default_document_settings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_document_settings() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset all other defaults
    UPDATE document_settings
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_budget_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_budget_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  seq_num INTEGER;
  year_month TEXT;
  budget_num TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYMM');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(budget_number FROM 10) AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM purchase_budgets
  WHERE budget_number LIKE 'ORC-' || year_month || '-%';

  budget_num := 'ORC-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN budget_num;
END;
$$;


--
-- Name: get_available_stock(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_available_stock(p_product_id text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_current INTEGER;
  v_reserved INTEGER;
BEGIN
  SELECT current_stock, reserved_stock
  INTO v_current, v_reserved
  FROM products
  WHERE id = p_product_id;

  RETURN COALESCE(v_current, 0) - COALESCE(v_reserved, 0);
END;
$$;


--
-- Name: get_inventory_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_inventory_summary() RETURNS json
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: get_product_bom(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_product_bom(p_product_id text) RETURNS json
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


--
-- Name: get_top_customers(timestamp with time zone, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_customers(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10) RETURNS TABLE(customer_id text, customer_name text, total_revenue bigint, sales_count bigint)
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


--
-- Name: reserve_components_for_production(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserve_components_for_production() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'RELEASED' AND OLD.status != 'RELEASED' THEN
    INSERT INTO stock_reservations (product_id, quantity, reserved_for_type, reserved_for_id, reason)
    SELECT pmc.product_id, pmc.quantity_planned, 'PRODUCTION_ORDER', NEW.id, 'Reservado para OP ' || NEW.order_number
    FROM production_material_consumption pmc WHERE pmc.production_order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_po_item_received_qty(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_po_item_received_qty() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE purchase_order_items
  SET quantity_received = quantity_received + NEW.quantity_accepted
  WHERE id = NEW.purchase_order_item_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_product_families_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_families_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_product_stock(text, integer, text, character varying, text, text, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_stock(p_product_id text, p_quantity integer, p_user_id text DEFAULT NULL::text, p_type character varying DEFAULT 'ADJUSTMENT'::character varying, p_reason text DEFAULT NULL::text, p_reference_id text DEFAULT NULL::text, p_reference_type character varying DEFAULT NULL::character varying) RETURNS json
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: update_production_order_quantities(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_production_order_quantities() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE production_orders
  SET
    quantity_produced = (SELECT COALESCE(SUM(quantity_produced), 0) FROM production_reportings WHERE production_order_id = NEW.production_order_id),
    quantity_scrapped = (SELECT COALESCE(SUM(quantity_scrapped), 0) FROM production_reportings WHERE production_order_id = NEW.production_order_id)
  WHERE id = NEW.production_order_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_reserved_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_reserved_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE products
  SET reserved_stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM stock_reservations
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
      AND status = 'ACTIVE'
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_supplier_orders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_supplier_orders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_system_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_system_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: approval_delegations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_delegations (
    id text NOT NULL,
    delegated_by text NOT NULL,
    delegated_to text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    revoked_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assembly_instructions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assembly_instructions (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    product_id text NOT NULL,
    bom_version_id text,
    step_number integer NOT NULL,
    title text NOT NULL,
    description text,
    estimated_time_minutes integer,
    required_tools text,
    safety_notes text,
    image_url text,
    video_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: backup_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename character varying(255) NOT NULL,
    file_path character varying(500),
    file_size bigint DEFAULT 0,
    tables_count integer DEFAULT 0,
    records_count integer DEFAULT 0,
    backup_type character varying(20) DEFAULT 'manual'::character varying,
    status character varying(20) DEFAULT 'completed'::character varying,
    error_message text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT backup_history_backup_type_check CHECK (((backup_type)::text = ANY ((ARRAY['manual'::character varying, 'scheduled'::character varying])::text[]))),
    CONSTRAINT backup_history_status_check CHECK (((status)::text = ANY ((ARRAY['completed'::character varying, 'failed'::character varying, 'in_progress'::character varying])::text[])))
);


--
-- Name: backup_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT false,
    frequency character varying(20) DEFAULT 'daily'::character varying,
    "time" character varying(5) DEFAULT '02:00'::character varying,
    day_of_week integer DEFAULT 1,
    day_of_month integer DEFAULT 1,
    retention_days integer DEFAULT 30,
    max_backups integer DEFAULT 10,
    last_backup_at timestamp with time zone,
    next_backup_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT backup_settings_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 28))),
    CONSTRAINT backup_settings_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT backup_settings_frequency_check CHECK (((frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[])))
);


--
-- Name: bom_alternatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bom_alternatives (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    bom_item_id text NOT NULL,
    alternative_product_id text NOT NULL,
    priority integer DEFAULT 1,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bom_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bom_items (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    product_id text NOT NULL,
    component_id text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit text DEFAULT 'UN'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scrap_percentage numeric(5,2) DEFAULT 0,
    is_optional boolean DEFAULT false,
    notes text,
    "position" integer,
    reference_designator text,
    bom_version_id text,
    CONSTRAINT bom_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT bom_items_scrap_percentage_check CHECK (((scrap_percentage >= (0)::numeric) AND (scrap_percentage <= (100)::numeric)))
);


--
-- Name: bom_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bom_versions (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    product_id text NOT NULL,
    version text NOT NULL,
    description text,
    status text DEFAULT 'DRAFT'::text,
    effective_date timestamp with time zone,
    obsolete_date timestamp with time zone,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    notes text,
    CONSTRAINT bom_versions_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'ARCHIVED'::text])))
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id text NOT NULL,
    type public."CustomerType" NOT NULL,
    name text NOT NULL,
    document text,
    email text,
    phone text,
    address jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ci character varying(20),
    ruc character varying(20),
    allowed_payment_methods text[] DEFAULT ARRAY['CASH'::text],
    credit_max_days integer
);


--
-- Name: document_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_settings (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    profile_name character varying(255) NOT NULL,
    is_default boolean DEFAULT false,
    company_logo text,
    company_name character varying(255),
    footer_text text,
    footer_address text,
    footer_phone character varying(50),
    footer_email character varying(255),
    footer_website character varying(255),
    signature_image text,
    signature_name character varying(255),
    signature_role character varying(100),
    default_quote_validity_days integer DEFAULT 30,
    primary_color character varying(7) DEFAULT '#2563eb'::character varying,
    secondary_color character varying(7) DEFAULT '#1e40af'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by text,
    CONSTRAINT positive_validity_days CHECK ((default_quote_validity_days > 0)),
    CONSTRAINT valid_hex_color_primary CHECK (((primary_color)::text ~* '^#[0-9A-F]{6}$'::text)),
    CONSTRAINT valid_hex_color_secondary CHECK (((secondary_color)::text ~* '^#[0-9A-F]{6}$'::text))
);


--
-- Name: goods_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_items (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    goods_receipt_id text NOT NULL,
    purchase_order_item_id text,
    product_id text NOT NULL,
    quantity_ordered integer,
    quantity_received integer NOT NULL,
    quantity_accepted integer DEFAULT 0,
    quantity_rejected integer DEFAULT 0,
    unit_price integer,
    quality_status text,
    rejection_reason text,
    lot_number text,
    expiry_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    supplier_order_item_id text,
    CONSTRAINT goods_receipt_items_quality_status_check CHECK ((quality_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'QUARANTINE'::text]))),
    CONSTRAINT goods_receipt_items_quantity_received_check CHECK ((quantity_received >= 0))
);


--
-- Name: goods_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipts (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    receipt_number text NOT NULL,
    purchase_order_id text,
    supplier_id text NOT NULL,
    receipt_date timestamp with time zone DEFAULT now(),
    invoice_number text,
    invoice_date timestamp with time zone,
    invoice_amount integer,
    status text DEFAULT 'PENDING'::text,
    quality_check_status text,
    inspected_by text,
    inspected_at timestamp with time zone,
    notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    purchase_budget_id text,
    supplier_order_id text,
    CONSTRAINT goods_receipts_quality_check_status_check CHECK ((quality_check_status = ANY (ARRAY['PENDING'::text, 'PASSED'::text, 'FAILED'::text, 'PARTIAL'::text]))),
    CONSTRAINT goods_receipts_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'INSPECTED'::text, 'APPROVED'::text, 'REJECTED'::text, 'RETURNED'::text])))
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id text NOT NULL,
    product_id text NOT NULL,
    user_id text,
    type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    previous_stock integer DEFAULT 0 NOT NULL,
    new_stock integer DEFAULT 0 NOT NULL,
    reason text,
    reference_id text,
    reference_type character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_movements_type_check CHECK (((type)::text = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUSTMENT'::character varying, 'SALE'::character varying, 'PURCHASE'::character varying, 'RETURN'::character varying])::text[])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['LOW_STOCK'::character varying, 'QUOTE_PENDING'::character varying, 'SALE_COMPLETED'::character varying, 'INFO'::character varying, 'SUCCESS'::character varying, 'WARNING'::character varying])::text[])))
);


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_families (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_parts (
    id text NOT NULL,
    product_id text NOT NULL,
    part_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_suppliers (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    product_id text NOT NULL,
    supplier_id text NOT NULL,
    supplier_sku text,
    unit_price integer NOT NULL,
    minimum_quantity integer DEFAULT 1,
    lead_time_days integer DEFAULT 0,
    is_preferred boolean DEFAULT false,
    last_purchase_price integer,
    last_purchase_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: production_material_consumption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_material_consumption (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    production_order_id text NOT NULL,
    product_id text NOT NULL,
    bom_item_id text,
    quantity_planned integer NOT NULL,
    quantity_consumed integer DEFAULT 0,
    quantity_scrapped integer DEFAULT 0,
    unit_cost integer,
    consumed_by text,
    consumed_at timestamp with time zone,
    lot_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: production_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_operations (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    production_order_id text NOT NULL,
    operation_number integer NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'PENDING'::text,
    estimated_duration_minutes integer,
    actual_duration_minutes integer,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    assigned_to text,
    workstation text,
    required_skills text,
    quality_check_required boolean DEFAULT false,
    quality_status text,
    quality_notes text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT production_operations_quality_status_check CHECK ((quality_status = ANY (ARRAY['PENDING'::text, 'PASSED'::text, 'FAILED'::text, 'WAIVED'::text]))),
    CONSTRAINT production_operations_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'SKIPPED'::text, 'FAILED'::text])))
);


--
-- Name: production_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_orders (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_number text NOT NULL,
    product_id text NOT NULL,
    bom_version_id text,
    quantity_planned integer NOT NULL,
    quantity_produced integer DEFAULT 0,
    quantity_scrapped integer DEFAULT 0,
    quantity_pending integer GENERATED ALWAYS AS (((quantity_planned - quantity_produced) - quantity_scrapped)) STORED,
    status text DEFAULT 'DRAFT'::text,
    priority text DEFAULT 'NORMAL'::text,
    planned_start_date timestamp with time zone,
    planned_end_date timestamp with time zone,
    actual_start_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    due_date timestamp with time zone,
    material_cost integer DEFAULT 0,
    labor_cost integer DEFAULT 0,
    overhead_cost integer DEFAULT 0,
    total_cost integer DEFAULT 0,
    related_quote_id text,
    related_service_order_id text,
    created_by text,
    assigned_to text,
    notes text,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT production_orders_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text]))),
    CONSTRAINT production_orders_quantity_planned_check CHECK ((quantity_planned > 0)),
    CONSTRAINT production_orders_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PLANNED'::text, 'RELEASED'::text, 'IN_PROGRESS'::text, 'PAUSED'::text, 'COMPLETED'::text, 'CANCELLED'::text, 'CLOSED'::text])))
);


--
-- Name: production_quality_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_quality_checks (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    production_order_id text NOT NULL,
    production_operation_id text,
    check_type text,
    check_date timestamp with time zone DEFAULT now(),
    checked_by text,
    quantity_checked integer,
    quantity_passed integer,
    quantity_failed integer,
    defect_rate numeric(5,2),
    defects_found text,
    corrective_actions text,
    status text DEFAULT 'OPEN'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT production_quality_checks_check_type_check CHECK ((check_type = ANY (ARRAY['IN_PROCESS'::text, 'FINAL'::text, 'FIRST_ARTICLE'::text, 'RANDOM'::text]))),
    CONSTRAINT production_quality_checks_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text, 'WAIVED'::text])))
);


--
-- Name: production_reportings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_reportings (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    production_order_id text NOT NULL,
    reporting_date timestamp with time zone DEFAULT now(),
    quantity_produced integer NOT NULL,
    quantity_scrapped integer DEFAULT 0,
    scrap_reason text,
    reported_by text,
    shift text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT production_reportings_quantity_produced_check CHECK ((quantity_produced >= 0))
);


--
-- Name: production_time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_time_logs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    production_order_id text NOT NULL,
    production_operation_id text,
    user_id text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration_minutes integer,
    activity_type text,
    downtime_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT production_time_logs_activity_type_check CHECK ((activity_type = ANY (ARRAY['SETUP'::text, 'PRODUCTION'::text, 'QUALITY_CHECK'::text, 'REWORK'::text, 'DOWNTIME'::text])))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    manufacturer text,
    cost_price integer NOT NULL,
    sale_price integer NOT NULL,
    technical_description text,
    commercial_description text,
    warranty_months integer DEFAULT 0 NOT NULL,
    current_stock integer DEFAULT 0 NOT NULL,
    minimum_stock integer DEFAULT 5 NOT NULL,
    status public."ProductStatus" DEFAULT 'ACTIVE'::public."ProductStatus" NOT NULL,
    image_urls text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reserved_stock integer DEFAULT 0,
    space_id text,
    shelf_id text,
    section_id text,
    family character varying(100),
    product_type character varying(20) DEFAULT 'COMPONENT'::character varying,
    is_assembly boolean DEFAULT false,
    is_part boolean DEFAULT false,
    assembly_cost numeric(15,2) DEFAULT 0,
    version character varying(50),
    warehouse_location character varying(100),
    lead_time_days integer DEFAULT 0,
    minimum_lot_quantity integer DEFAULT 1,
    description text,
    unit character varying(20) DEFAULT 'UNIT'::character varying,
    cost_price_currency character varying(3) DEFAULT 'BRL'::character varying,
    sale_price_currency character varying(3) DEFAULT 'BRL'::character varying,
    wholesale_price_currency character varying(3) DEFAULT 'BRL'::character varying,
    wholesale_price integer DEFAULT 0 NOT NULL,
    factory_code character varying(100),
    warranty_expiration_date date,
    observations text,
    quantity_per_box integer DEFAULT 1,
    CONSTRAINT check_cost_price_currency CHECK (((cost_price_currency)::text = ANY ((ARRAY['BRL'::character varying, 'USD'::character varying, 'PYG'::character varying])::text[]))),
    CONSTRAINT check_sale_price_currency CHECK (((sale_price_currency)::text = ANY ((ARRAY['BRL'::character varying, 'USD'::character varying, 'PYG'::character varying])::text[]))),
    CONSTRAINT check_wholesale_price_currency CHECK (((wholesale_price_currency)::text = ANY ((ARRAY['BRL'::character varying, 'USD'::character varying, 'PYG'::character varying])::text[]))),
    CONSTRAINT products_product_type_check CHECK (((product_type)::text = ANY ((ARRAY['FINAL'::character varying, 'COMPONENT'::character varying])::text[]))),
    CONSTRAINT products_reserved_stock_check CHECK ((reserved_stock >= 0)),
    CONSTRAINT products_unit_check CHECK (((unit)::text = ANY ((ARRAY['UNIT'::character varying, 'METER'::character varying, 'WEIGHT'::character varying, 'LITER'::character varying])::text[])))
);


--
-- Name: purchase_budget_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_budget_items (
    id text NOT NULL,
    budget_id text NOT NULL,
    product_id text,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit text DEFAULT 'UNIT'::text,
    notes text,
    selected_quote_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: purchase_budget_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_budget_quotes (
    id text NOT NULL,
    item_id text NOT NULL,
    supplier_id text NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    lead_time_days integer,
    payment_terms text,
    validity_date date,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: purchase_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_budgets (
    id text NOT NULL,
    budget_number text NOT NULL,
    title text NOT NULL,
    description text,
    justification text,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    department text,
    supplier_id text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    total_amount integer DEFAULT 0 NOT NULL,
    approved_by text,
    approved_at timestamp(3) without time zone,
    rejection_reason text,
    purchased_by text,
    purchased_at timestamp(3) without time zone,
    invoice_number text,
    final_amount integer,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency text DEFAULT 'BRL'::text,
    exchange_rate_1 numeric(18,6) DEFAULT 0,
    exchange_rate_2 numeric(18,6) DEFAULT 0,
    payment_terms text,
    lead_time_days integer,
    additional_costs jsonb DEFAULT '[]'::jsonb,
    payment_installments jsonb DEFAULT '[]'::jsonb,
    payment_method text,
    manufacturers jsonb DEFAULT '[]'::jsonb,
    exchange_rate_3 numeric(15,6) DEFAULT 0,
    CONSTRAINT purchase_budgets_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text]))),
    CONSTRAINT purchase_budgets_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'ORDERED'::text, 'PURCHASED'::text, 'RECEIVED'::text, 'CANCELLED'::text])))
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    purchase_order_id text NOT NULL,
    product_id text NOT NULL,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0,
    discount_percentage numeric(5,2) DEFAULT 0,
    total_price integer NOT NULL,
    quantity_received integer DEFAULT 0,
    quantity_pending integer GENERATED ALWAYS AS ((quantity - quantity_received)) STORED,
    expected_delivery_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    supplier_id text,
    set_as_preferred_supplier boolean DEFAULT false,
    CONSTRAINT purchase_order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_number text NOT NULL,
    supplier_id text NOT NULL,
    status text DEFAULT 'DRAFT'::text,
    order_date timestamp with time zone DEFAULT now(),
    expected_delivery_date timestamp with time zone,
    actual_delivery_date timestamp with time zone,
    subtotal integer DEFAULT 0,
    tax_amount integer DEFAULT 0,
    shipping_cost integer DEFAULT 0,
    discount_amount integer DEFAULT 0,
    total_amount integer DEFAULT 0,
    payment_terms text,
    payment_status text DEFAULT 'PENDING'::text,
    shipping_address_id text,
    notes text,
    internal_notes text,
    created_by text,
    approved_by text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    purchase_budget_id text,
    CONSTRAINT purchase_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['PENDING'::text, 'PARTIAL'::text, 'PAID'::text]))),
    CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'SENT'::text, 'CONFIRMED'::text, 'PARTIAL'::text, 'RECEIVED'::text, 'CANCELLED'::text])))
);


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id text NOT NULL,
    quote_id text NOT NULL,
    product_id text,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    total integer NOT NULL,
    item_type character varying(10) DEFAULT 'PRODUCT'::character varying,
    service_name text,
    service_description text
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id text NOT NULL,
    quote_number text NOT NULL,
    customer_id text NOT NULL,
    subtotal integer NOT NULL,
    discount integer DEFAULT 0 NOT NULL,
    total integer NOT NULL,
    status public."QuoteStatus" DEFAULT 'DRAFT'::public."QuoteStatus" NOT NULL,
    valid_until timestamp(3) without time zone NOT NULL,
    notes text,
    responsible_user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id text NOT NULL,
    sale_id text NOT NULL,
    item_type text NOT NULL,
    product_id text,
    service_name text,
    service_description text,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    discount integer DEFAULT 0 NOT NULL,
    total integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sale_items_item_type_check CHECK ((item_type = ANY (ARRAY['PRODUCT'::text, 'SERVICE'::text])))
);


--
-- Name: sale_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_payments (
    id text NOT NULL,
    sale_id text NOT NULL,
    installment_number integer NOT NULL,
    payment_method public."PaymentMethod" NOT NULL,
    amount integer NOT NULL,
    due_date timestamp with time zone NOT NULL,
    paid_date timestamp with time zone,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus",
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id text NOT NULL,
    sale_number text NOT NULL,
    customer_id text NOT NULL,
    quote_id text,
    status public."SaleStatus" DEFAULT 'PENDING'::public."SaleStatus",
    sale_date timestamp with time zone NOT NULL,
    due_date timestamp with time zone,
    subtotal integer DEFAULT 0 NOT NULL,
    discount integer DEFAULT 0 NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    total_paid integer DEFAULT 0 NOT NULL,
    total_pending integer DEFAULT 0 NOT NULL,
    installments integer DEFAULT 1 NOT NULL,
    notes text,
    internal_notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: service_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_orders (
    id text NOT NULL,
    order_number text NOT NULL,
    customer_id text NOT NULL,
    product_id text NOT NULL,
    technician_id text,
    status public."ServiceOrderStatus" DEFAULT 'OPEN'::public."ServiceOrderStatus" NOT NULL,
    is_warranty boolean DEFAULT false NOT NULL,
    issue_description text,
    diagnosis text,
    service_performed text,
    customer_notes text,
    internal_notes text,
    labor_cost integer DEFAULT 0 NOT NULL,
    parts_cost integer DEFAULT 0 NOT NULL,
    total_cost integer DEFAULT 0 NOT NULL,
    entry_date timestamp with time zone DEFAULT now() NOT NULL,
    estimated_delivery timestamp with time zone,
    completion_date timestamp with time zone,
    photos text[] DEFAULT ARRAY[]::text[],
    documents text[] DEFAULT ARRAY[]::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    default_price integer DEFAULT 0 NOT NULL,
    unit character varying(20) DEFAULT 'HORA'::character varying,
    duration_minutes integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_reservations (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    product_id text NOT NULL,
    quantity integer NOT NULL,
    reserved_for_type text NOT NULL,
    reserved_for_id text,
    reserved_by text,
    reason text,
    status text DEFAULT 'ACTIVE'::text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    consumed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    notes text,
    CONSTRAINT stock_reservations_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT stock_reservations_reserved_for_type_check CHECK ((reserved_for_type = ANY (ARRAY['PRODUCTION_ORDER'::text, 'SERVICE_ORDER'::text, 'QUOTE'::text, 'MANUAL'::text]))),
    CONSTRAINT stock_reservations_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'CONSUMED'::text, 'CANCELLED'::text, 'EXPIRED'::text])))
);


--
-- Name: storage_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_sections (
    id text NOT NULL,
    shelf_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: storage_shelves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_shelves (
    id text NOT NULL,
    space_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: storage_spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_spaces (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: supplier_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_addresses (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    supplier_id text NOT NULL,
    type text,
    street text,
    number text,
    complement text,
    neighborhood text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'BR'::text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT supplier_addresses_type_check CHECK ((type = ANY (ARRAY['BILLING'::text, 'SHIPPING'::text, 'BOTH'::text])))
);


--
-- Name: supplier_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_contacts (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    supplier_id text NOT NULL,
    name text NOT NULL,
    role text,
    email text,
    phone text,
    mobile text,
    is_primary boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: supplier_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_order_items (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    supplier_order_id text NOT NULL,
    purchase_order_item_id text,
    product_id text NOT NULL,
    quantity integer NOT NULL,
    quantity_received integer DEFAULT 0 NOT NULL,
    quantity_pending integer GENERATED ALWAYS AS ((quantity - quantity_received)) STORED,
    unit_price integer DEFAULT 0 NOT NULL,
    discount_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    total_price integer DEFAULT 0 NOT NULL,
    expected_delivery_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT supplier_order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: supplier_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_orders (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_number text NOT NULL,
    supplier_id text NOT NULL,
    purchase_order_id text NOT NULL,
    group_code text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    order_date timestamp with time zone DEFAULT now() NOT NULL,
    expected_delivery_date timestamp with time zone,
    actual_delivery_date timestamp with time zone,
    sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    subtotal integer DEFAULT 0 NOT NULL,
    shipping_cost integer DEFAULT 0 NOT NULL,
    discount_amount integer DEFAULT 0 NOT NULL,
    total_amount integer DEFAULT 0 NOT NULL,
    payment_terms text,
    notes text,
    internal_notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT supplier_orders_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'SENT'::text, 'CONFIRMED'::text, 'PARTIAL'::text, 'RECEIVED'::text, 'CANCELLED'::text])))
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    document character varying(20) NOT NULL,
    email character varying(255),
    phone character varying(20),
    address text,
    city character varying(100),
    state character varying(2),
    postal_code character varying(10),
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    manufacturer text,
    code character varying(50) NOT NULL,
    legal_name character varying(255),
    tax_id character varying(20),
    website character varying(255),
    payment_terms text,
    lead_time_days integer DEFAULT 0,
    minimum_order_value numeric(15,2) DEFAULT 0,
    rating integer,
    ci character varying(50),
    ruc character varying(50),
    CONSTRAINT suppliers_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT suppliers_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'BLOCKED'::character varying])::text[])))
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country character varying(2) DEFAULT 'BR'::character varying NOT NULL,
    default_currency character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    language character varying(10) DEFAULT 'pt-BR'::character varying NOT NULL,
    exchange_rate_brl_to_usd numeric(10,6) DEFAULT 0.20 NOT NULL,
    exchange_rate_brl_to_pyg numeric(10,2) DEFAULT 1450.00 NOT NULL,
    enabled_currencies text[] DEFAULT ARRAY['BRL'::text, 'PYG'::text, 'USD'::text] NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    exchange_rate_usd_to_pyg numeric(10,2) DEFAULT 7250.00,
    CONSTRAINT system_settings_country_check CHECK (((country)::text = ANY ((ARRAY['BR'::character varying, 'PY'::character varying])::text[]))),
    CONSTRAINT system_settings_default_currency_check CHECK (((default_currency)::text = ANY ((ARRAY['BRL'::character varying, 'PYG'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT system_settings_language_check CHECK (((language)::text = ANY ((ARRAY['pt-BR'::character varying, 'es-PY'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role public."UserRole" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    allowed_hours jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: approval_delegations approval_delegations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_delegations
    ADD CONSTRAINT approval_delegations_pkey PRIMARY KEY (id);


--
-- Name: assembly_instructions assembly_instructions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assembly_instructions
    ADD CONSTRAINT assembly_instructions_pkey PRIMARY KEY (id);


--
-- Name: backup_history backup_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_history
    ADD CONSTRAINT backup_history_pkey PRIMARY KEY (id);


--
-- Name: backup_settings backup_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_settings
    ADD CONSTRAINT backup_settings_pkey PRIMARY KEY (id);


--
-- Name: bom_alternatives bom_alternatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_alternatives
    ADD CONSTRAINT bom_alternatives_pkey PRIMARY KEY (id);


--
-- Name: bom_items bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);


--
-- Name: bom_items bom_items_product_id_component_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_product_id_component_id_key UNIQUE (product_id, component_id);


--
-- Name: bom_versions bom_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_versions
    ADD CONSTRAINT bom_versions_pkey PRIMARY KEY (id);


--
-- Name: bom_versions bom_versions_product_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_versions
    ADD CONSTRAINT bom_versions_product_id_version_key UNIQUE (product_id, version);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: document_settings document_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_settings
    ADD CONSTRAINT document_settings_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_items goods_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_name_key UNIQUE (name);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_families product_families_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_families
    ADD CONSTRAINT product_families_name_key UNIQUE (name);


--
-- Name: product_families product_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_families
    ADD CONSTRAINT product_families_pkey PRIMARY KEY (id);


--
-- Name: product_parts product_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_parts
    ADD CONSTRAINT product_parts_pkey PRIMARY KEY (id);


--
-- Name: product_suppliers product_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers
    ADD CONSTRAINT product_suppliers_pkey PRIMARY KEY (id);


--
-- Name: product_suppliers product_suppliers_product_id_supplier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers
    ADD CONSTRAINT product_suppliers_product_id_supplier_id_key UNIQUE (product_id, supplier_id);


--
-- Name: production_material_consumption production_material_consumption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_consumption
    ADD CONSTRAINT production_material_consumption_pkey PRIMARY KEY (id);


--
-- Name: production_operations production_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_operations
    ADD CONSTRAINT production_operations_pkey PRIMARY KEY (id);


--
-- Name: production_orders production_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_order_number_key UNIQUE (order_number);


--
-- Name: production_orders production_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);


--
-- Name: production_quality_checks production_quality_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_quality_checks
    ADD CONSTRAINT production_quality_checks_pkey PRIMARY KEY (id);


--
-- Name: production_reportings production_reportings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reportings
    ADD CONSTRAINT production_reportings_pkey PRIMARY KEY (id);


--
-- Name: production_time_logs production_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_time_logs
    ADD CONSTRAINT production_time_logs_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_budget_items purchase_budget_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budget_items
    ADD CONSTRAINT purchase_budget_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_budget_quotes purchase_budget_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budget_quotes
    ADD CONSTRAINT purchase_budget_quotes_pkey PRIMARY KEY (id);


--
-- Name: purchase_budgets purchase_budgets_budget_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budgets
    ADD CONSTRAINT purchase_budgets_budget_number_key UNIQUE (budget_number);


--
-- Name: purchase_budgets purchase_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budgets
    ADD CONSTRAINT purchase_budgets_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_key UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sale_payments sale_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: sales sales_sale_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_sale_number_key UNIQUE (sale_number);


--
-- Name: service_orders service_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_order_number_key UNIQUE (order_number);


--
-- Name: service_orders service_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_pkey PRIMARY KEY (id);


--
-- Name: services services_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_code_key UNIQUE (code);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


--
-- Name: storage_sections storage_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_sections
    ADD CONSTRAINT storage_sections_pkey PRIMARY KEY (id);


--
-- Name: storage_shelves storage_shelves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_shelves
    ADD CONSTRAINT storage_shelves_pkey PRIMARY KEY (id);


--
-- Name: storage_spaces storage_spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_spaces
    ADD CONSTRAINT storage_spaces_pkey PRIMARY KEY (id);


--
-- Name: supplier_addresses supplier_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_addresses
    ADD CONSTRAINT supplier_addresses_pkey PRIMARY KEY (id);


--
-- Name: supplier_contacts supplier_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contacts
    ADD CONSTRAINT supplier_contacts_pkey PRIMARY KEY (id);


--
-- Name: supplier_order_items supplier_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_order_items
    ADD CONSTRAINT supplier_order_items_pkey PRIMARY KEY (id);


--
-- Name: supplier_orders supplier_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_orders
    ADD CONSTRAINT supplier_orders_order_number_key UNIQUE (order_number);


--
-- Name: supplier_orders supplier_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_orders
    ADD CONSTRAINT supplier_orders_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_code_key UNIQUE (code);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: customers_document_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_document_idx ON public.customers USING btree (document);


--
-- Name: customers_document_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customers_document_unique ON public.customers USING btree (document) WHERE ((document IS NOT NULL) AND (document <> ''::text));


--
-- Name: customers_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_email_idx ON public.customers USING btree (email);


--
-- Name: customers_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_name_idx ON public.customers USING btree (name);


--
-- Name: idx_assembly_instructions_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assembly_instructions_product ON public.assembly_instructions USING btree (product_id);


--
-- Name: idx_assembly_instructions_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assembly_instructions_version ON public.assembly_instructions USING btree (bom_version_id);


--
-- Name: idx_backup_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_history_created_at ON public.backup_history USING btree (created_at DESC);


--
-- Name: idx_backup_history_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_history_status ON public.backup_history USING btree (status);


--
-- Name: idx_bom_alternatives_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_alternatives_item ON public.bom_alternatives USING btree (bom_item_id);


--
-- Name: idx_bom_items_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_items_component ON public.bom_items USING btree (component_id);


--
-- Name: idx_bom_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_items_product ON public.bom_items USING btree (product_id);


--
-- Name: idx_bom_versions_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_versions_product ON public.bom_versions USING btree (product_id);


--
-- Name: idx_bom_versions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_versions_status ON public.bom_versions USING btree (status);


--
-- Name: idx_customers_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_ci ON public.customers USING btree (ci) WHERE (ci IS NOT NULL);


--
-- Name: idx_customers_ruc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_ruc ON public.customers USING btree (ruc) WHERE (ruc IS NOT NULL);


--
-- Name: idx_delegations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delegations_active ON public.approval_delegations USING btree (is_active, start_date, end_date);


--
-- Name: idx_delegations_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delegations_to ON public.approval_delegations USING btree (delegated_to);


--
-- Name: idx_document_settings_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_settings_default ON public.document_settings USING btree (is_default) WHERE (is_default = true);


--
-- Name: idx_goods_receipts_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goods_receipts_po ON public.goods_receipts USING btree (purchase_order_id);


--
-- Name: idx_goods_receipts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goods_receipts_status ON public.goods_receipts USING btree (status);


--
-- Name: idx_goods_receipts_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goods_receipts_supplier ON public.goods_receipts USING btree (supplier_id);


--
-- Name: idx_gr_budget; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_budget ON public.goods_receipts USING btree (purchase_budget_id);


--
-- Name: idx_pb_items_budget; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pb_items_budget ON public.purchase_budget_items USING btree (budget_id);


--
-- Name: idx_pb_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pb_items_product ON public.purchase_budget_items USING btree (product_id);


--
-- Name: idx_pb_quotes_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pb_quotes_item ON public.purchase_budget_quotes USING btree (item_id);


--
-- Name: idx_pb_quotes_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pb_quotes_supplier ON public.purchase_budget_quotes USING btree (supplier_id);


--
-- Name: idx_product_categories_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_categories_is_active ON public.product_categories USING btree (is_active);


--
-- Name: idx_product_categories_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_categories_name ON public.product_categories USING btree (name);


--
-- Name: idx_product_families_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_families_is_active ON public.product_families USING btree (is_active);


--
-- Name: idx_product_families_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_families_name ON public.product_families USING btree (name);


--
-- Name: idx_product_suppliers_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_suppliers_product ON public.product_suppliers USING btree (product_id);


--
-- Name: idx_product_suppliers_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_suppliers_supplier ON public.product_suppliers USING btree (supplier_id);


--
-- Name: idx_production_material_consumption_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_material_consumption_po ON public.production_material_consumption USING btree (production_order_id);


--
-- Name: idx_production_operations_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_operations_po ON public.production_operations USING btree (production_order_id);


--
-- Name: idx_production_orders_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_dates ON public.production_orders USING btree (planned_start_date, planned_end_date);


--
-- Name: idx_production_orders_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_priority ON public.production_orders USING btree (priority);


--
-- Name: idx_production_orders_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_product ON public.production_orders USING btree (product_id);


--
-- Name: idx_production_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_status ON public.production_orders USING btree (status);


--
-- Name: idx_production_quality_checks_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_quality_checks_po ON public.production_quality_checks USING btree (production_order_id);


--
-- Name: idx_production_reportings_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_reportings_po ON public.production_reportings USING btree (production_order_id);


--
-- Name: idx_production_time_logs_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_time_logs_po ON public.production_time_logs USING btree (production_order_id);


--
-- Name: idx_products_family; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_family ON public.products USING btree (family);


--
-- Name: idx_products_is_assembly; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_assembly ON public.products USING btree (is_assembly);


--
-- Name: idx_products_is_part; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_part ON public.products USING btree (is_part);


--
-- Name: idx_products_product_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_product_type ON public.products USING btree (product_type);


--
-- Name: idx_products_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_unit ON public.products USING btree (unit);


--
-- Name: idx_purchase_budgets_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_budgets_created_by ON public.purchase_budgets USING btree (created_by);


--
-- Name: idx_purchase_budgets_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_budgets_number ON public.purchase_budgets USING btree (budget_number);


--
-- Name: idx_purchase_budgets_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_budgets_priority ON public.purchase_budgets USING btree (priority);


--
-- Name: idx_purchase_budgets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_budgets_status ON public.purchase_budgets USING btree (status);


--
-- Name: idx_purchase_budgets_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_budgets_supplier ON public.purchase_budgets USING btree (supplier_id);


--
-- Name: idx_purchase_order_items_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_po ON public.purchase_order_items USING btree (purchase_order_id);


--
-- Name: idx_purchase_order_items_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_supplier_id ON public.purchase_order_items USING btree (supplier_id);


--
-- Name: idx_purchase_orders_budget_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_budget_id ON public.purchase_orders USING btree (purchase_budget_id);


--
-- Name: idx_purchase_orders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_date ON public.purchase_orders USING btree (order_date);


--
-- Name: idx_purchase_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_purchase_orders_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders USING btree (supplier_id);


--
-- Name: idx_services_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_active ON public.services USING btree (is_active);


--
-- Name: idx_services_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_category ON public.services USING btree (category);


--
-- Name: idx_services_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_code ON public.services USING btree (code);


--
-- Name: idx_services_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_name ON public.services USING btree (name);


--
-- Name: idx_stock_reservations_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_expires ON public.stock_reservations USING btree (expires_at) WHERE (status = 'ACTIVE'::text);


--
-- Name: idx_stock_reservations_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_product ON public.stock_reservations USING btree (product_id);


--
-- Name: idx_stock_reservations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_status ON public.stock_reservations USING btree (status);


--
-- Name: idx_stock_reservations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_type ON public.stock_reservations USING btree (reserved_for_type, reserved_for_id);


--
-- Name: idx_supplier_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_order_items_product_id ON public.supplier_order_items USING btree (product_id);


--
-- Name: idx_supplier_order_items_supplier_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_order_items_supplier_order_id ON public.supplier_order_items USING btree (supplier_order_id);


--
-- Name: idx_supplier_orders_group_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_orders_group_code ON public.supplier_orders USING btree (group_code);


--
-- Name: idx_supplier_orders_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_orders_order_date ON public.supplier_orders USING btree (order_date);


--
-- Name: idx_supplier_orders_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_orders_purchase_order_id ON public.supplier_orders USING btree (purchase_order_id);


--
-- Name: idx_supplier_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_orders_status ON public.supplier_orders USING btree (status);


--
-- Name: idx_supplier_orders_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_orders_supplier_id ON public.supplier_orders USING btree (supplier_id);


--
-- Name: idx_suppliers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (code);


--
-- Name: idx_suppliers_manufacturer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_manufacturer ON public.suppliers USING btree (manufacturer);


--
-- Name: idx_suppliers_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_rating ON public.suppliers USING btree (rating);


--
-- Name: idx_suppliers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_status ON public.suppliers USING btree (status);


--
-- Name: idx_suppliers_tax_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_tax_id ON public.suppliers USING btree (tax_id);


--
-- Name: idx_system_settings_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_settings_country ON public.system_settings USING btree (country);


--
-- Name: inventory_movements_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_created_at_idx ON public.inventory_movements USING btree (created_at DESC);


--
-- Name: inventory_movements_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_product_id_idx ON public.inventory_movements USING btree (product_id);


--
-- Name: inventory_movements_reference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_reference_idx ON public.inventory_movements USING btree (reference_id, reference_type);


--
-- Name: inventory_movements_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_type_idx ON public.inventory_movements USING btree (type);


--
-- Name: inventory_movements_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_user_id_idx ON public.inventory_movements USING btree (user_id);


--
-- Name: notifications_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at DESC);


--
-- Name: notifications_is_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_is_read_idx ON public.notifications USING btree (is_read);


--
-- Name: notifications_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);


--
-- Name: product_parts_part_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_parts_part_id_idx ON public.product_parts USING btree (part_id);


--
-- Name: product_parts_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_parts_product_id_idx ON public.product_parts USING btree (product_id);


--
-- Name: product_parts_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_parts_unique_idx ON public.product_parts USING btree (product_id, part_id);


--
-- Name: products_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_category_idx ON public.products USING btree (category);


--
-- Name: products_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_code_idx ON public.products USING btree (code);


--
-- Name: products_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_code_key ON public.products USING btree (code);


--
-- Name: products_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_name_idx ON public.products USING btree (name);


--
-- Name: products_section_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_section_id_idx ON public.products USING btree (section_id);


--
-- Name: products_shelf_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_shelf_id_idx ON public.products USING btree (shelf_id);


--
-- Name: products_space_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_space_id_idx ON public.products USING btree (space_id);


--
-- Name: products_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_status_idx ON public.products USING btree (status);


--
-- Name: quote_items_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_items_product_id_idx ON public.quote_items USING btree (product_id);


--
-- Name: quote_items_quote_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_items_quote_id_idx ON public.quote_items USING btree (quote_id);


--
-- Name: quotes_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_customer_id_idx ON public.quotes USING btree (customer_id);


--
-- Name: quotes_quote_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_quote_number_idx ON public.quotes USING btree (quote_number);


--
-- Name: quotes_quote_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX quotes_quote_number_key ON public.quotes USING btree (quote_number);


--
-- Name: quotes_responsible_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_responsible_user_id_idx ON public.quotes USING btree (responsible_user_id);


--
-- Name: quotes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_status_idx ON public.quotes USING btree (status);


--
-- Name: sale_items_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sale_items_product_id_idx ON public.sale_items USING btree (product_id);


--
-- Name: sale_items_sale_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sale_items_sale_id_idx ON public.sale_items USING btree (sale_id);


--
-- Name: sale_payments_due_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sale_payments_due_date_idx ON public.sale_payments USING btree (due_date);


--
-- Name: sale_payments_sale_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sale_payments_sale_id_idx ON public.sale_payments USING btree (sale_id);


--
-- Name: sale_payments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sale_payments_status_idx ON public.sale_payments USING btree (status);


--
-- Name: sales_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_created_by_idx ON public.sales USING btree (created_by);


--
-- Name: sales_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_customer_id_idx ON public.sales USING btree (customer_id);


--
-- Name: sales_quote_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_quote_id_idx ON public.sales USING btree (quote_id);


--
-- Name: sales_sale_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_sale_date_idx ON public.sales USING btree (sale_date);


--
-- Name: sales_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_status_idx ON public.sales USING btree (status);


--
-- Name: service_orders_completion_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_orders_completion_date_idx ON public.service_orders USING btree (completion_date DESC);


--
-- Name: service_orders_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_orders_customer_id_idx ON public.service_orders USING btree (customer_id);


--
-- Name: service_orders_entry_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_orders_entry_date_idx ON public.service_orders USING btree (entry_date DESC);


--
-- Name: service_orders_is_warranty_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_orders_is_warranty_idx ON public.service_orders USING btree (is_warranty);


--
-- Name: service_orders_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_orders_product_id_idx ON public.service_orders USING btree (product_id);


--
-- Name: service_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_orders_status_idx ON public.service_orders USING btree (status);


--
-- Name: service_orders_technician_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_orders_technician_id_idx ON public.service_orders USING btree (technician_id);


--
-- Name: storage_sections_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX storage_sections_name_idx ON public.storage_sections USING btree (name);


--
-- Name: storage_sections_shelf_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX storage_sections_shelf_id_idx ON public.storage_sections USING btree (shelf_id);


--
-- Name: storage_shelves_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX storage_shelves_name_idx ON public.storage_shelves USING btree (name);


--
-- Name: storage_shelves_space_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX storage_shelves_space_id_idx ON public.storage_shelves USING btree (space_id);


--
-- Name: storage_spaces_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX storage_spaces_name_idx ON public.storage_spaces USING btree (name);


--
-- Name: suppliers_document_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_document_idx ON public.suppliers USING btree (document);


--
-- Name: suppliers_document_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX suppliers_document_key ON public.suppliers USING btree (document);


--
-- Name: suppliers_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_name_idx ON public.suppliers USING btree (name);


--
-- Name: suppliers_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_status_idx ON public.suppliers USING btree (status);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_is_active_idx ON public.users USING btree (is_active);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: production_orders trg_add_finished_goods; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_add_finished_goods AFTER UPDATE OF status ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.add_finished_goods_to_stock();


--
-- Name: assembly_instructions trg_assembly_instructions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assembly_instructions_updated_at BEFORE UPDATE ON public.assembly_instructions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: bom_items trg_bom_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bom_items_updated_at BEFORE UPDATE ON public.bom_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: bom_versions trg_bom_versions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bom_versions_updated_at BEFORE UPDATE ON public.bom_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: production_material_consumption trg_consume_materials; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_consume_materials AFTER UPDATE OF quantity_consumed ON public.production_material_consumption FOR EACH ROW EXECUTE FUNCTION public.consume_production_materials();


--
-- Name: goods_receipts trg_goods_receipts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_goods_receipts_updated_at BEFORE UPDATE ON public.goods_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: product_suppliers trg_product_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_product_suppliers_updated_at BEFORE UPDATE ON public.product_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: production_operations trg_production_operations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_production_operations_updated_at BEFORE UPDATE ON public.production_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: production_orders trg_production_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_production_orders_updated_at BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: purchase_orders trg_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: production_orders trg_reserve_components; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reserve_components AFTER UPDATE OF status ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.reserve_components_for_production();


--
-- Name: services trg_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: suppliers trg_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: goods_receipt_items trg_update_po_item_received_qty; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_po_item_received_qty AFTER INSERT OR UPDATE OF quantity_accepted ON public.goods_receipt_items FOR EACH ROW WHEN ((new.purchase_order_item_id IS NOT NULL)) EXECUTE FUNCTION public.update_po_item_received_qty();


--
-- Name: production_reportings trg_update_production_quantities; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_production_quantities AFTER INSERT OR UPDATE ON public.production_reportings FOR EACH ROW EXECUTE FUNCTION public.update_production_order_quantities();


--
-- Name: stock_reservations trg_update_reserved_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_reserved_stock AFTER INSERT OR DELETE OR UPDATE ON public.stock_reservations FOR EACH ROW EXECUTE FUNCTION public.update_reserved_stock();


--
-- Name: document_settings trigger_single_default_document_settings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_single_default_document_settings BEFORE INSERT OR UPDATE ON public.document_settings FOR EACH ROW WHEN ((new.is_default = true)) EXECUTE FUNCTION public.ensure_single_default_document_settings();


--
-- Name: supplier_orders trigger_supplier_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_supplier_orders_updated_at BEFORE UPDATE ON public.supplier_orders FOR EACH ROW EXECUTE FUNCTION public.update_supplier_orders_updated_at();


--
-- Name: product_families trigger_update_product_families_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_product_families_updated_at BEFORE UPDATE ON public.product_families FOR EACH ROW EXECUTE FUNCTION public.update_product_families_updated_at();


--
-- Name: system_settings trigger_update_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_system_settings_updated_at();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: document_settings update_document_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_document_settings_updated_at BEFORE UPDATE ON public.document_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_parts update_product_parts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_parts_updated_at BEFORE UPDATE ON public.product_parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: purchase_budgets update_purchase_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_purchase_budgets_updated_at BEFORE UPDATE ON public.purchase_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotes update_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sale_payments update_sale_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sale_payments_updated_at BEFORE UPDATE ON public.sale_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales update_sales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: service_orders update_service_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: suppliers update_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_delegations approval_delegations_delegated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_delegations
    ADD CONSTRAINT approval_delegations_delegated_by_fkey FOREIGN KEY (delegated_by) REFERENCES public.users(id);


--
-- Name: approval_delegations approval_delegations_delegated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_delegations
    ADD CONSTRAINT approval_delegations_delegated_to_fkey FOREIGN KEY (delegated_to) REFERENCES public.users(id);


--
-- Name: assembly_instructions assembly_instructions_bom_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assembly_instructions
    ADD CONSTRAINT assembly_instructions_bom_version_id_fkey FOREIGN KEY (bom_version_id) REFERENCES public.bom_versions(id) ON DELETE CASCADE;


--
-- Name: assembly_instructions assembly_instructions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assembly_instructions
    ADD CONSTRAINT assembly_instructions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: backup_history backup_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_history
    ADD CONSTRAINT backup_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: bom_alternatives bom_alternatives_alternative_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_alternatives
    ADD CONSTRAINT bom_alternatives_alternative_product_id_fkey FOREIGN KEY (alternative_product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: bom_alternatives bom_alternatives_bom_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_alternatives
    ADD CONSTRAINT bom_alternatives_bom_item_id_fkey FOREIGN KEY (bom_item_id) REFERENCES public.bom_items(id) ON DELETE CASCADE;


--
-- Name: bom_items bom_items_bom_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_bom_version_id_fkey FOREIGN KEY (bom_version_id) REFERENCES public.bom_versions(id) ON DELETE CASCADE;


--
-- Name: bom_items bom_items_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: bom_items bom_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: bom_versions bom_versions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_versions
    ADD CONSTRAINT bom_versions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: goods_receipt_items goods_receipt_items_goods_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_goods_receipt_id_fkey FOREIGN KEY (goods_receipt_id) REFERENCES public.goods_receipts(id) ON DELETE CASCADE;


--
-- Name: goods_receipt_items goods_receipt_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: goods_receipt_items goods_receipt_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id);


--
-- Name: goods_receipts goods_receipts_purchase_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_purchase_budget_id_fkey FOREIGN KEY (purchase_budget_id) REFERENCES public.purchase_budgets(id);


--
-- Name: goods_receipts goods_receipts_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: goods_receipts goods_receipts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: inventory_movements inventory_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_parts product_parts_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_parts
    ADD CONSTRAINT product_parts_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: product_parts product_parts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_parts
    ADD CONSTRAINT product_parts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_suppliers product_suppliers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers
    ADD CONSTRAINT product_suppliers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_suppliers product_suppliers_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers
    ADD CONSTRAINT product_suppliers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: production_material_consumption production_material_consumption_bom_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_consumption
    ADD CONSTRAINT production_material_consumption_bom_item_id_fkey FOREIGN KEY (bom_item_id) REFERENCES public.bom_items(id);


--
-- Name: production_material_consumption production_material_consumption_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_consumption
    ADD CONSTRAINT production_material_consumption_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: production_material_consumption production_material_consumption_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_consumption
    ADD CONSTRAINT production_material_consumption_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_operations production_operations_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_operations
    ADD CONSTRAINT production_operations_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_orders production_orders_bom_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_bom_version_id_fkey FOREIGN KEY (bom_version_id) REFERENCES public.bom_versions(id);


--
-- Name: production_orders production_orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: production_quality_checks production_quality_checks_production_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_quality_checks
    ADD CONSTRAINT production_quality_checks_production_operation_id_fkey FOREIGN KEY (production_operation_id) REFERENCES public.production_operations(id);


--
-- Name: production_quality_checks production_quality_checks_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_quality_checks
    ADD CONSTRAINT production_quality_checks_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_reportings production_reportings_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reportings
    ADD CONSTRAINT production_reportings_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_time_logs production_time_logs_production_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_time_logs
    ADD CONSTRAINT production_time_logs_production_operation_id_fkey FOREIGN KEY (production_operation_id) REFERENCES public.production_operations(id);


--
-- Name: production_time_logs production_time_logs_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_time_logs
    ADD CONSTRAINT production_time_logs_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: products products_section_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_section_fkey FOREIGN KEY (section_id) REFERENCES public.storage_sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_shelf_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_shelf_fkey FOREIGN KEY (shelf_id) REFERENCES public.storage_shelves(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_space_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_space_fkey FOREIGN KEY (space_id) REFERENCES public.storage_spaces(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_budget_items purchase_budget_items_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budget_items
    ADD CONSTRAINT purchase_budget_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.purchase_budgets(id) ON DELETE CASCADE;


--
-- Name: purchase_budget_items purchase_budget_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budget_items
    ADD CONSTRAINT purchase_budget_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_budget_quotes purchase_budget_quotes_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budget_quotes
    ADD CONSTRAINT purchase_budget_quotes_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.purchase_budget_items(id) ON DELETE CASCADE;


--
-- Name: purchase_budget_quotes purchase_budget_quotes_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budget_quotes
    ADD CONSTRAINT purchase_budget_quotes_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: purchase_budgets purchase_budgets_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budgets
    ADD CONSTRAINT purchase_budgets_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_budgets purchase_budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budgets
    ADD CONSTRAINT purchase_budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_budgets purchase_budgets_purchased_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budgets
    ADD CONSTRAINT purchase_budgets_purchased_by_fkey FOREIGN KEY (purchased_by) REFERENCES public.users(id);


--
-- Name: purchase_budgets purchase_budgets_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_budgets
    ADD CONSTRAINT purchase_budgets_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: purchase_order_items purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_purchase_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_purchase_budget_id_fkey FOREIGN KEY (purchase_budget_id) REFERENCES public.purchase_budgets(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_shipping_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.supplier_addresses(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: quote_items quote_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quotes quotes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotes quotes_responsible_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_payments sale_payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_payments
    ADD CONSTRAINT sale_payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sales sales_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales sales_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: service_orders service_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: service_orders service_orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: service_orders service_orders_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_reservations stock_reservations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: storage_sections storage_sections_shelf_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_sections
    ADD CONSTRAINT storage_sections_shelf_fkey FOREIGN KEY (shelf_id) REFERENCES public.storage_shelves(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: storage_shelves storage_shelves_space_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_shelves
    ADD CONSTRAINT storage_shelves_space_fkey FOREIGN KEY (space_id) REFERENCES public.storage_spaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_addresses supplier_addresses_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_addresses
    ADD CONSTRAINT supplier_addresses_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_contacts supplier_contacts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_contacts
    ADD CONSTRAINT supplier_contacts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_order_items supplier_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_order_items
    ADD CONSTRAINT supplier_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: supplier_order_items supplier_order_items_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_order_items
    ADD CONSTRAINT supplier_order_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE SET NULL;


--
-- Name: supplier_order_items supplier_order_items_supplier_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_order_items
    ADD CONSTRAINT supplier_order_items_supplier_order_id_fkey FOREIGN KEY (supplier_order_id) REFERENCES public.supplier_orders(id) ON DELETE CASCADE;


--
-- Name: supplier_orders supplier_orders_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_orders
    ADD CONSTRAINT supplier_orders_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: supplier_orders supplier_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_orders
    ADD CONSTRAINT supplier_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: product_categories Allow all for authenticated users; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: product_families Allow all operations for all users; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: products Anyone can view active products; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: storage_sections Anyone can view storage sections; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: storage_shelves Anyone can view storage shelves; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: storage_spaces Anyone can view storage spaces; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: customers Authenticated users can view customers; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: inventory_movements Authenticated users can view inventory movements; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: product_parts Authenticated users can view product parts; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: quote_items Authenticated users can view quote items; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: quotes Authenticated users can view quotes; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: service_orders Authenticated users can view service orders; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: suppliers Authenticated users can view suppliers; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: customers Service role can manage customers; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: inventory_movements Service role can manage inventory movements; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: notifications Service role can manage notifications; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: product_parts Service role can manage product parts; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: products Service role can manage products; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: quote_items Service role can manage quote items; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: quotes Service role can manage quotes; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: storage_sections Service role can manage storage sections; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: storage_shelves Service role can manage storage shelves; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: storage_spaces Service role can manage storage spaces; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: suppliers Service role can manage suppliers; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: users Service role can manage users; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: product_categories; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: product_families; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: product_parts; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: quote_items; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: service_orders; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: storage_sections; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: storage_shelves; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: storage_spaces; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: supplier_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: supplier_order_items supplier_order_items_all; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: supplier_orders; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: supplier_orders supplier_orders_all; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- PostgreSQL database dump complete
--

\unrestrict a0IRjqrzb7ofcKFFl4c7IAum6u60ypz9aI7XCh5rcsX8n08exiAVLJoWcinlTzV

