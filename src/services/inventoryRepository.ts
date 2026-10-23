// src/services/inventoryRepository.ts
// Inventory batches, stock adjustments, movements ledger, and valuation

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { InventoryBatch } from '../types';
import { StorageService } from './storageService';

export class InventoryRepository {
  /**
   * Fetch all inventory batches with calculated expiry status
   */
  static async getBatches(): Promise<{ data: InventoryBatch[]; error: string | null }> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return { data: StorageService.getBatches(), error: null };
    }

    try {
      const { data, error } = await supabase
        .from('inventory_batches')
        .select('*')
        .eq('store_id', storeId)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      if (error) return { data: [], error: error.message };

      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 86400000);

      const mapped: InventoryBatch[] = (data || []).map(b => {
        let status: 'normal' | 'expiring_soon' | 'expired' = 'normal';
        if (b.expiry_date) {
          const exp = new Date(b.expiry_date);
          if (exp < today) {
            status = 'expired';
          } else if (exp <= in30Days) {
            status = 'expiring_soon';
          }
        }

        return {
          id: b.id,
          productId: b.product_id,
          batchNo: b.batch_number,
          quantity: Number(b.quantity_on_hand),
          expiryDate: b.expiry_date || '',
          purchaseDate: b.received_at ? b.received_at.split('T')[0] : '',
          purchasePrice: Number(b.unit_cost),
          status
        };
      });

      return { data: mapped, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch inventory batches' };
    }
  }

  /**
   * Adjust stock manually (Managers and Owners only)
   */
  static async adjustStock(params: {
    productId: string;
    batchId?: string;
    quantityChange: number;
    reason: string;
  }): Promise<{ success: boolean; error: string | null }> {
    if (!AuthService.hasRole(['owner', 'manager'])) {
      return { success: false, error: 'Permission denied: Only Managers and Owners can adjust stock.' };
    }

    const storeId = AuthService.getActiveStoreId();
    const user = AuthService.getCurrentUser();

    if (!isSupabaseConfigured()) {
      const products = StorageService.getProducts();
      const prod = products.find(p => p.id === params.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock + params.quantityChange);
        StorageService.saveProducts(products);
      }
      StorageService.logActivity({
        type: 'stock_adjustment',
        description: `Manual adjustment for ${prod?.name || params.productId}: ${params.quantityChange > 0 ? '+' : ''}${params.quantityChange} units (${params.reason})`,
        user: user?.displayName || 'Manager'
      });
      return { success: true, error: null };
    }

    try {
      const movementType = params.quantityChange > 0 ? 'adjustment_add' : 'adjustment_sub';

      // If batch specified, update batch quantity
      if (params.batchId) {
        const { data: batch } = await supabase
          .from('inventory_batches')
          .select('quantity_on_hand')
          .eq('id', params.batchId)
          .eq('store_id', storeId)
          .single();

        if (batch) {
          const newQty = Math.max(0, Number(batch.quantity_on_hand) + params.quantityChange);
          await supabase
            .from('inventory_batches')
            .update({ quantity_on_hand: newQty })
            .eq('id', params.batchId);
        }
      }

      // Record movement in audit ledger
      await supabase.from('inventory_movements').insert({
        store_id: storeId,
        product_id: params.productId,
        batch_id: params.batchId || null,
        movement_type: movementType,
        quantity_change: params.quantityChange,
        reference_type: 'manual_adjustment',
        created_by: user?.id && !user.id.startsWith('demo-') ? user.id : null
      });

      // Log in audit table
      await supabase.from('audit_logs').insert({
        store_id: storeId,
        action: 'stock_adjustment',
        entity_type: 'product',
        entity_id: params.productId,
        details: {
          change: params.quantityChange,
          reason: params.reason,
          batchId: params.batchId
        }
      });

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Stock adjustment failed' };
    }
  }

  /**
   * Fetch inventory movements ledger
   */
  static async getMovements(limit = 50): Promise<{ data: any[]; error: string | null }> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return { data: StorageService.getActivityLogs(), error: null };
    }

    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          movement_type,
          quantity_change,
          reference_type,
          created_at,
          products(name, sku),
          inventory_batches(batch_number)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return { data: [], error: error.message };
      return { data: data || [], error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch inventory movements' };
    }
  }
}
