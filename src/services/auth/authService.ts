import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  setAdminSessionPersistence,
  clearAdminSessionPersistence,
} from '@/lib/supabase';

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
  requiresMfa?: boolean;
  requiresMfaEnrollment?: boolean;
  mfaFactorId?: string;
  mfaChallengeId?: string;
  mfaQrCode?: string;
  mfaSecret?: string;
}

const REMEMBERED_EMAIL_KEY = 'sobaike_remembered_email';

/**
 * Verifies if the authenticated user exists in public.admin_users and is marked active.
 * Strict fail-closed semantics:
 * - Returns true ONLY if Supabase is configured, user exists in admin_users, and active === true.
 * - Returns false on missing userId, query error, network error, missing row, or inactive status.
 * - Unconfigured environments fail closed.
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  if (!isSupabaseConfigured) {
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


async function getMfaAssurance(): Promise<{ currentLevel: string | null; nextLevel: string | null }> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return {
    currentLevel: data?.currentLevel || null,
    nextLevel: data?.nextLevel || null,
  };
}

async function prepareRequiredMfa(
  user: User,
  session: Session
): Promise<LoginResponse | null> {
  const assurance = await getMfaAssurance();
  if (assurance.currentLevel === 'aal2') {
    return null;
  }

  const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
  if (factorError) throw factorError;

  const verifiedTotp = factorData?.totp?.find((factor) => factor.status === 'verified');
  if (verifiedTotp) {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: verifiedTotp.id,
    });
    if (challengeError || !challengeData?.id) {
      throw challengeError || new Error('Unable to start MFA verification.');
    }

    return {
      success: false,
      user,
      session,
      requiresMfa: true,
      mfaFactorId: verifiedTotp.id,
      mfaChallengeId: challengeData.id,
    };
  }

  // Remove abandoned unverified TOTP enrollments so repeated interrupted
  // logins cannot consume the factor limit or leave unusable factors behind.
  for (const factor of factorData?.totp || []) {
    if (factor.status !== 'verified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => {});
    }
  }

  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Sobaike Janao Admin',
  });
  if (enrollError || !enrollData?.id || !enrollData?.totp?.qr_code) {
    throw enrollError || new Error('Unable to enroll an authenticator app.');
  }

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: enrollData.id,
  });
  if (challengeError || !challengeData?.id) {
    throw challengeError || new Error('Unable to start MFA enrollment verification.');
  }

  return {
    success: false,
    user,
    session,
    requiresMfa: true,
    requiresMfaEnrollment: true,
    mfaFactorId: enrollData.id,
    mfaChallengeId: challengeData.id,
    mfaQrCode: enrollData.totp.qr_code,
    mfaSecret: enrollData.totp.secret,
  };
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
        setAdminSessionPersistence(isRemembered);
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

        // Verify active administrative standing in public.admin_users.
        // This intentionally remains available at AAL1 so a valid administrator
        // can be identified before the mandatory second-factor challenge.
        const isAdmin = await checkAdminStatus(data.user.id);
        if (!isAdmin) {
          await supabase.auth.signOut().catch(() => {});
          return {
            success: false,
            isUnauthorizedAdmin: true,
            error: 'Unauthorized: Your account does not have active administrative privileges.',
          };
        }

        const mfaRequirement = await prepareRequiredMfa(data.user, data.session);

        if (isRemembered) {
          this.setRememberedUser(email);
        } else {
          this.clearRememberedUser();
        }

        if (mfaRequirement) {
          return mfaRequirement;
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

    return {
      success: false,
      isUnconfigured: true,
      error: 'Authentication service is not configured in this environment.',
    };
  },

  async isCurrentSessionAal2(): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const assurance = await getMfaAssurance();
      return assurance.currentLevel === 'aal2';
    } catch {
      return false;
    }
  },

  async verifyMfa(
    factorId: string,
    challengeId: string,
    code: string
  ): Promise<LoginResponse> {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        isUnconfigured: true,
        error: 'Authentication service is not configured in this environment.',
      };
    }

    const cleanFactorId = factorId.trim();
    const cleanChallengeId = challengeId.trim();
    const cleanCode = code.replace(/\s+/g, '');

    if (!cleanFactorId || !cleanChallengeId || !/^\d{6,8}$/.test(cleanCode)) {
      return {
        success: false,
        requiresMfa: true,
        error: 'Enter a valid authenticator code.',
      };
    }

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: cleanFactorId,
        challengeId: cleanChallengeId,
        code: cleanCode,
      });
      if (error) {
        return {
          success: false,
          requiresMfa: true,
          error: error.message || 'Authenticator verification failed.',
        };
      }

      const assurance = await getMfaAssurance();
      if (assurance.currentLevel !== 'aal2') {
        return {
          success: false,
          requiresMfa: true,
          error: 'Multi-factor authentication did not reach the required assurance level.',
        };
      }

      const [{ data: sessionData }, { data: userData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ]);
      if (!sessionData.session || !userData.user) {
        return {
          success: false,
          error: 'Authentication session could not be refreshed after MFA.',
        };
      }

      const isAdmin = await checkAdminStatus(userData.user.id);
      if (!isAdmin) {
        await supabase.auth.signOut().catch(() => {});
        return {
          success: false,
          isUnauthorizedAdmin: true,
          error: 'Unauthorized: Your account does not have active administrative privileges.',
        };
      }

      return {
        success: true,
        user: userData.user,
        session: sessionData.session,
      };
    } catch (err: unknown) {
      return {
        success: false,
        requiresMfa: true,
        error: err instanceof Error ? err.message : 'Authenticator verification failed.',
      };
    }
  },

  async logout(): Promise<void> {
    if (!isSupabaseConfigured) {
      clearAdminSessionPersistence();
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during Supabase sign-out:', err);
    } finally {
      clearAdminSessionPersistence();
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
