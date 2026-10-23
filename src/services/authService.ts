// src/services/authService.ts
// Supabase Authentication, Session Management, Multi-Tenant Store Context & Roles

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserRole, DatabaseStore } from '../types/database';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  storeId: string;
  storeName: string;
}

const DEFAULT_DEMO_STORE_ID = '00000000-0000-0000-0000-000000000001';
const STORE_ID_KEY = 'stocksense_active_store_id';
const LOCAL_AUTH_USER_KEY = 'stocksense_auth_user_v2';

const memStore = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return memStore.get(key) || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, value);
    }
  } catch {}
  memStore.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem(key);
    }
  } catch {}
  memStore.delete(key);
}

export class AuthService {
  private static activeStoreId: string = safeGetItem(STORE_ID_KEY) || DEFAULT_DEMO_STORE_ID;
  private static currentUser: AuthUser | null = (() => {
    try {
      const saved = safeGetItem(LOCAL_AUTH_USER_KEY);
      return saved ? JSON.parse(saved) : {
        id: 'user-owner-001',
        email: 'owner@stocksense.in',
        displayName: 'Rajesh Sharma (Owner)',
        role: 'owner' as UserRole,
        storeId: DEFAULT_DEMO_STORE_ID,
        storeName: 'StockSense Retail Mart'
      };
    } catch {
      return null;
    }
  })();

  static getActiveStoreId(): string {
    return this.activeStoreId;
  }

  static setActiveStoreId(storeId: string): void {
    this.activeStoreId = storeId;
    safeSetItem(STORE_ID_KEY, storeId);
    if (this.currentUser) {
      this.currentUser.storeId = storeId;
      safeSetItem(LOCAL_AUTH_USER_KEY, JSON.stringify(this.currentUser));
    }
  }

  static getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  static getCurrentRole(): UserRole {
    return this.currentUser?.role || 'cashier';
  }

  static hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.getCurrentRole();
    return allowedRoles.includes(role);
  }

  /**
   * Supabase Auth: Sign In with Email & Password
   */
  static async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      // Local dev simulated sign in based on role keyword
      let role: UserRole = 'cashier';
      let displayName = 'Cashier User';
      if (email.includes('owner') || email.includes('admin')) {
        role = 'owner';
        displayName = 'Rajesh Sharma (Owner)';
      } else if (email.includes('manager')) {
        role = 'manager';
        displayName = 'Anita Rao (Manager)';
      } else {
        role = 'cashier';
        displayName = 'Kiran Deshmukh (Cashier)';
      }

      const user: AuthUser = {
        id: `usr-${Date.now()}`,
        email,
        displayName,
        role,
        storeId: this.activeStoreId,
        storeName: 'StockSense Retail Mart'
      };

      this.currentUser = user;
      safeSetItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));
      return { user, error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { user: null, error: error.message };

      if (!data.user) return { user: null, error: 'No user returned from Supabase Auth' };

      // Fetch user profile and store membership
      const { data: memberData } = await supabase
        .from('store_members')
        .select('role, store_id, stores(name)')
        .eq('user_id', data.user.id)
        .limit(1)
        .single();

      const userRole = (memberData?.role as UserRole) || 'cashier';
      const storeId = memberData?.store_id || this.activeStoreId;
      const storeName = (memberData?.stores as any)?.name || 'StockSense Store';

      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email || email,
        displayName: data.user.user_metadata?.display_name || email.split('@')[0],
        role: userRole,
        storeId,
        storeName
      };

      this.currentUser = user;
      this.setActiveStoreId(storeId);
      safeSetItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));

      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Authentication failed' };
    }
  }

  /**
   * Supabase Auth: Sign Up with Email & Password
   */
  static async signUp(email: string, password: string, displayName: string, role: UserRole = 'cashier'): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      const user: AuthUser = {
        id: `usr-${Date.now()}`,
        email,
        displayName,
        role,
        storeId: this.activeStoreId,
        storeName: 'StockSense Retail Mart'
      };
      this.currentUser = user;
      safeSetItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));
      return { user, error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName }
        }
      });

      if (error) return { user: null, error: error.message };
      if (!data.user) return { user: null, error: 'Failed to create user' };

      // Insert profile and membership
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        display_name: displayName
      });

      await supabase.from('store_members').upsert({
        store_id: this.activeStoreId,
        user_id: data.user.id,
        role
      });

      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email || email,
        displayName,
        role,
        storeId: this.activeStoreId,
        storeName: 'StockSense Store'
      };

      this.currentUser = user;
      safeSetItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));
      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Sign up failed' };
    }
  }

  /**
   * Quick Role Switcher (For local testing & evaluating Owner, Manager, Cashier capabilities)
   */
  static switchDemoRole(role: UserRole): AuthUser {
    const names = {
      owner: 'Rajesh Sharma (Owner)',
      manager: 'Anita Rao (Manager)',
      cashier: 'Kiran Deshmukh (Cashier)'
    };

    const user: AuthUser = {
      id: `demo-${role}`,
      email: `${role}@stocksense.in`,
      displayName: names[role],
      role,
      storeId: this.activeStoreId,
      storeName: 'StockSense Retail Mart'
    };

    this.currentUser = user;
    safeSetItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));
    return user;
  }

  /**
   * Sign Out
   */
  static async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    this.currentUser = null;
    safeRemoveItem(LOCAL_AUTH_USER_KEY);
  }

  /**
   * Listen to Auth state changes
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (!isSupabaseConfigured()) {
      return () => {};
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: memberData } = await supabase
          .from('store_members')
          .select('role, store_id, stores(name)')
          .eq('user_id', session.user.id)
          .limit(1)
          .single();

        const role = (memberData?.role as UserRole) || 'cashier';
        const storeId = memberData?.store_id || this.activeStoreId;
        const storeName = (memberData?.stores as any)?.name || 'StockSense Store';

        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          role,
          storeId,
          storeName
        };

        this.currentUser = user;
        this.setActiveStoreId(storeId);
        callback(user);
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        callback(null);
      }
    });

    return () => subscription.unsubscribe();
  }
}
