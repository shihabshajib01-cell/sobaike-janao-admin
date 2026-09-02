import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase';
import { authService, checkAdminStatus, LoginCredentials, LoginResponse } from '@/services/auth/authService';
import { permissionService, UserAssignedRole } from '@/services/auth/permissionService';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  // RBAC State
  permissions: string[];
  role: UserAssignedRole | null;
  isBootstrapMode: boolean;
  permissionsLoading: boolean;
  permissionsError: boolean;
  // RBAC Helpers
  hasPermission: (permissionId: string) => boolean;
  hasAnyPermission: (permissionIds: string[]) => boolean;
  hasAllPermissions: (permissionIds: string[]) => boolean;
  refreshPermissions: () => Promise<string[]>;
  // Auth Operations
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

  // RBAC permissions state
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<UserAssignedRole | null>(null);
  const [isBootstrapMode, setIsBootstrapMode] = useState<boolean>(false);
  const [permissionsLoading, setPermissionsLoading] = useState<boolean>(false);
  const [permissionsError, setPermissionsError] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const userRef = useRef<User | null>(null);
  const isAdminRef = useRef<boolean>(false);
  const permissionsRef = useRef<string[]>([]);

  // Keep refs synchronized with state
  useEffect(() => {
    userRef.current = user;
    isAdminRef.current = isAdmin;
    permissionsRef.current = permissions;
  }, [user, isAdmin, permissions]);

  /**
   * Resolves role and effective permissions for the currently authenticated admin caller
   */
  const loadUserPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    setPermissionsError(false);
    try {
      const profile = await permissionService.resolveCurrentUserAuthorization();
      if (isMountedRef.current) {
        setPermissions(profile.permissions);
        setRole(profile.role);
        setIsBootstrapMode(profile.isBootstrapMode);
        setPermissionsError(false);
        permissionsRef.current = profile.permissions;
      }
      return profile.permissions;
    } catch (err) {
      console.error('Failed to load user permissions:', err);
      if (isMountedRef.current) {
        setPermissions([]);
        setRole(null);
        setIsBootstrapMode(false);
        setPermissionsError(true);
        permissionsRef.current = [];
      }
      return [];
    } finally {
      if (isMountedRef.current) {
        setPermissionsLoading(false);
      }
    }
  }, []);

  /**
   * Resets all auth and permission state
   */
  const resetAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setPermissions([]);
    setRole(null);
    setIsBootstrapMode(false);
    setPermissionsLoading(false);
    setPermissionsError(false);
    userRef.current = null;
    isAdminRef.current = false;
    permissionsRef.current = [];
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      // In unconfigured dev mode, resolve default admin permissions
      loadUserPermissions();
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

            // Load permissions in parallel
            await loadUserPermissions();
          } else {
            resetAuthState();
            // Defer sign-out outside
            setTimeout(() => {
              authService.logout().catch(() => {});
            }, 0);
          }
        } else {
          resetAuthState();
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
        resetAuthState();
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

            await loadUserPermissions();
          } else {
            resetAuthState();
            // Safely sign out non-admin user outside the callback
            await authService.logout();
          }
        } catch (err) {
          console.error('Error during deferred admin verification:', err);
          if (!isMountedRef.current) return;
          resetAuthState();
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
  }, [loadUserPermissions, resetAuthState]);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const result = await authService.login(credentials);
    if (result.success && result.session && result.user) {
      setSession(result.session);
      setUser(result.user);
      setIsAdmin(true);
      userRef.current = result.user;
      isAdminRef.current = true;
      await loadUserPermissions();
    } else {
      resetAuthState();
    }
    return result;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    resetAuthState();
  };

  const refreshAdminStatus = async (): Promise<boolean> => {
    if (!user) return false;
    const active = await checkAdminStatus(user.id);
    setIsAdmin(active);
    isAdminRef.current = active;
    if (!active) {
      await logout();
    } else {
      await loadUserPermissions();
    }
    return active;
  };

  const refreshPermissions = async (): Promise<string[]> => {
    if (!user) return [];
    return loadUserPermissions();
  };

  /**
   * Permission checking helper:
   * Returns true if user is an active admin and has the specific permission ID.
   */
  const hasPermission = useCallback(
    (permissionId: string): boolean => {
      if (!isAdmin) return false;
      return permissions.includes(permissionId);
    },
    [isAdmin, permissions]
  );

  /**
   * Returns true if user has AT LEAST ONE of the specified permission IDs
   */
  const hasAnyPermission = useCallback(
    (permissionIds: string[]): boolean => {
      if (!isAdmin) return false;
      if (!permissionIds || permissionIds.length === 0) return true;
      return permissionIds.some((p) => permissions.includes(p));
    },
    [isAdmin, permissions]
  );

  /**
   * Returns true if user has ALL of the specified permission IDs
   */
  const hasAllPermissions = useCallback(
    (permissionIds: string[]): boolean => {
      if (!isAdmin) return false;
      if (!permissionIds || permissionIds.length === 0) return true;
      return permissionIds.every((p) => permissions.includes(p));
    },
    [isAdmin, permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        permissions,
        role,
        isBootstrapMode,
        permissionsLoading,
        permissionsError,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions,
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
