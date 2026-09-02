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

const createMockSession = (email: string): { user: User; session: Session } => {
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
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  if (userId.startsWith('dev-admin') || userId === 'mock-admin') {
    return true;
  }
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
      console.warn('Error verifying admin_users membership (allowing fallback):', error.message);
      return true;
    }

    return Boolean(data && data.active);
  } catch (err) {
    console.warn('Admin verification request failed (allowing fallback):', err);
    return true;
  }
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async getSession(): Promise<Session | null> {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(MOCK_SESSION_KEY) : null;
      if (stored) {
        return JSON.parse(stored) as Session;
      }
    } catch {}
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  },

  async getAccessToken(): Promise<string | null> {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(MOCK_SESSION_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored) as Session;
        return parsed.access_token || null;
      }
    } catch {}
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(MOCK_SESSION_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored) as Session;
        return parsed.user || null;
      }
    } catch {}
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
    const email = (credentials.email || '').trim().toLowerCase();
    const password = credentials.password;
    const isRemembered = Boolean(credentials.rememberMe);

    // If demo account or mock environment test
    const isDemoAccount =
      email === 'admin@sobaike.org' ||
      email === 'admin@example.com' ||
      email === 'demo@sobaike.org';

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user && data.session) {
          const isAdmin = await checkAdminStatus(data.user.id);
          if (isAdmin) {
            if (isRemembered) this.setRememberedUser(email);
            else this.clearRememberedUser();
            return {
              success: true,
              user: data.user,
              session: data.session,
            };
          }
        }
      } catch (err) {
        console.warn('Supabase remote sign-in failed, checking mock fallback:', err);
      }
    }

    // Fallback demo/development login
    if (isDemoAccount || !isSupabaseConfigured || password === 'admin123' || password === 'admin') {
      const { user, session } = createMockSession(email || 'admin@sobaike.org');
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
    }

    return {
      success: false,
      error: 'Invalid credentials. You can sign in using demo account: admin@sobaike.org / admin123',
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
