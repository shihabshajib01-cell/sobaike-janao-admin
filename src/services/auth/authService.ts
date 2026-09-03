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
const MOCK_SESSION_KEY = 'sobaike_mock_session';

const createDevMockSession = (email: string): { user: User; session: Session } => {
  const user: User = {
    id: 'dev-admin-id-0001',
    app_metadata: { provider: 'email' },
    user_metadata: { name: 'System Administrator', full_name: 'System Administrator' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: email || 'admin@sobaike.org',
    role: 'authenticated',
  };
  const session: Session = {
    access_token: 'mock-dev-token-sobaike-admin',
    token_type: 'bearer',
    expires_in: 86400,
    refresh_token: 'mock-refresh-token',
    user,
  };
  return { user, session };
};

/**
 * Verifies if the authenticated user exists in public.admin_users and is marked active.
 * Strict fail-closed semantics:
 * - Returns true ONLY if Supabase is configured, user exists in admin_users, and active === true.
 * - Returns false on missing userId, query error, network error, missing row, or inactive status.
 * - In unconfigured environment: returns true for mock admin session.
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  // Unconfigured fallback
  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id, active')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Admin verification query failed (failing closed):', error.message);
      return false;
    }

    if (!data || data.active !== true) {
      return false;
    }

    return true;
  } catch (err) {
    console.error('Admin verification request exception (failing closed):', err);
    return false;
  }
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async getSession(): Promise<Session | null> {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        return data.session;
      } catch {
        return null;
      }
    }

    // Fallback when unconfigured
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(MOCK_SESSION_KEY) : null;
      if (stored) {
        return JSON.parse(stored) as Session;
      }
    } catch {}

    return null;
  },

  async getAccessToken(): Promise<string | null> {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || null;
      } catch {
        return null;
      }
    }

    // Fallback when unconfigured
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(MOCK_SESSION_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored) as Session;
        return parsed.access_token || null;
      }
    } catch {}

    return null;
  },

  async getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getUser();
        return data.user;
      } catch {
        return null;
      }
    }

    // Fallback when unconfigured
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(MOCK_SESSION_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored) as Session;
        return parsed.user || null;
      }
    } catch {}

    return null;
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

  /**
   * Primary authentication entrypoint.
   * In configured environments, authenticates exclusively via Supabase with password credentials
   * and verifies active administrative authorization.
   * Fails closed: no demo accounts, no backdoor passwords.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const email = (credentials.email || '').trim().toLowerCase();
    const password = credentials.password;
    const isRemembered = Boolean(credentials.rememberMe);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return {
            success: false,
            error: error.message || 'Invalid email or password',
          };
        }

        if (!data.user || !data.session) {
          return {
            success: false,
            error: 'Authentication failed. Please try again.',
          };
        }

        // Verify active administrative standing in public.admin_users
        const isAdmin = await checkAdminStatus(data.user.id);
        if (!isAdmin) {
          // Immediately sign out unauthorized user from Supabase client
          await supabase.auth.signOut().catch(() => {});
          return {
            success: false,
            isUnauthorizedAdmin: true,
            error: 'Unauthorized: Your account does not have active administrative privileges.',
          };
        }

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
        const message = err instanceof Error ? err.message : 'Authentication service error';
        return {
          success: false,
          error: message,
        };
      }
    }

    // Unconfigured environment: mock login
    const { user, session } = createDevMockSession(email || 'admin@sobaike.org');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
      }
    } catch {}

    if (isRemembered) {
      this.setRememberedUser(email || 'admin@sobaike.org');
    } else {
      this.clearRememberedUser();
    }

    return {
      success: true,
      user,
      session,
    };
  },

  async logout(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(MOCK_SESSION_KEY);
      }
    } catch {}

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
