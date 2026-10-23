-- Migration: 20261024000002_row_level_security.sql
-- Description: Multi-tenant store-isolation and role-based access control (Owner, Manager, Cashier)

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS & ROLE CHECKS
-- ============================================================================

-- Check if current user is a member of the given store
CREATE OR REPLACE FUNCTION public.auth_is_store_member(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.store_members 
        WHERE store_id = p_store_id 
          AND user_id = auth.uid()
    );
$$;

-- Check if current user has one of the specified roles in the given store
CREATE OR REPLACE FUNCTION public.auth_has_store_role(p_store_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.store_members 
        WHERE store_id = p_store_id 
          AND user_id = auth.uid() 
          AND role = ANY(p_roles)
    );
$$;

-- Get current user's role in a store
CREATE OR REPLACE FUNCTION public.get_user_store_role(p_store_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role 
    FROM public.store_members 
    WHERE store_id = p_store_id 
      AND user_id = auth.uid()
    LIMIT 1;
$$;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.held_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
CREATE POLICY "Users can view all member profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 2. STORES
-- ============================================================================
CREATE POLICY "Members can view their stores"
    ON public.stores FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(id));

CREATE POLICY "Owners can update store settings"
    ON public.stores FOR UPDATE
    TO authenticated
    USING (public.auth_has_store_role(id, ARRAY['owner']))
    WITH CHECK (public.auth_has_store_role(id, ARRAY['owner']));

CREATE POLICY "Authenticated users can create stores"
    ON public.stores FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- 3. STORE MEMBERS
-- ============================================================================
CREATE POLICY "Members can view store memberships"
    ON public.store_members FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Owners can manage store members"
    ON public.store_members FOR ALL
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner']))
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner']));

-- ============================================================================
-- 4. CATEGORIES
-- ============================================================================
CREATE POLICY "Members can view categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can insert/update categories"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Managers and Owners can update categories"
    ON public.categories FOR UPDATE
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']))
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Owners can delete categories"
    ON public.categories FOR DELETE
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner']));

-- ============================================================================
-- 5. SUPPLIERS
-- ============================================================================
CREATE POLICY "Members can view suppliers"
    ON public.suppliers FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can manage suppliers"
    ON public.suppliers FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Managers and Owners can update suppliers"
    ON public.suppliers FOR UPDATE
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']))
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Owners can delete suppliers"
    ON public.suppliers FOR DELETE
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner']));

-- ============================================================================
-- 6. PRODUCTS
-- ============================================================================
CREATE POLICY "Members can view products"
    ON public.products FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can insert products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Managers and Owners can update products"
    ON public.products FOR UPDATE
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']))
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Owners can delete products"
    ON public.products FOR DELETE
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner']));

-- ============================================================================
-- 7. INVENTORY BATCHES
-- ============================================================================
CREATE POLICY "Members can view inventory batches"
    ON public.inventory_batches FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can manage inventory batches"
    ON public.inventory_batches FOR ALL
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']))
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

-- ============================================================================
-- 8. INVENTORY MOVEMENTS
-- ============================================================================
CREATE POLICY "Members can view inventory movements"
    ON public.inventory_movements FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Members can record movements via transactions"
    ON public.inventory_movements FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_store_member(store_id));

-- ============================================================================
-- 9. CUSTOMERS
-- ============================================================================
CREATE POLICY "Members can view customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Members can insert or update customers"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_store_member(store_id));

CREATE POLICY "Members can update customers"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (public.auth_is_store_member(store_id))
    WITH CHECK (public.auth_is_store_member(store_id));

-- ============================================================================
-- 10. INVOICES
-- ============================================================================
CREATE POLICY "Members can view invoices"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Members can create invoices"
    ON public.invoices FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can update invoice status"
    ON public.invoices FOR UPDATE
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']))
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

-- ============================================================================
-- 11. INVOICE ITEMS
-- ============================================================================
CREATE POLICY "Members can view invoice items"
    ON public.invoice_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices inv
            WHERE inv.id = invoice_id AND public.auth_is_store_member(inv.store_id)
        )
    );

