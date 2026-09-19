import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL =
  'https://ahiaymyqfmyyrjkwgvhi.supabase.co';

const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_3wqaYyxPJ6spRNS0jNOi4w_69Jqc3-b';

const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;

const ADMIN_SESSION_PERSISTENCE_KEY = 'sobaike_admin_session_persistence_v1';

const browserAuthStorage = typeof window === 'undefined' ? undefined : {
  getItem(key: string): string | null {
    try {
      const mode = window.localStorage.getItem(ADMIN_SESSION_PERSISTENCE_KEY);
      return mode === 'local'
        ? window.localStorage.getItem(key)
        : window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      const mode = window.localStorage.getItem(ADMIN_SESSION_PERSISTENCE_KEY);
      if (mode === 'local') {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      }
    } catch {
      // Fail closed to in-memory Supabase state if browser storage is unavailable.
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore storage cleanup failures.
    }
  },
};

export const setAdminSessionPersistence = (remember: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      ADMIN_SESSION_PERSISTENCE_KEY,
      remember ? 'local' : 'session'
    );
  } catch {
    // Ignore and default to non-persistent browser session storage.
  }
};

const supabaseUrl =
  metaEnv?.VITE_SUPABASE_URL ||
  FALLBACK_SUPABASE_URL;

const supabaseAnonKey =
  metaEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv?.VITE_SUPABASE_ANON_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  metaEnv?.VITE_SUPABASE_URL &&
  (metaEnv?.VITE_SUPABASE_PUBLISHABLE_KEY || metaEnv?.VITE_SUPABASE_ANON_KEY)
);

/**
 * Singleton Supabase Client for Sobaike Admin Operations.
 * Configured with browser session persistence and auto token refresh.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: browserAuthStorage,
    },
  }
);

export default supabase;
