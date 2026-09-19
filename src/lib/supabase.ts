import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL =
  'https://ahiaymyqfmyyrjkwgvhi.supabase.co';

const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_3wqaYyxPJ6spRNS0jNOi4w_69Jqc3-b';

const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;

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

const ADMIN_SESSION_PERSISTENCE_KEY = 'sobaike_admin_persist_session_v1';

const shouldPersistAdminSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ADMIN_SESSION_PERSISTENCE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setAdminSessionPersistence = (remember: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ADMIN_SESSION_PERSISTENCE_KEY, remember ? 'true' : 'false');
  } catch {
    // Fail closed to session-only storage when browser persistence is unavailable.
  }
};

export const clearAdminSessionPersistence = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ADMIN_SESSION_PERSISTENCE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
};

const adminAuthStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const storage = shouldPersistAdminSession() ? window.localStorage : window.sessionStorage;
      return storage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      const persistent = shouldPersistAdminSession();
      const primary = persistent ? window.localStorage : window.sessionStorage;
      const secondary = persistent ? window.sessionStorage : window.localStorage;
      primary.setItem(key, value);
      secondary.removeItem(key);
    } catch {
      // Supabase will fail the affected persistence operation rather than widening persistence.
    }
  },
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};

/**
 * Singleton Supabase Client for Sobaike Admin Operations.
 * Session persistence follows the explicit Remember me choice:
 * - checked: localStorage survives browser restart
 * - unchecked/default: sessionStorage ends with the browser session
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: adminAuthStorage,
    },
  }
);

export default supabase;
