-- Supabase Seed Script: supabase/seed.sql
-- Description: Standard demo store, suppliers, products, batches, and transactions for StockSense

DO $$
DECLARE
    v_store_id UUID := '00000000-0000-0000-0000-000000000001';
    v_cat_food UUID := '10000000-0000-0000-0000-000000000001';
    v_cat_bev UUID := '10000000-0000-0000-0000-000000000002';
    v_cat_snack UUID := '10000000-0000-0000-0000-000000000003';
    v_cat_dairy UUID := '10000000-0000-0000-0000-000000000004';
    v_cat_pers UUID := '10000000-0000-0000-0000-000000000005';
    v_cat_house UUID := '10000000-0000-0000-0000-000000000006';
    
    v_sup_1 UUID := '20000000-0000-0000-0000-000000000001';
    v_sup_2 UUID := '20000000-0000-0000-0000-000000000002';
    v_sup_3 UUID := '20000000-0000-0000-0000-000000000003';
    v_sup_4 UUID := '20000000-0000-0000-0000-000000000004';
    v_sup_5 UUID := '20000000-0000-0000-0000-000000000005';

    v_prod_1 UUID := '30000000-0000-0000-0000-000000000001';
    v_prod_2 UUID := '30000000-0000-0000-0000-000000000002';
    v_prod_3 UUID := '30000000-0000-0000-0000-000000000003';
    v_prod_4 UUID := '30000000-0000-0000-0000-000000000004';
    v_prod_5 UUID := '30000000-0000-0000-0000-000000000005';
    v_prod_6 UUID := '30000000-0000-0000-0000-000000000006';
    v_prod_7 UUID := '30000000-0000-0000-0000-000000000007';
    v_prod_8 UUID := '30000000-0000-0000-0000-000000000008';
    v_prod_9 UUID := '30000000-0000-0000-0000-000000000009';
    v_prod_10 UUID := '30000000-0000-0000-0000-000000000010';

    v_cust_1 UUID := '40000000-0000-0000-0000-000000000001';
    v_cust_2 UUID := '40000000-0000-0000-0000-000000000002';
    v_cust_3 UUID := '40000000-0000-0000-0000-000000000003';
    v_cust_4 UUID := '40000000-0000-0000-0000-000000000004';

    v_inv_1 UUID := '50000000-0000-0000-0000-000000000001';
    v_inv_2 UUID := '50000000-0000-0000-0000-000000000002';
