// src/services/billingService.ts
// Atomic Checkout execution via PostgreSQL RPC, held bills management, and idempotency control

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { CartItem, Invoice, Customer, PaymentMethod, HeldBill } from '../types';
import { StorageService } from './storageService';

export interface CheckoutParams {
  cartItems: CartItem[];
  subtotal: number;
  billDiscountPercent: number;
  billDiscountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  payment: {
    method: PaymentMethod;
    amountPaid: number;
    changeGiven: number;
    transactionRef?: string;
  };
  customer?: Customer | null;
  notes?: string;
  idempotencyKey?: string;
}

export class BillingService {
  /**
   * Executes atomic POS checkout via Supabase PostgreSQL transaction
   */
  static async checkoutSale(params: CheckoutParams): Promise<{
    success: boolean;
    invoice?: Invoice;
    error?: string;
    isIdempotentReplay?: boolean;
  }> {
    if (!params.cartItems || params.cartItems.length === 0) {
      return { success: false, error: 'Cannot checkout with an empty cart.' };
    }

    const storeId = AuthService.getActiveStoreId();
    const idempotencyKey = params.idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    if (!isSupabaseConfigured()) {
      return StorageService.checkoutSale(params);
    }

    try {
      // Map cart items for database function
      const dbCartItems = params.cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        discountAmount: item.discountAmount
      }));

      // Call atomic PostgreSQL checkout function
      const { data, error } = await supabase.rpc('perform_atomic_checkout', {
        p_store_id: storeId,
        p_cart_items: dbCartItems,
        p_subtotal: params.subtotal,
        p_discount_percent: params.billDiscountPercent,
        p_discount_amount: params.billDiscountAmount,
        p_tax_percent: params.taxPercent,
        p_tax_amount: params.taxAmount,
        p_grand_total: params.grandTotal,
        p_payment: {
          method: params.payment.method,
          amountPaid: params.payment.amountPaid,
          changeGiven: params.payment.changeGiven,
          transactionRef: params.payment.transactionRef || null,
          idempotencyKey
        },
        p_customer_id: params.customer?.id && !params.customer.id.startsWith('cust-') ? params.customer.id : null,
        p_notes: params.notes || null
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const invData = data?.invoice;
      const itemsData = data?.items || [];

      // Construct frontend Invoice
      const committedInvoice: Invoice = {
        id: invData.id,
        invoiceNumber: invData.invoice_number,
        createdAt: invData.created_at,
        customerId: invData.customer_id,
        customerName: params.customer?.name || 'Walk-in Customer',
        customerPhone: params.customer?.phone,
        items: itemsData.map((it: any) => ({
          productId: it.product_id,
          sku: it.sku_snapshot,
          barcode: '',
          name: it.product_name_snapshot,
          category: 'Food & Grains',
          unitPrice: Number(it.unit_price),
          purchasePrice: Number(it.unit_cost_snapshot),
          quantity: Number(it.quantity),
          returnedQuantity: Number(it.returned_quantity || 0),
          discountAmount: Number(it.discount_amount),
          lineTotal: Number(it.line_total)
        })),
        subtotal: Number(invData.subtotal),
        billDiscountPercent: params.billDiscountPercent,
        billDiscountAmount: Number(invData.discount_amount),
        taxPercent: params.taxPercent,
        taxAmount: Number(invData.tax_amount),
        grandTotal: Number(invData.total_amount),
        payment: {
          method: params.payment.method,
          amountPaid: params.payment.amountPaid,
          changeGiven: params.payment.changeGiven,
          transactionRef: params.payment.transactionRef,
          cashierName: AuthService.getCurrentUser()?.displayName || 'Cashier'
        },
        status: invData.status,
        notes: invData.notes,
        isDemo: false
      };

      // Also mirror to StorageService cache for instant responsiveness
      const existingInvoices = StorageService.getInvoices();
      StorageService.saveInvoices([committedInvoice, ...existingInvoices]);

      return {
        success: true,
        invoice: committedInvoice,
        isIdempotentReplay: data?.idempotent_replay || false
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Checkout failed due to network error.' };
    }
  }

  /**
   * Held Bills
   */
  static async getHeldBills(): Promise<HeldBill[]> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return StorageService.getHeldBills();
    }

    try {
      const { data, error } = await supabase
        .from('held_bills')
        .select('*')
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false });

      if (error || !data) return StorageService.getHeldBills();

      return data.map(d => ({
        id: d.id,
        heldAt: d.updated_at,
        cartItems: d.bill_data.cartItems || [],
        customerId: d.bill_data.customerId,
        customerName: d.bill_data.customerName,
        customerPhone: d.bill_data.customerPhone,
        billDiscountPercent: d.bill_data.billDiscountPercent || 0,
        note: d.bill_data.note
      }));
    } catch {
      return StorageService.getHeldBills();
    }
  }

  static async holdBill(heldBill: Omit<HeldBill, 'id' | 'heldAt'>): Promise<HeldBill> {
    const storeId = AuthService.getActiveStoreId();
    const user = AuthService.getCurrentUser();

    if (!isSupabaseConfigured()) {
      return StorageService.holdBill(heldBill);
    }

    try {
      const { data, error } = await supabase
        .from('held_bills')
        .insert({
          store_id: storeId,
          bill_data: heldBill,
          created_by: user?.id && !user.id.startsWith('demo-') ? user.id : null
        })
        .select()
        .single();

      if (error || !data) return StorageService.holdBill(heldBill);

      return {
        id: data.id,
        heldAt: data.updated_at,
        ...heldBill
      };
    } catch {
      return StorageService.holdBill(heldBill);
    }
  }

  static async removeHeldBill(id: string): Promise<void> {
    const storeId = AuthService.getActiveStoreId();

    StorageService.removeHeldBill(id);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('held_bills').delete().eq('id', id).eq('store_id', storeId);
      } catch (err) {
        console.error('Failed to delete held bill from remote:', err);
      }
    }
  }
}
