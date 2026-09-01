/**
 * Authentication Token Storage & State Foundation
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

const AUTH_TOKEN_KEY = 'sobaike_admin_token';
const AUTH_USER_KEY = 'sobaike_admin_user';
const REMEMBERED_USER_KEY = 'sobaike_remembered_user';

export const authService = {
  getToken(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string, remember: boolean = true): void {
    try {
      if (remember) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    } catch {
      // Ignore storage errors
    }
  },

  removeToken(): void {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // Ignore
    }
  },

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  },

  getRememberedUser(): string | null {
    try {
      return localStorage.getItem(REMEMBERED_USER_KEY);
    } catch {
      return null;
    }
  },

  setRememberedUser(username: string): void {
    try {
      localStorage.setItem(REMEMBERED_USER_KEY, username);
    } catch {
      // Ignore
    }
  },

  clearRememberedUser(): void {
    try {
      localStorage.removeItem(REMEMBERED_USER_KEY);
    } catch {
      // Ignore
    }
  },

  getCurrentUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        return JSON.parse(stored) as AuthUser;
      }
    } catch {
      // Fallback
    }
    return {
      id: 'usr-admin-1',
      name: 'Tanvir Hossain',
      email: 'admin@sobaike.gov.bd',
      role: 'Super Administrator',
    };
  },

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Simulating asynchronous network delay for API readiness
    await new Promise((resolve) => setTimeout(resolve, 500));

    const enteredId = (credentials.username || credentials.email || '').trim().toLowerCase();
    const enteredPassword = credentials.password;
    const isRemembered = Boolean(credentials.rememberMe);

    // Validate demo credentials: ID: admin, Password: admin (or admin@sobaike.gov.bd)
    const isValid = (enteredId === 'admin' || enteredId === 'admin@sobaike.gov.bd') && enteredPassword === 'admin';

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid ID or password',
      };
    }

    const mockToken = `sbk_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const mockUser: AuthUser = {
      id: 'usr-admin-1',
      name: 'System Administrator',
      email: enteredId.includes('@') ? enteredId : 'admin@sobaike.gov.bd',
      role: 'Super Administrator',
    };

    try {
      if (isRemembered) {
        localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
        localStorage.setItem(REMEMBERED_USER_KEY, enteredId);
      } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, mockToken);
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
        localStorage.removeItem(REMEMBERED_USER_KEY);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }

    return {
      success: true,
      token: mockToken,
      user: mockUser,
    };
  },

  async logout(): Promise<void> {
    this.removeToken();
  },
};

export default authService;

