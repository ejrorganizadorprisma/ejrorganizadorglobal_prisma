-- Migration: Allow NULL supplier_id in purchase_orders
-- This allows creating purchase orders from requisitions without a supplier
-- The supplier can be set later when editing the purchase order

ALTER TABLE purchase_orders
ALTER COLUMN supplier_id DROP NOT NULL;

-- Add comment to explain why NULL is allowed
COMMENT ON COLUMN purchase_orders.supplier_id IS 'Supplier for this purchase order. Can be NULL when created from a requisition and will be set later.';
