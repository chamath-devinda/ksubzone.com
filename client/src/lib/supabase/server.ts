import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let serverSupabaseInstance: SupabaseClient | null = null;

/**
 * Server-only Supabase client with administrative privileges.
 * NEVER import or execute this on client-side code.
 */
export function getServerSupabase(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Security violation: Server Supabase client cannot be instantiated in the browser.');
  }

  if (serverSupabaseInstance) {
    return serverSupabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    console.warn('[supabase/server] SUPABASE_URL or service key is not configured. Some server database operations may rely on the backend API proxy.');
  }

  serverSupabaseInstance = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverSupabaseInstance;
}
