import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  isUnauthorizedAdmin?: boolean;
  isUnconfigured?: boolean;
}

const REMEMBERED_EMAIL_KEY = 'sobaike_remembered_email';

/**
 * Verifies if the authenticated user exists in public.admin_users and is marked active.
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id, active')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Error verifying admin_users membership:', error.message);
      return false;
    }

    return Boolean(data && data.active);
  } catch (err) {
    console.error('Admin verification request failed:', err);
    return false;
  }
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  },

  async getAccessToken(): Promise<string | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  },

  getRememberedUser(): string | null {
    try {
      return localStorage.getItem(REMEMBERED_EMAIL_KEY);
    } catch {
      return null;
    }
  },

  setRememberedUser(email: string): void {
    try {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } catch {
      // Ignore
    }
  },

  clearRememberedUser(): void {
    try {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Ignore
    }
  },

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
        isUnconfigured: true,
      };
    }

    const email = (credentials.email || '').trim();
    const password = credentials.password;
    const isRemembered = Boolean(credentials.rememberMe);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        return {
          success: false,
          error: error?.message || 'Invalid email or password',
        };
      }

      // Verify admin allowlist in public.admin_users
      const isAdmin = await checkAdminStatus(data.user.id);

      if (!isAdmin) {
        // Immediately sign the user out
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Unauthorized: Your account does not have active administrative privileges.',
          isUnauthorizedAdmin: true,
        };
      }

      // Handle remembered email
      if (isRemembered) {
        this.setRememberedUser(email);
      } else {
        this.clearRememberedUser();
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to authentication service.';
      return {
        success: false,
        error: message,
      };
    }
  },

  async logout(): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during Supabase sign-out:', err);
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
