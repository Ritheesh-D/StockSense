// src/services/supplierRepository.ts
// Supplier directory management with role-based write authorization

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { Supplier } from '../types';
import { StorageService } from './storageService';

export class SupplierRepository {
  static async getSuppliers(): Promise<{ data: Supplier[]; error: string | null }> {
    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      return { data: StorageService.getSuppliers(), error: null };
    }

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          id,
          name,
          contact_person,
          phone,
          email,
          address,
          lead_time_days,
          rating,
          products(count)
        `)
        .eq('store_id', storeId)
        .order('name');

      if (error) return { data: [], error: error.message };

      const mapped: Supplier[] = (data || []).map(s => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contact_person || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        leadTimeDays: s.lead_time_days || 3,
        productCount: (s.products as any)?.[0]?.count || 0,
        rating: Number(s.rating || 4.5)
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Failed to fetch suppliers' };
    }
  }

  static async saveSupplier(supplier: Supplier): Promise<{ data: Supplier | null; error: string | null }> {
    if (!AuthService.hasRole(['owner', 'manager'])) {
      return { data: null, error: 'Permission denied: Only Managers and Owners can manage suppliers.' };
    }

    const storeId = AuthService.getActiveStoreId();

    if (!isSupabaseConfigured()) {
      const current = StorageService.getSuppliers();
      const idx = current.findIndex(s => s.id === supplier.id);
      if (idx >= 0) current[idx] = supplier;
      else current.push(supplier);
      StorageService.saveSuppliers(current);
      return { data: supplier, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .upsert({
          id: supplier.id.startsWith('sup-') ? undefined : supplier.id,
          store_id: storeId,
          name: supplier.name,
          contact_person: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          lead_time_days: supplier.leadTimeDays,
          rating: supplier.rating,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };

      return { data: { ...supplier, id: data.id }, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Failed to save supplier' };
    }
  }
}
