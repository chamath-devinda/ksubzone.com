import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let publicSupabaseInstance: SupabaseClient | null = null;

/**
 * Public client-safe Supabase instance using anonymous key.
 */
export function getPublicSupabase(): SupabaseClient {
  if (publicSupabaseInstance) {
    return publicSupabaseInstance;
  }

  const supabaseUrl = (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    'https://dyypaoupfdpqpczbppfc.supabase.co'
  );
  const anonKey = (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    'sb_publishable_cGhZWMgUU3plgBcUoTHeWA__g_HrD4i'
  );

  publicSupabaseInstance = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return publicSupabaseInstance;
}
