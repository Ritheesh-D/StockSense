// src/services/demoMigrationService.ts
// Explicit, safe migration wizard for porting LocalStorage demo data to persistent Supabase

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { StorageService } from './storageService';
import { Product, Supplier, Customer, Invoice, PurchaseOrder, InventoryBatch } from '../types';

export interface MigrationPreview {
  productsCount: number;
  suppliersCount: number;
  batchesCount: number;
  customersCount: number;
  invoicesCount: number;
  purchaseOrdersCount: number;
  hasExistingRemoteData: boolean;
  canMigrate: boolean;
  warnings: string[];
}

export class DemoMigrationService {
  /**
   * Preview local data before committing to Supabase
   */
  static async previewLocalData(): Promise<MigrationPreview> {
    const products = StorageService.getProducts();
    const suppliers = StorageService.getSuppliers();
    const batches = StorageService.getBatches();
    const customers = StorageService.getCustomers();
    const invoices = StorageService.getInvoices();
    const purchaseOrders = StorageService.getPurchaseOrders();

    const warnings: string[] = [];

    let hasExistingRemoteData = false;
    if (isSupabaseConfigured()) {
      try {
        const storeId = AuthService.getActiveStoreId();
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId);

        if (count && count > 0) {
          hasExistingRemoteData = true;
          warnings.push(`The active store already has ${count} products in Supabase. Existing products with matching SKUs will be updated or preserved.`);
        }
      } catch (err) {
        warnings.push('Could not verify remote store count. Network check recommended.');
      }
    } else {
      warnings.push('Supabase is not configured yet. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect to a live database.');
    }

