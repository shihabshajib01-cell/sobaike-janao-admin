import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase';
import { authService, checkAdminStatus, LoginCredentials, LoginResponse } from '@/services/auth/authService';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isMountedRef = useRef<boolean>(true);
  const userRef = useRef<User | null>(null);
  const isAdminRef = useRef<boolean>(false);

  // Keep refs synchronized with state
  useEffect(() => {
    userRef.current = user;
    isAdminRef.current = isAdmin;
  }, [user, isAdmin]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return () => {
        isMountedRef.current = false;
      };
    }

    // 1. Initial session check on mount
    const initAuth = async () => {
      try {
        const initialSession = await authService.getSession();
        if (!isMountedRef.current) return;

        if (initialSession?.user) {
          const active = await checkAdminStatus(initialSession.user.id);
          if (!isMountedRef.current) return;

          if (active) {
            setSession(initialSession);
            setUser(initialSession.user);
            setIsAdmin(true);
            userRef.current = initialSession.user;
            isAdminRef.current = true;
          } else {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            userRef.current = null;
            isAdminRef.current = false;
            // Defer sign-out outside
            setTimeout(() => {
              authService.logout().catch(() => {});
            }, 0);
          }
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          userRef.current = null;
          isAdminRef.current = false;
        }
      } catch (err) {
        console.error('Error during initial auth verification:', err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // 2. Auth state subscription (synchronous callback, deferred async verification)
    const {
      data: { subscription },
    } = authService.onAuthStateChange((event, newSession) => {
      if (!isMountedRef.current) return;

      if (event === 'SIGNED_OUT' || !newSession?.user) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        userRef.current = null;
        isAdminRef.current = false;
        setIsLoading(false);
        return;
      }

      // Check if already authenticated and verified as admin for the same user
      if (userRef.current?.id === newSession.user.id && isAdminRef.current) {
        setSession(newSession);
        setUser(newSession.user);
        userRef.current = newSession.user;
        setIsLoading(false);
        return;
      }

      // Defer admin verification safely outside the synchronous callback
      setTimeout(async () => {
        if (!isMountedRef.current) return;
        try {
          const active = await checkAdminStatus(newSession.user.id);
          if (!isMountedRef.current) return;

          if (active) {
            setSession(newSession);
            setUser(newSession.user);
            setIsAdmin(true);
            userRef.current = newSession.user;
            isAdminRef.current = true;
          } else {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            userRef.current = null;
            isAdminRef.current = false;
            // Safely sign out non-admin user outside the callback
            await authService.logout();
          }
        } catch (err) {
          console.error('Error during deferred admin verification:', err);
          if (!isMountedRef.current) return;
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          userRef.current = null;
          isAdminRef.current = false;
        } finally {
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }
      }, 0);
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const result = await authService.login(credentials);
    if (result.success && result.session && result.user) {
      setSession(result.session);
      setUser(result.user);
      setIsAdmin(true);
      userRef.current = result.user;
      isAdminRef.current = true;
    } else {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      userRef.current = null;
      isAdminRef.current = false;
    }
    return result;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    userRef.current = null;
    isAdminRef.current = false;
  };

  const refreshAdminStatus = async (): Promise<boolean> => {
    if (!user) return false;
    const active = await checkAdminStatus(user.id);
    setIsAdmin(active);
    isAdminRef.current = active;
    if (!active) {
      await logout();
    }
    return active;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        login,
        logout,
        refreshAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