CREATE POLICY "Members can insert invoice items"
    ON public.invoice_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices inv
            WHERE inv.id = invoice_id AND public.auth_is_store_member(inv.store_id)
        )
    );

-- ============================================================================
-- 12. PAYMENTS
-- ============================================================================
CREATE POLICY "Members can view payments"
    ON public.payments FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Members can record payments"
    ON public.payments FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_store_member(store_id));

-- ============================================================================
-- 13. RETURNS & 14. RETURN ITEMS
-- ============================================================================
CREATE POLICY "Members can view returns"
    ON public.returns FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can process returns"
    ON public.returns FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members can view return items"
    ON public.return_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.returns ret
            WHERE ret.id = return_id AND public.auth_is_store_member(ret.store_id)
        )
    );

CREATE POLICY "Managers and Owners can insert return items"
    ON public.return_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.returns ret
            WHERE ret.id = return_id AND public.auth_has_store_role(ret.store_id, ARRAY['owner', 'manager'])
        )
    );

-- ============================================================================
-- 15. SALES TRANSACTIONS
-- ============================================================================
CREATE POLICY "Members can view sales transactions"
    ON public.sales_transactions FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Members can record sales transactions"
    ON public.sales_transactions FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_store_member(store_id));

-- ============================================================================
-- 16. HELD BILLS
-- ============================================================================
CREATE POLICY "Members can view and manage held bills"
    ON public.held_bills FOR ALL
    TO authenticated
    USING (public.auth_is_store_member(store_id))
    WITH CHECK (public.auth_is_store_member(store_id));

-- ============================================================================
-- 17. PURCHASE ORDERS & 18. ITEMS
-- ============================================================================
CREATE POLICY "Members can view purchase orders"
    ON public.purchase_orders FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can create/modify purchase orders"
    ON public.purchase_orders FOR ALL
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']))
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members can view purchase order items"
    ON public.purchase_order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_id AND public.auth_is_store_member(po.store_id)
        )
    );

CREATE POLICY "Managers and Owners can manage purchase order items"
    ON public.purchase_order_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_id AND public.auth_has_store_role(po.store_id, ARRAY['owner', 'manager'])
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_id AND public.auth_has_store_role(po.store_id, ARRAY['owner', 'manager'])
        )
    );

-- ============================================================================
-- 19. PURCHASE RECEIPTS & 20. ITEMS
-- ============================================================================
CREATE POLICY "Members can view purchase receipts"
    ON public.purchase_receipts FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can record purchase receipts"
    ON public.purchase_receipts FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members can view purchase receipt items"
    ON public.purchase_receipt_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_receipts pr
            WHERE pr.id = receipt_id AND public.auth_is_store_member(pr.store_id)
        )
    );

CREATE POLICY "Managers and Owners can insert purchase receipt items"
    ON public.purchase_receipt_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.purchase_receipts pr
            WHERE pr.id = receipt_id AND public.auth_has_store_role(pr.store_id, ARRAY['owner', 'manager'])
        )
    );

-- ============================================================================
-- 21. SALES IMPORT BATCHES & 22. ROWS
-- ============================================================================
CREATE POLICY "Members can view import batches"
    ON public.sales_import_batches FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "Managers and Owners can create import batches"
    ON public.sales_import_batches FOR ALL
    TO authenticated
    USING (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']))
    WITH CHECK (public.auth_has_store_role(store_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members can view import rows"
    ON public.sales_import_rows FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales_import_batches sib
            WHERE sib.id = import_batch_id AND public.auth_is_store_member(sib.store_id)
        )
    );

CREATE POLICY "Managers and Owners can create import rows"
    ON public.sales_import_rows FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales_import_batches sib
            WHERE sib.id = import_batch_id AND public.auth_has_store_role(sib.store_id, ARRAY['owner', 'manager'])
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales_import_batches sib
            WHERE sib.id = import_batch_id AND public.auth_has_store_role(sib.store_id, ARRAY['owner', 'manager'])
        )
    );

-- ============================================================================
-- 23. AUDIT LOGS
-- ============================================================================
CREATE POLICY "Members can view store audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.auth_is_store_member(store_id));

CREATE POLICY "System and members can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_store_member(store_id));