BEGIN
    -- 1. Create Demo Store
    INSERT INTO public.stores (id, name, address, phone, currency, timezone, billing_settings)
    VALUES (
        v_store_id,
        'StockSense Retail Mart',
        'Shop 14, Galaxy Arcade, MG Road, Bengaluru',
        '+91 98765 43210',
        'INR',
        'Asia/Kolkata',
        '{
            "storeName": "StockSense Retail Mart",
            "tagline": "Fresh • Quality • Best Prices",
            "address": "Shop 14, Galaxy Arcade, MG Road, Bengaluru",
            "phone": "+91 98765 43210",
            "email": "contact@stocksense.in",
            "taxRegistrationNumber": "29AAAAA0000A1Z5",
            "taxEnabled": true,
            "defaultTaxPercent": 5,
            "taxLabel": "GST (5%)",
            "currencySymbol": "₹",
            "currencyCode": "INR",
            "invoicePrefix": "INV-2026-",
            "nextInvoiceSequence": 45,
            "receiptSize": "80mm",
            "defaultPaymentMethod": "cash",
            "cashierName": "Rajesh (Register 1)",
            "footerMessage": "Thank you for shopping with us! Visit again."
        }'::jsonb
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Create Categories
    INSERT INTO public.categories (id, store_id, name) VALUES
        (v_cat_food, v_store_id, 'Food & Grains'),
        (v_cat_bev, v_store_id, 'Beverages'),
        (v_cat_snack, v_store_id, 'Snacks & Packaged'),
        (v_cat_dairy, v_store_id, 'Dairy & Bakery'),
        (v_cat_pers, v_store_id, 'Personal Care'),
        (v_cat_house, v_store_id, 'Household Supplies')
    ON CONFLICT (store_id, name) DO NOTHING;

    -- 3. Create Suppliers
    INSERT INTO public.suppliers (id, store_id, name, contact_person, phone, email, address, lead_time_days, min_order_value, rating) VALUES
        (v_sup_1, v_store_id, 'Fresh Foods Ltd', 'Rajesh Sharma', '9876543210', 'orders@freshfoodsltd.com', 'Warehouse #12, Wholesale Market, Mumbai', 2, 1000.00, 4.80),
        (v_sup_2, v_store_id, 'Beverages Co', 'Sunil Verma', '9876501234', 'supply@beveragesco.in', 'Plot 45, Industrial Area, Thane', 3, 2000.00, 4.60),
        (v_sup_3, v_store_id, 'Snacks Plus Distributors', 'Anita Rao', '9876512345', 'anita@snacksplus.com', 'Sector 8, MIDC, Navi Mumbai', 4, 1500.00, 4.90),
        (v_sup_4, v_store_id, 'Dairy Best Co-operative', 'Gopal Patel', '9876587654', 'logistics@dairybest.coop', 'Dairy Colony, Pune Bypass', 2, 800.00, 4.70),
        (v_sup_5, v_store_id, 'Hindustan Daily Essentials', 'Vikas Kumar', '9876599887', 'fmcg@hde-supply.com', 'Central Logistics Park, Bhiwandi', 3, 3000.00, 4.80)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Create Products
    INSERT INTO public.products (id, store_id, sku, barcode, name, category_id, supplier_id, unit, selling_price, cost_price, min_stock, shelf_life_days) VALUES
        (v_prod_1, v_store_id, 'MAG-280-F', '8901058852301', 'Maggi 2-Minute Noodles', v_cat_food, v_sup_1, 'pack', 18.00, 12.00, 15, 270),
        (v_prod_2, v_store_id, 'COCA-600-B', '8901764012224', 'Coca Cola Pet Bottle 600ml', v_cat_bev, v_sup_2, 'bottle', 30.00, 20.00, 12, 180),
        (v_prod_3, v_store_id, 'LAYS-MAS-50', '8901491101838', 'Lays India''s Magic Masala 50g', v_cat_snack, v_sup_3, 'pack', 25.00, 15.00, 15, 120),
        (v_prod_4, v_store_id, 'AMUL-TON-500', '8901262010052', 'Amul Taaza Toned Milk 500ml', v_cat_dairy, v_sup_4, 'pouch', 40.00, 28.00, 10, 4),
        (v_prod_5, v_store_id, 'BRIT-MAR-250', '8901063001046', 'Britannia Marie Gold 250g', v_cat_snack, v_sup_1, 'pack', 22.00, 16.00, 10, 180),
        (v_prod_6, v_store_id, 'TATA-SLT-1KG', '8904043901005', 'Tata Salt Vacuum Evaporated 1kg', v_cat_food, v_sup_5, 'pack', 28.00, 20.00, 20, 720),
        (v_prod_7, v_store_id, 'ASH-ATT-5KG', '8901725181228', 'Aashirvaad Shudh Chakki Atta 5kg', v_cat_food, v_sup_5, 'bag', 260.00, 210.00, 8, 90),
        (v_prod_8, v_store_id, 'FORT-SUN-1L', '8906007281023', 'Fortune Sunlite Sunflower Oil 1L', v_cat_food, v_sup_1, 'pouch', 165.00, 130.00, 6, 270),
        (v_prod_9, v_store_id, 'COLG-MAX-150', '8901314010504', 'Colgate MaxFresh Spicy Fresh 150g', v_cat_pers, v_sup_5, 'pcs', 110.00, 80.00, 10, 720),
        (v_prod_10, v_store_id, 'DETT-LIQ-200', '8901396384210', 'Dettol Original Liquid Handwash 200ml', v_cat_pers, v_sup_5, 'bottle', 85.00, 60.00, 10, 720)
    ON CONFLICT (id) DO NOTHING;

    -- 5. Create Batches
    INSERT INTO public.inventory_batches (store_id, product_id, batch_number, expiry_date, quantity_on_hand, unit_cost, received_at) VALUES
        (v_store_id, v_prod_1, 'BATCH-MAG-01', '2027-04-15', 30.00, 12.00, now() - INTERVAL '10 days'),
        (v_store_id, v_prod_1, 'BATCH-MAG-02', '2027-06-20', 20.00, 12.00, now() - INTERVAL '2 days'),
        (v_store_id, v_prod_2, 'BATCH-COCA-01', '2026-12-15', 32.00, 20.00, now() - INTERVAL '7 days'),
        (v_store_id, v_prod_3, 'BATCH-LAYS-01', '2026-11-20', 28.00, 15.00, now() - INTERVAL '14 days'),
        (v_store_id, v_prod_4, 'BATCH-AMUL-01', CURRENT_DATE + INTERVAL '2 days', 20.00, 28.00, now() - INTERVAL '1 day'),
        (v_store_id, v_prod_5, 'BATCH-BRIT-01', '2027-01-10', 40.00, 16.00, now() - INTERVAL '12 days'),
        (v_store_id, v_prod_6, 'BATCH-TATA-01', '2027-10-01', 50.00, 20.00, now() - INTERVAL '20 days'),
        (v_store_id, v_prod_7, 'BATCH-ASH-01', '2026-12-31', 12.00, 210.00, now() - INTERVAL '15 days'),
        (v_store_id, v_prod_8, 'BATCH-FORT-01', '2027-03-30', 14.00, 130.00, now() - INTERVAL '10 days'),
        (v_store_id, v_prod_9, 'BATCH-COLG-01', '2027-08-15', 25.00, 80.00, now() - INTERVAL '25 days'),
        (v_store_id, v_prod_10, 'BATCH-DETT-01', '2027-09-01', 18.00, 60.00, now() - INTERVAL '18 days')
    ON CONFLICT DO NOTHING;

    -- 6. Create Customers
    INSERT INTO public.customers (id, store_id, name, phone, email, address) VALUES
        (v_cust_1, v_store_id, 'Amitabh Roy', '9820012345', 'amitabh.roy@gmail.com', 'Flat 402, Sunshine Heights, Koramangala'),
        (v_cust_2, v_store_id, 'Pooja Hegde', '9820054321', 'pooja.h@yahoo.com', 'Plot 88, Green Glen Layout, Bellandur'),
        (v_cust_3, v_store_id, 'Kiran Deshmukh', '9820098765', 'kiran.desh@outlook.com', '12/A 4th Main, Indiranagar'),
        (v_cust_4, v_store_id, 'Sneha Kapoor', '9820033445', 'sneha.k@gmail.com', 'B-103, Palm Grove, HSR Layout')
    ON CONFLICT (id) DO NOTHING;

    -- 7. Create Recent Invoices
    INSERT INTO public.invoices (
        id, store_id, invoice_number, customer_id, status, subtotal, discount_amount, tax_amount, total_amount, payment_status, created_at
    ) VALUES 
        (v_inv_1, v_store_id, 'INV-2026-0041', v_cust_1, 'completed', 73.00, 0.00, 3.65, 76.65, 'paid', now() - INTERVAL '2 hours'),
        (v_inv_2, v_store_id, 'INV-2026-0042', v_cust_2, 'completed', 370.00, 10.00, 18.00, 378.00, 'paid', now() - INTERVAL '30 minutes')
    ON CONFLICT (id) DO NOTHING;

    -- Invoice Items
    INSERT INTO public.invoice_items (
        invoice_id, product_id, sku_snapshot, product_name_snapshot, quantity, unit_price, unit_cost_snapshot, discount_amount, tax_amount, line_total
    ) VALUES
        (v_inv_1, v_prod_1, 'MAG-280-F', 'Maggi 2-Minute Noodles', 2, 18.00, 12.00, 0, 1.80, 36.00),
        (v_inv_1, v_prod_4, 'AMUL-TON-500', 'Amul Taaza Toned Milk 500ml', 1, 40.00, 28.00, 0, 2.00, 40.00),
        (v_inv_2, v_prod_7, 'ASH-ATT-5KG', 'Aashirvaad Shudh Chakki Atta 5kg', 1, 260.00, 210.00, 0, 13.00, 260.00),
        (v_inv_2, v_prod_9, 'COLG-MAX-150', 'Colgate MaxFresh Spicy Fresh 150g', 1, 110.00, 80.00, 10.00, 5.00, 100.00)
    ON CONFLICT DO NOTHING;

    -- Payments
    INSERT INTO public.payments (store_id, invoice_id, payment_method, amount, change_given, status, provider_reference, idempotency_key) VALUES
        (v_store_id, v_inv_1, 'upi', 76.65, 0, 'completed', 'UPI-TXN-998822', 'idem-seed-001'),
        (v_store_id, v_inv_2, 'cash', 400.00, 22.00, 'completed', NULL, 'idem-seed-002')
    ON CONFLICT DO NOTHING;

    -- Sales Transactions
    INSERT INTO public.sales_transactions (store_id, product_id, invoice_id, transaction_type, quantity, unit_price, transaction_date) VALUES
        (v_store_id, v_prod_1, v_inv_1, 'sale', 2, 18.00, now() - INTERVAL '2 hours'),
        (v_store_id, v_prod_4, v_inv_1, 'sale', 1, 40.00, now() - INTERVAL '2 hours'),
        (v_store_id, v_prod_7, v_inv_2, 'sale', 1, 260.00, now() - INTERVAL '30 minutes'),
        (v_store_id, v_prod_9, v_inv_2, 'sale', 1, 110.00, now() - INTERVAL '30 minutes')
    ON CONFLICT DO NOTHING;
END $$;
