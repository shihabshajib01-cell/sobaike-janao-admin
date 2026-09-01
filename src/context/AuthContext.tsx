import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

  // Initialize and verify session
  const verifyAndSetSession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession || !currentSession.user) {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      return false;
    }

    try {
      const activeAdmin = await checkAdminStatus(currentSession.user.id);
      if (activeAdmin) {
        setSession(currentSession);
        setUser(currentSession.user);
        setIsAdmin(true);
        return true;
      } else {
        // Authenticated user is not an active admin: auto sign out
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        return false;
      }
    } catch (err) {
      console.error('Failed to verify admin status for session:', err);
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          if (data.session) {
            await verifyAndSetSession(data.session);
          }
        }
      } catch (error) {
        console.error('Error initializing Supabase session:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    if (!isSupabaseConfigured) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession) {
          await verifyAndSetSession(newSession);
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [verifyAndSetSession]);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const result = await authService.login(credentials);
    if (result.success && result.session && result.user) {
      setSession(result.session);
      setUser(result.user);
      setIsAdmin(true);
    } else {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
    }
    return result;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  const refreshAdminStatus = async (): Promise<boolean> => {
    if (!user) return false;
    const active = await checkAdminStatus(user.id);
    setIsAdmin(active);
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
