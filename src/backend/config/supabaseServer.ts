import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export type DatabaseAuthMode = 'SERVICE_ROLE' | 'PUBLISHABLE' | 'NONE';

export const getDatabaseAuthMode = (): DatabaseAuthMode => {
  if (supabaseServiceKey) return 'SERVICE_ROLE';
  if (supabaseAnonKey) return 'PUBLISHABLE';
  return 'NONE';
};

/**
 * Dedicated Server-Side Supabase Client (Runs on server only)
 */
export const getSupabaseServerClient = (): SupabaseClient | null => {
  if (!supabaseUrl) {
    console.error('[Supabase Server] ERROR: NEXT_PUBLIC_SUPABASE_URL is missing.');
    return null;
  }

  const effectiveKey = supabaseServiceKey || supabaseAnonKey;
  if (!effectiveKey) {
    console.error('[Supabase Server] ERROR: Neither SUPABASE_SERVICE_ROLE_KEY nor ANON/PUBLISHABLE key is configured.');
    return null;
  }

  return createClient(supabaseUrl, effectiveKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const isSupabaseServerConfigured = (): boolean => {
  return Boolean(supabaseUrl && (supabaseServiceKey || supabaseAnonKey));
};
