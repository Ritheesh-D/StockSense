// src/services/supabaseClient.ts
// Official Supabase JS Client initialization and connection state verification

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (SUPABASE_URL.includes('your-project-ref') || SUPABASE_ANON_KEY.includes('your-anon-public-api-key')) {
    return false;
  }
  try {
    const parsed = new URL(SUPABASE_URL);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Fallback dummy URL to prevent createClient throw if env vars are missing
const safeUrl = isSupabaseConfigured() ? SUPABASE_URL : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured() ? SUPABASE_ANON_KEY : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export interface ConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  storeCount?: number;
  latencyMs?: number;
  error?: string;
}

export async function testSupabaseConnection(): Promise<ConnectionStatus> {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      isConnected: false,
      error: 'Supabase credentials are not configured in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).'
    };
  }

  const startTime = performance.now();
  try {
    const { data, error } = await supabase.from('stores').select('id, name').limit(5);
    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      return {
        isConfigured: true,
        isConnected: false,
        latencyMs,
        error: error.message
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      storeCount: data?.length || 0,
      latencyMs
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      error: err?.message || 'Network error communicating with Supabase'
    };
  }
}
