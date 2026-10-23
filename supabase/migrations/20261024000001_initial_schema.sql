-- Migration: 20261024000001_initial_schema.sql
-- Description: Core business tables for StockSense multi-tenant retail inventory and POS billing

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. STORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    billing_settings JSONB NOT NULL DEFAULT '{
        "taxEnabled": true,
        "defaultTaxPercent": 5,
        "taxLabel": "GST (5%)",
        "currencySymbol": "₹",
        "currencyCode": "INR",
        "invoicePrefix": "INV-2026-",
        "nextInvoiceSequence": 1,
        "receiptSize": "80mm",
        "footerMessage": "Thank you for shopping with us!"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. STORE MEMBERS (Owner, Manager, Cashier)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_members_store_user UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_members_user ON public.store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store ON public.store_members(store_id);

-- ============================================================================
-- 4. CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categories_store_name UNIQUE(store_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_store ON public.categories(store_id);

-- ============================================================================
-- 5. SUPPLIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    lead_time_days INTEGER NOT NULL DEFAULT 3 CHECK (lead_time_days >= 0),
    min_order_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    rating NUMERIC(3, 2) DEFAULT 4.50 CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_store ON public.suppliers(store_id);

-- ============================================================================
-- 6. PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    unit TEXT NOT NULL DEFAULT 'pcs',
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    cost_price NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
    min_stock NUMERIC(12, 2) NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
    shelf_life_days INTEGER CHECK (shelf_life_days IS NULL OR shelf_life_days >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_products_store_sku UNIQUE(store_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON public.products(store_id, category_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_barcode 
    ON public.products(store_id, barcode) 
    WHERE barcode IS NOT NULL AND barcode <> '';

-- ============================================================================
-- 7. INVENTORY BATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date DATE,
    quantity_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batches_store_product ON public.inventory_batches(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.inventory_batches(expiry_date);

-- ============================================================================
-- 8. INVENTORY MOVEMENTS (Immutable Ledger)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'sale', 'return_restock', 'return_damage', 'po_receipt', 'adjustment_add', 'adjustment_sub', 'write_off'
    )),
    quantity_change NUMERIC(12, 2) NOT NULL,
    reference_type TEXT NOT NULL, -- 'invoice', 'return', 'purchase_order', 'manual_adjustment'
    reference_id UUID,
    idempotency_key TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_store_product ON public.inventory_movements(store_id, product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_movements_idempotency 
    ON public.inventory_movements(store_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 9. CUSTOMERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_phone ON public.customers(store_id, phone);

-- ============================================================================
-- 10. INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'returned_partial', 'returned_full', 'cancelled')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'refunded', 'pending')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_invoices_store_invoice_number UNIQUE(store_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_store_created ON public.invoices(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_store_customer ON public.invoices(store_id, customer_id);

-- ============================================================================
-- 11. INVOICE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku_snapshot TEXT NOT NULL,
    product_name_snapshot TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost_snapshot >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
    returned_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.invoice_items(product_id);

-- ============================================================================
-- 12. PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'other')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    change_given NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (change_given >= 0),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded', 'failed')),
    provider_reference TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_store_invoice ON public.payments(store_id, invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency 
    ON public.payments(store_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 13. RETURNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    refund_amount NUMERIC(12, 2) NOT NULL CHECK (refund_amount >= 0),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'rejected')),
    refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'upi', 'card', 'other')),
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_returns_store ON public.returns(store_id);
CREATE INDEX IF NOT EXISTS idx_returns_invoice ON public.returns(invoice_id);

-- ============================================================================
-- 14. RETURN ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    invoice_item_id UUID NOT NULL REFERENCES public.invoice_items(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    restock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (restock_quantity >= 0),
    damaged_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
    refund_amount NUMERIC(12, 2) NOT NULL CHECK (refund_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON public.return_items(return_id);

-- ============================================================================
-- 15. SALES TRANSACTIONS (Analytics & Aggregations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'return')),
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_tx_store_product_date 
    ON public.sales_transactions(store_id, product_id, transaction_date DESC);

-- ============================================================================
-- 16. HELD BILLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.held_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    bill_data JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_held_bills_store ON public.held_bills(store_id);

-- ============================================================================
-- 17. PURCHASE ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'partially_received', 'received', 'cancelled')),
    expected_delivery_date DATE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_purchase_orders_store_order_number UNIQUE(store_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_store ON public.purchase_orders(store_id);

-- ============================================================================
-- 18. PURCHASE ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    ordered_quantity NUMERIC(12, 2) NOT NULL CHECK (ordered_quantity > 0),
    received_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(purchase_order_id);

-- ============================================================================
-- 19. PURCHASE RECEIPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    idempotency_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_store ON public.purchase_receipts(store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_receipts_idempotency 
    ON public.purchase_receipts(store_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 20. PURCHASE RECEIPT ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
    purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
    quantity_received NUMERIC(12, 2) NOT NULL CHECK (quantity_received > 0),
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON public.purchase_receipt_items(receipt_id);

-- ============================================================================
-- 21. SALES IMPORT BATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    source_filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    imported_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
    rejected_count INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_import_batches_store ON public.sales_import_batches(store_id);

-- ============================================================================
-- 22. SALES IMPORT ROWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL REFERENCES public.sales_import_batches(id) ON DELETE CASCADE,
    source_row_identifier TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('imported', 'rejected')),
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_import_rows_batch ON public.sales_import_rows(import_batch_id);

-- ============================================================================
-- 23. AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_store_created ON public.audit_logs(store_id, created_at DESC);
