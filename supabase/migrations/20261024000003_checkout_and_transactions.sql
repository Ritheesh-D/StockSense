-- Migration: 20261024000003_checkout_and_transactions.sql
-- Description: Atomic PostgreSQL transaction functions for checkout, returns, and PO receiving

-- ============================================================================
-- 1. SAFE INVOICE NUMBER GENERATION (Collision-free under concurrency)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_seq BIGINT;
    v_invoice_number TEXT;
    v_store_int BIGINT;
BEGIN
    -- Acquire transaction-scoped advisory lock based on store UUID hash
    v_store_int := ('x' || substr(md5(p_store_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_store_int);

    -- Extract prefix and sequence from store billing_settings
    SELECT 
        COALESCE(billing_settings->>'invoicePrefix', 'INV-2026-'),
        COALESCE((billing_settings->>'nextInvoiceSequence')::bigint, 1)
    INTO v_prefix, v_seq
    FROM public.stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Store % not found', p_store_id;
    END IF;

    -- Ensure uniqueness even if sequence in JSON was out of sync
    LOOP
        v_invoice_number := v_prefix || lpad(v_seq::text, 4, '0');
        IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE store_id = p_store_id AND invoice_number = v_invoice_number) THEN
            EXIT;
        END IF;
        v_seq := v_seq + 1;
    END LOOP;

    -- Update next sequence in store settings
    UPDATE public.stores
    SET billing_settings = jsonb_set(billing_settings, '{nextInvoiceSequence}', to_jsonb(v_seq + 1)),
        updated_at = now()
    WHERE id = p_store_id;

    RETURN v_invoice_number;
END;
$$;

-- ============================================================================
-- 2. ATOMIC CHECKOUT TRANSACTION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.perform_atomic_checkout(
    p_store_id UUID,
    p_cart_items JSONB, -- Array of { productId, quantity, discountAmount }
    p_subtotal NUMERIC(12, 2),
    p_discount_percent NUMERIC(5, 2),
    p_discount_amount NUMERIC(12, 2),
    p_tax_percent NUMERIC(5, 2),
    p_tax_amount NUMERIC(12, 2),
    p_grand_total NUMERIC(12, 2),
    p_payment JSONB, -- { method, amountPaid, changeGiven, transactionRef, idempotencyKey }
    p_customer_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_idempotency_key TEXT;
    v_existing_invoice_id UUID;
    v_invoice_number TEXT;
    v_invoice_id UUID;
    v_item RECORD;
    v_prod RECORD;
    v_batch RECORD;
    v_qty_needed NUMERIC(12, 2);
    v_qty_from_batch NUMERIC(12, 2);
    v_total_stock NUMERIC(12, 2);
    v_calc_subtotal NUMERIC(12, 2) := 0;
    v_item_subtotal NUMERIC(12, 2);
    v_item_discount NUMERIC(12, 2);
    v_item_line_total NUMERIC(12, 2);
    v_item_tax NUMERIC(12, 2);
    v_item_cost NUMERIC(12, 2);
    v_method TEXT;
    v_amount_paid NUMERIC(12, 2);
    v_change_given NUMERIC(12, 2);
    v_tx_ref TEXT;
    v_result JSONB;
BEGIN
    -- 1. Authenticate & Authorize
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required for checkout';
    END IF;

    IF NOT public.auth_is_store_member(p_store_id) THEN
        RAISE EXCEPTION 'User is not a member of store %', p_store_id;
    END IF;

    -- 2. Idempotency Check
    v_idempotency_key := p_payment->>'idempotencyKey';
    IF v_idempotency_key IS NOT NULL AND v_idempotency_key <> '' THEN
        SELECT invoice_id INTO v_existing_invoice_id
        FROM public.payments
        WHERE store_id = p_store_id AND idempotency_key = v_idempotency_key
        LIMIT 1;

        IF v_existing_invoice_id IS NOT NULL THEN
            -- Already committed, return original invoice
            SELECT jsonb_build_object(
                'success', true,
                'idempotent_replay', true,
                'invoice', row_to_json(inv),
                'items', (SELECT jsonb_agg(row_to_json(ii)) FROM public.invoice_items ii WHERE ii.invoice_id = inv.id)
            ) INTO v_result
            FROM public.invoices inv
            WHERE inv.id = v_existing_invoice_id;

            RETURN v_result;
        END IF;
    END IF;

    -- Validate cart non-empty
    IF p_cart_items IS NULL OR jsonb_array_length(p_cart_items) = 0 THEN
        RAISE EXCEPTION 'Cart cannot be empty';
    END IF;

    -- 3. Lock products deterministically (order by product id to avoid deadlocks)
    PERFORM id 
    FROM public.products
    WHERE store_id = p_store_id 
      AND id IN (
          SELECT (elem->>'productId')::uuid 
          FROM jsonb_array_elements(p_cart_items) AS elem
      )
    ORDER BY id
    FOR UPDATE;

    -- 4. Validate stock and server-side pricing for each line item
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_cart_items) AS x(
        "productId" UUID,
        "quantity" NUMERIC(12, 2),
        "discountAmount" NUMERIC(12, 2)
    )
    LOOP
        IF v_item."quantity" <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero';
        END IF;

        SELECT * INTO v_prod
        FROM public.products
        WHERE id = v_item."productId" AND store_id = p_store_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found in store', v_item."productId";
        END IF;

        IF NOT v_prod.active THEN
            RAISE EXCEPTION 'Product % (%) is inactive', v_prod.name, v_prod.sku;
        END IF;

        -- Check total available stock across batches
        SELECT COALESCE(SUM(quantity_on_hand), 0) INTO v_total_stock
        FROM public.inventory_batches
        WHERE product_id = v_prod.id AND store_id = p_store_id;

        IF v_total_stock < v_item."quantity" THEN
            RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %', 
                v_prod.name, v_total_stock, v_item."quantity";
        END IF;

        v_item_subtotal := round(v_prod.selling_price * v_item."quantity", 2);
        v_item_discount := COALESCE(v_item."discountAmount", 0);
        IF v_item_discount > v_item_subtotal THEN
            RAISE EXCEPTION 'Discount for % exceeds product total', v_prod.name;
        END IF;

        v_calc_subtotal := v_calc_subtotal + v_item_subtotal;
    END LOOP;

    -- 5. Payment validation
    v_method := COALESCE(p_payment->>'method', 'cash');
    v_amount_paid := COALESCE((p_payment->>'amountPaid')::numeric, p_grand_total);
    v_change_given := COALESCE((p_payment->>'changeGiven')::numeric, 0);
    v_tx_ref := p_payment->>'transactionRef';

    IF v_method = 'cash' AND v_amount_paid < p_grand_total THEN
        RAISE EXCEPTION 'Amount paid (%) cannot be less than grand total (%)', v_amount_paid, p_grand_total;
    END IF;

    -- 6. Allocate unique invoice number
    v_invoice_number := public.get_next_invoice_number(p_store_id);

    -- 7. Insert Invoice
    INSERT INTO public.invoices (
        store_id,
        invoice_number,
        customer_id,
        status,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        payment_status,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_store_id,
        v_invoice_number,
        p_customer_id,
        'completed',
        p_subtotal,
        p_discount_amount,
        p_tax_amount,
        p_grand_total,
        'paid',
        p_notes,
        v_user_id,
        now()
    ) RETURNING id INTO v_invoice_id;

    -- 8. Deduct Stock from Batches (FEFO: earliest expiry first) and create items + movements
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_cart_items) AS x(
        "productId" UUID,
        "quantity" NUMERIC(12, 2),
        "discountAmount" NUMERIC(12, 2)
    )
    LOOP
        SELECT * INTO v_prod
        FROM public.products
        WHERE id = v_item."productId" AND store_id = p_store_id;

        v_item_subtotal := round(v_prod.selling_price * v_item."quantity", 2);
        v_item_discount := COALESCE(v_item."discountAmount", 0);
        v_item_line_total := v_item_subtotal - v_item_discount;
        v_item_tax := round((v_item_line_total * COALESCE(p_tax_percent, 0)) / 100, 2);

        -- Insert invoice item
        INSERT INTO public.invoice_items (
            invoice_id,
            product_id,
            sku_snapshot,
            product_name_snapshot,
            quantity,
            unit_price,
            unit_cost_snapshot,
            discount_amount,
            tax_amount,
            line_total,
            returned_quantity
        ) VALUES (
            v_invoice_id,
            v_prod.id,
            v_prod.sku,
            v_prod.name,
            v_item."quantity",
            v_prod.selling_price,
            v_prod.cost_price,
            v_item_discount,
            v_item_tax,
            v_item_line_total,
            0
        );

        -- Record sales transaction
        INSERT INTO public.sales_transactions (
            store_id,
            product_id,
            invoice_id,
            transaction_type,
            quantity,
            unit_price,
            transaction_date
        ) VALUES (
            p_store_id,
            v_prod.id,
            v_invoice_id,
            'sale',
            v_item."quantity",
            v_prod.selling_price,
            now()
        );

        -- Deduct from batches FEFO
        v_qty_needed := v_item."quantity";
        FOR v_batch IN 
            SELECT * 
            FROM public.inventory_batches
            WHERE product_id = v_prod.id 
              AND store_id = p_store_id 
              AND quantity_on_hand > 0
            ORDER BY expiry_date ASC NULLS LAST, received_at ASC
            FOR UPDATE
        LOOP
            IF v_qty_needed <= 0 THEN
                EXIT;
            END IF;

            IF v_batch.quantity_on_hand <= v_qty_needed THEN
                v_qty_from_batch := v_batch.quantity_on_hand;
            ELSE
                v_qty_from_batch := v_qty_needed;
            END IF;

            UPDATE public.inventory_batches
            SET quantity_on_hand = quantity_on_hand - v_qty_from_batch
            WHERE id = v_batch.id;

            -- Record inventory movement
            INSERT INTO public.inventory_movements (
                store_id,
                product_id,
                batch_id,
                movement_type,
                quantity_change,
                reference_type,
                reference_id,
                idempotency_key,
                created_by,
                created_at
            ) VALUES (
                p_store_id,
                v_prod.id,
                v_batch.id,
                'sale',
                -v_qty_from_batch,
                'invoice',
                v_invoice_id,
                v_idempotency_key,
                v_user_id,
                now()
            );

            v_qty_needed := v_qty_needed - v_qty_from_batch;
        END LOOP;

        -- If batches ran out but product level stock existed, insert movement against null batch
        IF v_qty_needed > 0 THEN
            INSERT INTO public.inventory_movements (
                store_id,
                product_id,
                batch_id,
                movement_type,
                quantity_change,
                reference_type,
                reference_id,
                idempotency_key,
                created_by,
                created_at
            ) VALUES (
                p_store_id,
                v_prod.id,
                NULL,
                'sale',
                -v_qty_needed,
                'invoice',
                v_invoice_id,
                v_idempotency_key,
                v_user_id,
                now()
            );
        END IF;
    END LOOP;

    -- 9. Insert Payment
    INSERT INTO public.payments (
        store_id,
        invoice_id,
        payment_method,
        amount,
        change_given,
        status,
        provider_reference,
        idempotency_key,
        created_at
    ) VALUES (
        p_store_id,
        v_invoice_id,
        v_method,
        p_grand_total,
        v_change_given,
        'completed',
        v_tx_ref,
        v_idempotency_key,
        now()
    );

    -- 10. Audit Log
    INSERT INTO public.audit_logs (
        store_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details,
        created_at
    ) VALUES (
        p_store_id,
        v_user_id,
        'checkout_completed',
        'invoice',
        v_invoice_id::text,
        jsonb_build_object(
            'invoice_number', v_invoice_number,
            'grand_total', p_grand_total,
            'items_count', jsonb_array_length(p_cart_items),
            'payment_method', v_method
        ),
        now()
    );

    -- 11. Build Return JSON
    SELECT jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'invoice', row_to_json(inv),
        'items', (SELECT jsonb_agg(row_to_json(ii)) FROM public.invoice_items ii WHERE ii.invoice_id = inv.id)
    ) INTO v_result
    FROM public.invoices inv
    WHERE inv.id = v_invoice_id;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- 3. RETURNS AND REFUNDS TRANSACTION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_return_transaction(
    p_store_id UUID,
    p_invoice_id UUID,
    p_items_to_return JSONB, -- Array of { productId, quantity, condition: 'sellable'|'damaged' }
    p_refund_method TEXT,
    p_reason TEXT,
    p_cashier_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_inv RECORD;
    v_return_id UUID;
    v_item RECORD;
    v_inv_item RECORD;
    v_max_returnable NUMERIC(12, 2);
    v_eff_unit_price NUMERIC(12, 2);
    v_item_refund NUMERIC(12, 2);
    v_total_refund NUMERIC(12, 2) := 0;
    v_restock_qty NUMERIC(12, 2);
    v_damaged_qty NUMERIC(12, 2);
    v_target_batch_id UUID;
    v_all_returned BOOLEAN;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required for returns';
    END IF;

    IF NOT public.auth_has_store_role(p_store_id, ARRAY['owner', 'manager']) THEN
        RAISE EXCEPTION 'Only store managers or owners can authorize returns';
    END IF;

    -- Lock invoice
    SELECT * INTO v_inv
    FROM public.invoices
    WHERE id = p_invoice_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
    END IF;

    IF v_inv.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot return a cancelled invoice';
    END IF;

    -- Lock invoice items
    PERFORM id 
    FROM public.invoice_items
    WHERE invoice_id = p_invoice_id
    FOR UPDATE;

    -- Create Return Header
    INSERT INTO public.returns (
        store_id,
        invoice_id,
        reason,
        refund_amount,
        status,
        refund_method,
        processed_by,
        created_at
    ) VALUES (
        p_store_id,
        p_invoice_id,
        p_reason,
        0, -- Updated below
        'completed',
        p_refund_method,
        v_user_id,
        now()
    ) RETURNING id INTO v_return_id;

    -- Process Each Return Item
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items_to_return) AS x(
        "productId" UUID,
        "quantity" NUMERIC(12, 2),
        "condition" TEXT
    )
    LOOP
        IF v_item."quantity" <= 0 THEN
            CONTINUE;
        END IF;

        SELECT * INTO v_inv_item
        FROM public.invoice_items
        WHERE invoice_id = p_invoice_id AND product_id = v_item."productId"
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % does not belong to invoice %', v_item."productId", v_inv.invoice_number;
        END IF;

        v_max_returnable := v_inv_item.quantity - COALESCE(v_inv_item.returned_quantity, 0);
        IF v_item."quantity" > v_max_returnable THEN
            RAISE EXCEPTION 'Cannot return % units of %. Maximum returnable is %', 
                v_item."quantity", v_inv_item.product_name_snapshot, v_max_returnable;
        END IF;

        -- Calculate proportional refund per unit
        v_eff_unit_price := round(v_inv_item.line_total / v_inv_item.quantity, 2);
        v_item_refund := round(v_eff_unit_price * v_item."quantity", 2);
        v_total_refund := v_total_refund + v_item_refund;

        v_restock_qty := CASE WHEN v_item."condition" = 'sellable' THEN v_item."quantity" ELSE 0 END;
        v_damaged_qty := CASE WHEN v_item."condition" = 'damaged' THEN v_item."quantity" ELSE 0 END;

        -- Insert return item
        INSERT INTO public.return_items (
            return_id,
            invoice_item_id,
            product_id,
            quantity,
            restock_quantity,
            damaged_quantity,
            refund_amount
        ) VALUES (
            v_return_id,
            v_inv_item.id,
            v_item."productId",
            v_item."quantity",
            v_restock_qty,
            v_damaged_qty,
            v_item_refund
        );

        -- Update returned_quantity on invoice item
        UPDATE public.invoice_items
        SET returned_quantity = COALESCE(returned_quantity, 0) + v_item."quantity"
        WHERE id = v_inv_item.id;

        -- Record return sales transaction (negative quantity)
        INSERT INTO public.sales_transactions (
            store_id,
            product_id,
            invoice_id,
            transaction_type,
            quantity,
            unit_price,
            transaction_date
        ) VALUES (
            p_store_id,
            v_item."productId",
            p_invoice_id,
            'return',
            -v_item."quantity",
            v_eff_unit_price,
            now()
        );

        -- Restock sellable items to active batch or create return batch
        IF v_restock_qty > 0 THEN
            SELECT id INTO v_target_batch_id
            FROM public.inventory_batches
            WHERE store_id = p_store_id AND product_id = v_item."productId"
            ORDER BY expiry_date DESC NULLS LAST
            LIMIT 1;

            IF v_target_batch_id IS NOT NULL THEN
                UPDATE public.inventory_batches
                SET quantity_on_hand = quantity_on_hand + v_restock_qty
                WHERE id = v_target_batch_id;
            ELSE
                INSERT INTO public.inventory_batches (
                    store_id,
                    product_id,
                    batch_number,
                    expiry_date,
                    quantity_on_hand,
                    unit_cost,
                    received_at
                ) VALUES (
                    p_store_id,
                    v_item."productId",
                    'RET-' || to_char(now(), 'YYYYMMDD'),
                    CURRENT_DATE + INTERVAL '180 days',
                    v_restock_qty,
                    v_inv_item.unit_cost_snapshot,
                    now()
                ) RETURNING id INTO v_target_batch_id;
            END IF;

            INSERT INTO public.inventory_movements (
                store_id,
                product_id,
                batch_id,
                movement_type,
                quantity_change,
                reference_type,
                reference_id,
                created_by,
                created_at
            ) VALUES (
                p_store_id,
                v_item."productId",
                v_target_batch_id,
                'return_restock',
                v_restock_qty,
                'return',
                v_return_id,
                v_user_id,
                now()
            );
        END IF;

        -- Damaged items recorded as write_off
        IF v_damaged_qty > 0 THEN
            INSERT INTO public.inventory_movements (
                store_id,
                product_id,
                batch_id,
                movement_type,
                quantity_change,
                reference_type,
                reference_id,
                created_by,
                created_at
            ) VALUES (
                p_store_id,
                v_item."productId",
                NULL,
                'return_damage',
                -v_damaged_qty,
                'return',
                v_return_id,
                v_user_id,
                now()
            );
        END IF;
    END LOOP;

    -- Update total refund on return record
    UPDATE public.returns
    SET refund_amount = v_total_refund
    WHERE id = v_return_id;

    -- Update invoice status
    SELECT bool_and(quantity <= COALESCE(returned_quantity, 0)) INTO v_all_returned
    FROM public.invoice_items
    WHERE invoice_id = p_invoice_id;

    UPDATE public.invoices
    SET status = CASE WHEN v_all_returned THEN 'returned_full' ELSE 'returned_partial' END,
        payment_status = CASE WHEN v_all_returned THEN 'refunded' ELSE payment_status END
    WHERE id = p_invoice_id;

    -- Audit log
    INSERT INTO public.audit_logs (
        store_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details,
        created_at
    ) VALUES (
        p_store_id,
        v_user_id,
        'return_processed',
        'return',
        v_return_id::text,
        jsonb_build_object(
            'invoice_id', p_invoice_id,
            'refund_amount', v_total_refund,
            'reason', p_reason
        ),
        now()
    );

    SELECT jsonb_build_object(
        'success', true,
        'return_id', v_return_id,
        'total_refund', v_total_refund,
        'invoice_status', CASE WHEN v_all_returned THEN 'returned_full' ELSE 'returned_partial' END
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- 4. PURCHASE ORDER RECEIVING TRANSACTION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.receive_purchase_order_receipt(
    p_store_id UUID,
    p_purchase_order_id UUID,
    p_received_items JSONB, -- Array of { poItemId, quantityReceived, batchNumber, expiryDate, unitCost }
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_existing_receipt_id UUID;
    v_po RECORD;
    v_receipt_id UUID;
    v_item RECORD;
    v_po_item RECORD;
    v_batch_id UUID;
    v_new_received_qty NUMERIC(12, 2);
    v_all_fully_received BOOLEAN;
    v_any_received BOOLEAN;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required for receiving purchase orders';
    END IF;

    IF NOT public.auth_has_store_role(p_store_id, ARRAY['owner', 'manager']) THEN
        RAISE EXCEPTION 'Only managers or owners can receive purchase orders';
    END IF;

    -- Idempotency check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_receipt_id
        FROM public.purchase_receipts
        WHERE store_id = p_store_id AND idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing_receipt_id IS NOT NULL THEN
            SELECT jsonb_build_object(
                'success', true,
                'idempotent_replay', true,
                'receipt_id', v_existing_receipt_id,
                'message', 'Receipt previously recorded'
            ) INTO v_result;
            RETURN v_result;
        END IF;
    END IF;

    -- Lock PO
    SELECT * INTO v_po
    FROM public.purchase_orders
    WHERE id = p_purchase_order_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order % not found', p_purchase_order_id;
    END IF;

    IF v_po.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot receive items for a cancelled purchase order';
    END IF;

    -- Create Purchase Receipt
    INSERT INTO public.purchase_receipts (
        store_id,
        purchase_order_id,
        received_by,
        received_at,
        idempotency_key
    ) VALUES (
        p_store_id,
        p_purchase_order_id,
        v_user_id,
        now(),
        p_idempotency_key
    ) RETURNING id INTO v_receipt_id;

    -- Process received items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_received_items) AS x(
        "poItemId" UUID,
        "quantityReceived" NUMERIC(12, 2),
        "batchNumber" TEXT,
        "expiryDate" DATE,
        "unitCost" NUMERIC(12, 2)
    )
    LOOP
        IF v_item."quantityReceived" <= 0 THEN
            CONTINUE;
        END IF;

        SELECT * INTO v_po_item
        FROM public.purchase_order_items
        WHERE id = v_item."poItemId" AND purchase_order_id = p_purchase_order_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PO Item % not found in PO %', v_item."poItemId", v_po.order_number;
        END IF;

        -- Create or update inventory batch
        INSERT INTO public.inventory_batches (
            store_id,
            product_id,
            batch_number,
            expiry_date,
            quantity_on_hand,
            unit_cost,
            received_at
        ) VALUES (
            p_store_id,
            v_po_item.product_id,
            COALESCE(v_item."batchNumber", 'BATCH-' || to_char(now(), 'YYYYMMDD-HH24MI')),
            COALESCE(v_item."expiryDate", CURRENT_DATE + INTERVAL '365 days'),
            v_item."quantityReceived",
            COALESCE(v_item."unitCost", v_po_item.unit_cost),
            now()
        ) RETURNING id INTO v_batch_id;

        -- Insert receipt item
        INSERT INTO public.purchase_receipt_items (
            receipt_id,
            purchase_order_item_id,
            quantity_received,
            batch_id
        ) VALUES (
            v_receipt_id,
            v_po_item.id,
            v_item."quantityReceived",
            v_batch_id
        );

        -- Record inventory movement
        INSERT INTO public.inventory_movements (
            store_id,
            product_id,
            batch_id,
            movement_type,
            quantity_change,
            reference_type,
            reference_id,
            idempotency_key,
            created_by,
            created_at
        ) VALUES (
            p_store_id,
            v_po_item.product_id,
            v_batch_id,
            'po_receipt',
            v_item."quantityReceived",
            'purchase_order',
            p_purchase_order_id,
            p_idempotency_key,
            v_user_id,
            now()
        );

        -- Update PO item received quantity
        UPDATE public.purchase_order_items
        SET received_quantity = received_quantity + v_item."quantityReceived"
        WHERE id = v_po_item.id;
    END LOOP;

    -- Re-evaluate PO status
    SELECT 
        bool_and(received_quantity >= ordered_quantity),
        bool_or(received_quantity > 0)
    INTO v_all_fully_received, v_any_received
    FROM public.purchase_order_items
    WHERE purchase_order_id = p_purchase_order_id;

    UPDATE public.purchase_orders
    SET status = CASE 
            WHEN v_all_fully_received THEN 'received' 
            WHEN v_any_received THEN 'partially_received' 
            ELSE status 
        END
    WHERE id = p_purchase_order_id;

    -- Audit log
    INSERT INTO public.audit_logs (
        store_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details,
        created_at
    ) VALUES (
        p_store_id,
        v_user_id,
        'po_received',
        'purchase_order',
        p_purchase_order_id::text,
        jsonb_build_object(
            'receipt_id', v_receipt_id,
            'po_number', v_po.order_number,
            'new_status', CASE WHEN v_all_fully_received THEN 'received' ELSE 'partially_received' END
        ),
        now()
    );

    SELECT jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'receipt_id', v_receipt_id,
        'status', CASE WHEN v_all_fully_received THEN 'received' ELSE 'partially_received' END,
        'message', 'Purchase receipt committed successfully'
    ) INTO v_result;

    RETURN v_result;
END;
$$;
