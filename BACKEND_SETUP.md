# StockSense — Supabase Backend Setup & Deployment Guide

This document provides complete instructions for configuring, provisioning, and operating the persistent Supabase backend for the StockSense retail inventory and POS billing system.

---

## 1. Architecture Overview

StockSense operates a multi-tenant PostgreSQL backend secured by Supabase Row Level Security (RLS) and transaction functions:

- **Auth & Multi-Tenancy**: Store membership (`store_members`) links authenticated users to stores with roles (`owner`, `manager`, `cashier`).
- **Data Persistence**: 23 PostgreSQL tables with foreign keys, checks, and numeric money types (`numeric(12,2)`).
- **Atomic Concurrency**: Stored procedures guarantee serialized stock deduction, collision-free sequential invoice numbers, and idempotent replay.
- **Explainable Analytics**: Pure deterministic demand forecasting and reorder recommendations based on historical sales velocity.
- **Fail-Safe Operation**: If Supabase credentials are not configured, the frontend gracefully operates in high-fidelity local mode without crashing or data loss.

---

## 2. Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Set the following variables:

| Variable | Scope | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Public (Client) | Your Supabase project URL (e.g. `https://xyzcompany.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Public (Client) | Your Supabase anon public API key |
| `GEMINI_API_KEY` | Server / Edge | Optional: Google AI Studio key for AI insights |
| `APP_URL` | Server / Edge | Frontend origin (e.g. `http://localhost:3000`) |

> **Security Rule**: Never put `SUPABASE_SERVICE_ROLE_KEY` or database passwords in `VITE_` variables. All privileged operations in StockSense are executed through Postgres stored functions and RLS policies.

---

## 3. Database Schema Provisioning

StockSense provides version-controlled migrations in `supabase/migrations/`:

### Option A: Using the Supabase CLI (Recommended)
If you have the Supabase CLI installed:
```bash
supabase db push
# Or apply seed data
supabase db reset
```

### Option B: Using the Supabase SQL Editor
Open your project in the [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor**, and execute the migration files in numerical order:

1. `supabase/migrations/20261024000001_initial_schema.sql`  
   *Creates all 23 business tables, indexes, constraints, and audit logs.*
2. `supabase/migrations/20261024000002_row_level_security.sql`  
   *Enables RLS on all 23 tables with multi-tenant store isolation and Owner/Manager/Cashier roles.*
3. `supabase/migrations/20261024000003_checkout_and_transactions.sql`  
   *Deploys stored procedures: `perform_atomic_checkout`, `process_return_transaction`, `receive_purchase_order_receipt`, and `get_next_invoice_number`.*
4. `supabase/seed.sql`  
   *Seeds the default store (`00000000-0000-0000-0000-000000000001`), FMCG products, batches, customers, and suppliers.*

---

## 4. Multi-Tenant Role Permissions Matrix

| Feature | Cashier | Manager | Owner |
|---|:---:|:---:|:---:|
| POS Checkout & Bill Holding | ✅ | ✅ | ✅ |
| View Catalog & Stock Levels | ✅ | ✅ | ✅ |
| Product Catalog Add / Edit | ❌ | ✅ | ✅ |
| Product Catalog Delete | ❌ | ❌ | ✅ |
| Create Purchase Orders | ❌ | ✅ | ✅ |
| Receive PO Goods (Restock) | ❌ | ✅ | ✅ |
| Process Returns & Refunds | ❌ | ✅ | ✅ |
| Business Analytics & Reports | ❌ | ❌ | ✅ |
| Store Settings & Migration | ❌ | ❌ | ✅ |

*Note: You can switch roles at any time in the UI by clicking the Role badge in the top-right navigation bar to test permission enforcement.*

---

## 5. Local Browser Data Migration Wizard

If you have existing sales, products, or suppliers stored in browser LocalStorage:

1. Navigate to **Settings** in the StockSense sidebar.
2. Locate the **Supabase Backend & Data Migration** panel.
3. Review the **LocalStorage Records Available for Migration** preview table.
4. Click **Migrate to Supabase**.
5. Confirm the action in the modal.
6. The migration wizard uploads products, batches, suppliers, customers, and invoices transactionally into PostgreSQL. Your local browser copy is preserved.

---

## 6. Local Development & Verification

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Type Checking
```bash
npm run lint
```

### Run Automated Test Suite
```bash
npm test
```

### Build Production Bundle
```bash
npm run build
```

---

## 7. Production Deployment Instructions

### Deploy to Vercel
1. Connect your GitHub repository to Vercel.
2. Set Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
3. Build Command: `npm run build`
4. Output Directory: `dist`

### Deploy to Docker / Cloud Run
A standard Node or Nginx container can serve the static build output from `dist/`:
```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
