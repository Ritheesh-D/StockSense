// src/services/purchaseOrderService.ts
// Purchase orders lifecycle, items tracking, and atomic partial/full receiving RPC

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../types';
import { StorageService } from './storageService';

export class PurchaseOrderService {
  /**
   * Fetch all purchase orders for active store
   */
  static async getPurchaseOrders(): Promise<{ data: PurchaseOrder[]; error: string | null }> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return { data: StorageService.getPurchaseOrders(), error: null };
    }

    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          order_number,
          supplier_id,
          status,
          expected_delivery_date,
          subtotal,
          notes,
          created_at,
          suppliers(name),
          purchase_order_items(
            id,
            product_id,
            ordered_quantity,
            received_quantity,
            unit_cost,
            products(name, sku)
          )
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) return { data: [], error: error.message };

      const mapped: PurchaseOrder[] = (data || []).map(po => {
        const items: PurchaseOrderItem[] = (po.purchase_order_items || []).map((it: any) => ({
          productId: it.product_id,
          productName: (it.products as any)?.name || 'Product',
          sku: (it.products as any)?.sku || '',
          quantity: Number(it.ordered_quantity),
          unitCost: Number(it.unit_cost),
          totalCost: Number(it.ordered_quantity) * Number(it.unit_cost)
        }));

        return {
          id: po.id,
          orderNumber: po.order_number,
          supplierId: po.supplier_id || '',
          supplierName: (po.suppliers as any)?.name || 'Supplier',
          orderDate: po.created_at ? po.created_at.split('T')[0] : '',
          expectedDate: po.expected_delivery_date || '',
          status: po.status as PurchaseOrderStatus,
          items,
          totalAmount: Number(po.subtotal),
          notes: po.notes || undefined
        };
      });

      return { data: mapped, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch purchase orders' };
    }
  }

  /**
   * Create a new purchase order (Manager or Owner role required)
   */
  static async createPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<{
    data: PurchaseOrder | null;
    error: string | null;
  }> {
    if (!AuthService.hasRole(['owner', 'manager'])) {
      return { data: null, error: 'Permission denied: Only Managers and Owners can create purchase orders.' };
    }

    const storeId = AuthService.getActiveStoreId();
    const user = AuthService.getCurrentUser();

    if (!isSupabaseConfigured()) {
      const current = StorageService.getPurchaseOrders();
      const newPo: PurchaseOrder = {
        ...po,
        id: `po-${Date.now()}`
      };
      current.unshift(newPo);
      StorageService.savePurchaseOrders(current);
      return { data: newPo, error: null };
    }

    try {
      // Insert purchase order
      const { data: newPo, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          store_id: storeId,
          supplier_id: po.supplierId && !po.supplierId.startsWith('sup-') ? po.supplierId : null,
          order_number: po.orderNumber,
          status: po.status || 'pending',
          expected_delivery_date: po.expectedDate || null,
          subtotal: po.totalAmount,
          notes: po.notes || null,
          created_by: user?.id && !user.id.startsWith('demo-') ? user.id : null
        })
        .select()
        .single();

      if (poErr) return { data: null, error: poErr.message };

      // Insert line items
      const poItems = po.items.map(it => ({
        purchase_order_id: newPo.id,
        product_id: it.productId,
        ordered_quantity: it.quantity,
        received_quantity: 0,
        unit_cost: it.unitCost
      }));

      await supabase.from('purchase_order_items').insert(poItems);

      return {
        data: {
          ...po,
          id: newPo.id
        },
        error: null
      };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to create purchase order' };
    }
  }

  /**
   * Receive purchase order goods transactionally (Partial or Full)
   */
  static async receivePurchaseOrder(params: {
    orderId: string;
    receivedItems?: Array<{
      poItemId?: string;
      productId?: string;
      quantityReceived: number;
      batchNumber?: string;
      expiryDate?: string;
      unitCost?: number;
    }>;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    if (!AuthService.hasRole(['owner', 'manager'])) {
      return { success: false, message: '', error: 'Permission denied: Only Managers and Owners can receive purchase orders.' };
    }

    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return StorageService.receivePurchaseOrder(params.orderId);
    }

    try {
      // If receivedItems not provided explicitly, fetch po items to receive all remaining
      let itemsToReceive = params.receivedItems;
      if (!itemsToReceive || itemsToReceive.length === 0) {
        const { data: poItems } = await supabase
          .from('purchase_order_items')
          .select('id, product_id, ordered_quantity, received_quantity, unit_cost')
          .eq('purchase_order_id', params.orderId);

        itemsToReceive = (poItems || []).map(p => ({
          poItemId: p.id,
          quantityReceived: Math.max(0, Number(p.ordered_quantity) - Number(p.received_quantity)),
          unitCost: Number(p.unit_cost)
        })).filter(it => it.quantityReceived > 0);
      }

      const idempotencyKey = params.idempotencyKey || `po-rcpt-${params.orderId}-${Date.now()}`;

      const { data, error } = await supabase.rpc('receive_purchase_order_receipt', {
        p_store_id: storeId,
        p_purchase_order_id: params.orderId,
        p_received_items: itemsToReceive,
        p_idempotency_key: idempotencyKey
      });

      if (error) {
        return { success: false, message: '', error: error.message };
      }

      return {
        success: true,
        message: data?.message || 'Purchase order received successfully. Batches updated.'
      };
    } catch (err: any) {
      return { success: false, message: '', error: err?.message || 'PO receiving failed due to network error.' };
    }
  }
}
