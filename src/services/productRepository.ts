// src/services/productRepository.ts
// Product and Category persistence operations with store-isolation and role checks

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { Product, ProductCategory } from '../types';
import { StorageService } from './storageService';

export class ProductRepository {
  /**
   * Fetch all products for the active store including aggregated stock from inventory batches
   */
  static async getProducts(): Promise<{ data: Product[]; error: string | null }> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return { data: StorageService.getProducts(), error: null };
    }

    try {
      // Fetch products and their batches
      const { data: dbProducts, error: prodError } = await supabase
        .from('products')
        .select(`
          id,
          sku,
          barcode,
          name,
          unit,
          selling_price,
          cost_price,
          min_stock,
          shelf_life_days,
          active,
          image_url,
          supplier_id,
          categories(name),
          inventory_batches(quantity_on_hand)
        `)
        .eq('store_id', storeId)
        .order('name');

      if (prodError) {
        return { data: [], error: prodError.message };
      }

      // Map to frontend Product model
      const mapped: Product[] = (dbProducts || []).map((p: any) => {
        const totalBatchStock = (p.inventory_batches || []).reduce(
          (sum: number, b: any) => sum + Number(b.quantity_on_hand || 0),
          0
        );

        return {
          id: p.id,
          sku: p.sku,
          barcode: p.barcode || '',
          name: p.name,
          category: (p.categories?.name as ProductCategory) || 'Food & Grains',
          purchasePrice: Number(p.cost_price),
          sellingPrice: Number(p.selling_price),
          stock: totalBatchStock,
          minStock: Number(p.min_stock),
          unit: p.unit || 'pcs',
          imageUrl: p.image_url || undefined,
          supplierId: p.supplier_id || '',
          shelfLifeDays: p.shelf_life_days || undefined
        };
      });

      return { data: mapped, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch products' };
    }
  }

  /**
   * Add a new product (Manager or Owner role required)
   */
  static async createProduct(product: Omit<Product, 'id'>): Promise<{ data: Product | null; error: string | null }> {
    if (!AuthService.hasRole(['owner', 'manager'])) {
      return { data: null, error: 'Permission denied: Only Managers and Owners can add products.' };
    }

    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      const newProd: Product = { ...product, id: `prod-${Date.now()}` };
      StorageService.updateProduct(newProd);
      return { data: newProd, error: null };
    }

    try {
      // Find or create category
      let categoryId: string | null = null;
      if (product.category) {
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .eq('store_id', storeId)
          .eq('name', product.category)
          .maybeSingle();

        if (catData) {
          categoryId = catData.id;
        } else {
          const { data: newCat } = await supabase
            .from('categories')
            .insert({ store_id: storeId, name: product.category })
            .select('id')
            .single();
          categoryId = newCat?.id || null;
        }
      }

      // Insert product
      const { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert({
          store_id: storeId,
          sku: product.sku,
          barcode: product.barcode || null,
          name: product.name,
          category_id: categoryId,
          supplier_id: product.supplierId || null,
          unit: product.unit || 'pcs',
          selling_price: product.sellingPrice,
          cost_price: product.purchasePrice,
          min_stock: product.minStock,
          shelf_life_days: product.shelfLifeDays || null,
          active: true
        })
        .select()
        .single();

      if (prodErr) {
        return { data: null, error: prodErr.message };
      }

      // If initial stock was provided, create an initial inventory batch
      if (product.stock > 0) {
        await supabase.from('inventory_batches').insert({
          store_id: storeId,
          product_id: newProd.id,
          batch_number: 'INIT-' + new Date().toISOString().split('T')[0],
          quantity_on_hand: product.stock,
          unit_cost: product.purchasePrice,
          expiry_date: product.shelfLifeDays
            ? new Date(Date.now() + product.shelfLifeDays * 86400000).toISOString().split('T')[0]
            : null
        });
      }

      const created: Product = {
        ...product,
        id: newProd.id
      };

      return { data: created, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Error inserting product' };
    }
  }

  /**
   * Update an existing product
   */
  static async updateProduct(product: Product): Promise<{ data: Product | null; error: string | null }> {
    if (!AuthService.hasRole(['owner', 'manager'])) {
      return { data: null, error: 'Permission denied: Only Managers and Owners can update products.' };
    }

    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      StorageService.updateProduct(product);
      return { data: product, error: null };
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          sku: product.sku,
          barcode: product.barcode || null,
          name: product.name,
          unit: product.unit,
          selling_price: product.sellingPrice,
          cost_price: product.purchasePrice,
          min_stock: product.minStock,
          shelf_life_days: product.shelfLifeDays || null,
          supplier_id: product.supplierId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)
        .eq('store_id', storeId);

      if (error) return { data: null, error: error.message };

      return { data: product, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to update product' };
    }
  }

  /**
   * Delete product (Owner only)
   */
  static async deleteProduct(id: string): Promise<{ success: boolean; error: string | null }> {
    if (!AuthService.hasRole(['owner'])) {
      return { success: false, error: 'Permission denied: Only Store Owners can delete products.' };
    }

    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      StorageService.deleteProduct(id);
      return { success: true, error: null };
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('store_id', storeId);

      if (error) return { success: false, error: error.message };

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete product' };
    }
  }
}