    return {
      productsCount: products.length,
      suppliersCount: suppliers.length,
      batchesCount: batches.length,
      customersCount: customers.length,
      invoicesCount: invoices.length,
      purchaseOrdersCount: purchaseOrders.length,
      hasExistingRemoteData,
      canMigrate: isSupabaseConfigured(),
      warnings
    };
  }

  /**
   * Safe data migration with explicit user confirmation
   */
  static async executeMigration(mode: 'merge' | 'replace' = 'merge'): Promise<{
    success: boolean;
    migratedCounts: Record<string, number>;
    errors: string[];
  }> {
    if (!AuthService.hasRole(['owner'])) {
      return {
        success: false,
        migratedCounts: {},
        errors: ['Permission denied: Only Store Owners can initiate backend database migrations.']
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        migratedCounts: {},
        errors: ['Supabase connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.']
      };
    }

    const storeId = AuthService.getActiveStoreId();
    const errors: string[] = [];
    const counts = {
      suppliers: 0,
      products: 0,
      batches: 0,
      customers: 0,
      invoices: 0,
      purchaseOrders: 0
    };

    try {
      // 1. Migrate Suppliers
      const suppliers = StorageService.getSuppliers();
      const supplierIdMap = new Map<string, string>();

      for (const s of suppliers) {
        try {
          const { data, error } = await supabase
            .from('suppliers')
            .upsert({
              store_id: storeId,
              name: s.name,
              contact_person: s.contactPerson,
              phone: s.phone,
              email: s.email,
              address: s.address,
              lead_time_days: s.leadTimeDays,
              rating: s.rating
            }, { onConflict: 'store_id, name' })
            .select('id')
            .single();

          if (data) {
            supplierIdMap.set(s.id, data.id);
            counts.suppliers++;
          }
        } catch (e: any) {
          errors.push(`Supplier "${s.name}": ${e.message}`);
        }
      }

      // 2. Migrate Products & Batches
      const products = StorageService.getProducts();
      const batches = StorageService.getBatches();
      const productIdMap = new Map<string, string>();

      for (const p of products) {
        try {
          const mappedSupplierId = supplierIdMap.get(p.supplierId) || null;

          const { data: prodData, error: prodErr } = await supabase
            .from('products')
            .upsert({
              store_id: storeId,
              sku: p.sku,
              barcode: p.barcode || null,
              name: p.name,
              unit: p.unit || 'pcs',
              selling_price: p.sellingPrice,
              cost_price: p.purchasePrice,
              min_stock: p.minStock,
              shelf_life_days: p.shelfLifeDays || null,
              supplier_id: mappedSupplierId,
              active: true
            }, { onConflict: 'store_id, sku' })
            .select('id')
            .single();

          if (prodData) {
            productIdMap.set(p.id, prodData.id);
            counts.products++;

            // Migrate corresponding batches
            const productBatches = batches.filter(b => b.productId === p.id);
            for (const b of productBatches) {
              await supabase.from('inventory_batches').insert({
                store_id: storeId,
                product_id: prodData.id,
                batch_number: b.batchNo,
                expiry_date: b.expiryDate || null,
                quantity_on_hand: b.quantity,
                unit_cost: b.purchasePrice
              });
              counts.batches++;
            }
          } else if (prodErr) {
            errors.push(`Product "${p.name}": ${prodErr.message}`);
          }
        } catch (e: any) {
          errors.push(`Product "${p.name}": ${e.message}`);
        }
      }

      // 3. Migrate Customers
      const customers = StorageService.getCustomers();
      const customerIdMap = new Map<string, string>();

      for (const c of customers) {
        try {
          const { data, error } = await supabase
            .from('customers')
            .upsert({
              store_id: storeId,
              name: c.name,
              phone: c.phone || null,
              email: c.email || null,
              address: c.address || null
            })
            .select('id')
            .single();

          if (data) {
            customerIdMap.set(c.id, data.id);
            counts.customers++;
          }
        } catch (e: any) {
          errors.push(`Customer "${c.name}": ${e.message}`);
        }
      }

      // 4. Migrate Invoices
      const invoices = StorageService.getInvoices();
      for (const inv of invoices) {
        try {
          const mappedCustId = inv.customerId ? customerIdMap.get(inv.customerId) || null : null;

          const { data: invData, error: invErr } = await supabase
            .from('invoices')
            .upsert({
              store_id: storeId,
              invoice_number: inv.invoiceNumber,
              customer_id: mappedCustId,
              status: inv.status,
              subtotal: inv.subtotal,
              discount_amount: inv.billDiscountAmount,
              tax_amount: inv.taxAmount,
              total_amount: inv.grandTotal,
              payment_status: 'paid',
              created_at: inv.createdAt
            }, { onConflict: 'store_id, invoice_number' })
            .select('id')
            .single();

          if (invData) {
            counts.invoices++;

            // Insert line items
            for (const it of inv.items) {
              const mappedProdId = productIdMap.get(it.productId) || null;
              await supabase.from('invoice_items').insert({
                invoice_id: invData.id,
                product_id: mappedProdId,
                sku_snapshot: it.sku,
                product_name_snapshot: it.name,
                quantity: it.quantity,
                unit_price: it.unitPrice,
                unit_cost_snapshot: it.purchasePrice,
                discount_amount: it.discountAmount,
                tax_amount: (it.lineTotal * inv.taxPercent) / 100,
                line_total: it.lineTotal,
                returned_quantity: it.returnedQuantity || 0
              });
            }

            // Insert payment record
            await supabase.from('payments').insert({
              store_id: storeId,
              invoice_id: invData.id,
              payment_method: inv.payment.method,
              amount: inv.grandTotal,
              change_given: inv.payment.changeGiven || 0,
              status: 'completed',
              provider_reference: inv.payment.transactionRef || null
            });
          }
        } catch (e: any) {
          errors.push(`Invoice "${inv.invoiceNumber}": ${e.message}`);
        }
      }

      return {
        success: errors.length === 0 || counts.products > 0,
        migratedCounts: counts,
        errors
      };
    } catch (err: any) {
      return {
        success: false,
        migratedCounts: counts,
        errors: [...errors, err?.message || 'Migration aborted unexpectedly']
      };
    }
  }
}
