// src/services/salesRepository.ts
// Invoices, line items, payments history, and transaction ledger access

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { Invoice, InvoiceLineItem } from '../types';
import { StorageService } from './storageService';

export class SalesRepository {
  /**
   * Fetch invoices for active store with pagination and date filter
   */
  static async getInvoices(options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: Invoice[]; error: string | null }> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      let invoices = StorageService.getInvoices();
      if (options?.startDate) {
        invoices = invoices.filter(inv => inv.createdAt >= (options.startDate as string));
      }
      if (options?.endDate) {
        invoices = invoices.filter(inv => inv.createdAt <= (options.endDate as string));
      }
      return { data: invoices, error: null };
    }

    try {
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          customer_id,
          status,
          subtotal,
          discount_amount,
          tax_amount,
          total_amount,
          payment_status,
          notes,
          created_at,
          customers(name, phone),
          invoice_items(
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
          ),
          payments(payment_method, amount, change_given, provider_reference)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) return { data: [], error: error.message };

      const mapped: Invoice[] = (data || []).map(inv => {
        const primaryPayment = (inv.payments && inv.payments[0]) || {
          payment_method: 'cash',
          amount: inv.total_amount,
          change_given: 0
        };

        const items: InvoiceLineItem[] = (inv.invoice_items || []).map((it: any) => ({
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
        }));

        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          createdAt: inv.created_at,
          customerId: inv.customer_id,
          customerName: (inv.customers as any)?.name || 'Walk-in Customer',
          customerPhone: (inv.customers as any)?.phone,
          items,
          subtotal: Number(inv.subtotal),
          billDiscountPercent: 0,
          billDiscountAmount: Number(inv.discount_amount),
          taxPercent: 5,
          taxAmount: Number(inv.tax_amount),
          grandTotal: Number(inv.total_amount),
          payment: {
            method: primaryPayment.payment_method,
            amountPaid: Number(primaryPayment.amount),
            changeGiven: Number(primaryPayment.change_given || 0),
            transactionRef: primaryPayment.provider_reference || undefined
          },
          status: inv.status,
          notes: inv.notes || undefined,
          isDemo: false
        };
      });

      return { data: mapped, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch invoices' };
    }
  }

  /**
   * Fetch historical daily sales for forecasting
   */
  static async getProductSalesTransactions(days = 30): Promise<{
    data: Array<{ productId: string; quantity: number; transactionDate: string }>;
    error: string | null;
  }> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      const invoices = StorageService.getInvoices();
      const result: Array<{ productId: string; quantity: number; transactionDate: string }> = [];
      invoices.forEach(inv => {
        if (inv.status !== 'cancelled') {
          inv.items.forEach(it => {
            result.push({
              productId: it.productId,
              quantity: it.quantity - (it.returnedQuantity || 0),
              transactionDate: inv.createdAt
            });
          });
        }
      });
      return { data: result, error: null };
    }

    try {
      const sinceDate = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from('sales_transactions')
        .select('product_id, quantity, transaction_date')
        .eq('store_id', storeId)
        .gte('transaction_date', sinceDate);

      if (error) return { data: [], error: error.message };

      const mapped = (data || []).map(d => ({
        productId: d.product_id,
        quantity: Number(d.quantity),
        transactionDate: d.transaction_date
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch sales transactions' };
    }
  }
}
