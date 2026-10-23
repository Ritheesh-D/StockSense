// src/services/returnsService.ts
// Return processing via PostgreSQL transaction with sellable/damaged batch reconciliation

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { ReturnRecord, PaymentMethod } from '../types';
import { StorageService } from './storageService';

export interface ProcessReturnParams {
  invoiceId: string;
  itemsToReturn: {
    productId: string;
    quantity: number;
    condition: 'sellable' | 'damaged';
  }[];
  refundMethod: PaymentMethod;
  reason: string;
  cashierName?: string;
}

export class ReturnsService {
  /**
   * Process a refund/return transactionally
   */
  static async processReturn(params: ProcessReturnParams): Promise<{
    success: boolean;
    returnRecord?: ReturnRecord;
    error?: string;
  }> {
    if (!AuthService.hasRole(['owner', 'manager'])) {
      return { success: false, error: 'Permission denied: Only Store Managers and Owners can authorize returns and refunds.' };
    }

    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return StorageService.processReturn(params);
    }

    try {
      const { data, error } = await supabase.rpc('process_return_transaction', {
        p_store_id: storeId,
        p_invoice_id: params.invoiceId,
        p_items_to_return: params.itemsToReturn,
        p_refund_method: params.refundMethod,
        p_reason: params.reason,
        p_cashier_name: params.cashierName || AuthService.getCurrentUser()?.displayName
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const returnRecord: ReturnRecord = {
        id: data.return_id,
        invoiceId: params.invoiceId,
        invoiceNumber: 'INV-RETURNED',
        timestamp: new Date().toISOString(),
        items: params.itemsToReturn.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          refundAmount: 0,
          condition: it.condition
        })),
        totalRefund: Number(data.total_refund),
        refundMethod: params.refundMethod,
        reason: params.reason,
        cashierName: params.cashierName || AuthService.getCurrentUser()?.displayName
      };

      return { success: true, returnRecord };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Return processing failed due to network error.' };
    }
  }

  /**
   * Fetch all returns for the store
   */
  static async getReturns(): Promise<{ data: ReturnRecord[]; error: string | null }> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return { data: StorageService.getReturns(), error: null };
    }

    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          id,
          invoice_id,
          reason,
          refund_amount,
          status,
          refund_method,
          created_at,
          invoices(invoice_number),
          return_items(
            product_id,
            quantity,
            restock_quantity,
            damaged_quantity,
            refund_amount
          )
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) return { data: [], error: error.message };

      const mapped: ReturnRecord[] = (data || []).map(r => ({
        id: r.id,
        invoiceId: r.invoice_id,
        invoiceNumber: (r.invoices as any)?.invoice_number || 'INV',
        timestamp: r.created_at,
        items: (r.return_items || []).map((it: any) => ({
          productId: it.product_id,
          quantity: Number(it.quantity),
          refundAmount: Number(it.refund_amount),
          condition: it.restock_quantity > 0 ? 'sellable' : 'damaged'
        })),
        totalRefund: Number(r.refund_amount),
        refundMethod: r.refund_method as PaymentMethod,
        reason: r.reason
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch returns' };
    }
  }
}
