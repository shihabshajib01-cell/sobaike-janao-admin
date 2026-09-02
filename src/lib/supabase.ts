import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL =
  'https://ahiaymyqfmyyrjkwgvhi.supabase.co';

const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_3wqaYyxPJ6spRNS0jNOi4w_69Jqc3-b';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  FALLBACK_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Singleton Supabase Client for Sobaike Admin Operations.
 * Configured with browser session persistence and auto token refresh.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

export default supabase;

