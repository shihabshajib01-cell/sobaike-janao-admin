/**
 * Admin User Management API Service Layer
 * Interacts with Supabase RPCs and Edge Functions:
 * - admin_get_users
 * - admin_get_user
 * - admin_get_assignable_roles
 * - admin_update_user
 * - Edge Function: admin-create-user
 * Strictly authoritative: no direct table mutations, no secrets in frontend.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AdminUserListItem,
  AdminUserDetail,
  AssignableRole,
  UserFilterRole,
  CreateAdminUserInput,
  UpdateAdminUserInput,
  AdminUsersListResponse,
  AdminUserQueryParams,
  AdminUserApiError,
} from '@/types/AdminUser';
import { CANONICAL_PERMISSIONS } from '@/services/auth/permissionService';

function assertAdminUserApiConfigured(): 'configured' | 'dev_fallback' {
  if (isSupabaseConfigured) {
    return 'configured';
  }
  const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);
  if (isDev) {
    return 'dev_fallback';
  }
  throw new AdminUserApiError(
    'Supabase user management is not configured in this environment.',
    'CONFIG_ERROR'
  );
}

// ==============================================================================
// DEV-ONLY IN-MEMORY FIXTURES (Active ONLY when import.meta.env.DEV && !isSupabaseConfigured)
// ==============================================================================

const FALLBACK_ASSIGNABLE_ROLES: AssignableRole[] = [
  {
    id: 'content_moderator',
    name_en: 'Content Moderator',
    name_bn: 'কন্টেন্ট মডারেটর',
    description: 'Authorized to review, verify, publish, edit, and reject citizen complaints',
    active: true,
    is_system: false,
  },
  {
    id: 'field_officer',
    name_en: 'Departmental Field Officer',
    name_bn: 'বিভাগীয় ফিল্ড অফিসার',
    description: 'Authorized to read assigned complaints, append updates, and inspect operational feeds',
    active: true,
    is_system: false,
  },
];

const inMemoryUsers: AdminUserListItem[] = [
  {
    user_id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Primary System Administrator',
    email: 'admin@sobaike-janao.org',
    active: true,
    is_super_admin: true,
    role_id: null,
    role_name_en: null,
    role_name_bn: null,
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    user_id: '00000000-0000-0000-0000-000000000002',
    display_name: 'Tanvir Ahmed',
    email: 'tanvir.moderator@sobaike-janao.org',
    active: true,
    is_super_admin: false,
    role_id: 'content_moderator',
    role_name_en: 'Content Moderator',
    role_name_bn: 'কন্টেন্ট মডারেটর',
    created_at: '2026-08-10T12:00:00Z',
  },
  {
    user_id: '00000000-0000-0000-0000-000000000003',
    display_name: 'Sadia Rahman',
    email: 'sadia.field@sobaike-janao.org',
    active: false,
    is_super_admin: false,
    role_id: 'field_officer',
    role_name_en: 'Departmental Field Officer',
    role_name_bn: 'বিভাগীয় ফিল্ড অফিসার',
    created_at: '2026-08-15T09:30:00Z',
  },
];

export const adminUserApi = {
  /**
   * Fetch paginated list of administrators
   */
  async getUsers(params: AdminUserQueryParams = {}): Promise<AdminUsersListResponse> {
    const mode = assertAdminUserApiConfigured();

    if (mode === 'dev_fallback') {
      let filtered = [...inMemoryUsers];

      if (params.search && params.search.trim()) {
        const q = params.search.toLowerCase().trim();
        filtered = filtered.filter(
          (u) =>
            (u.display_name && u.display_name.toLowerCase().includes(q)) ||
            u.email.toLowerCase().includes(q)
        );
      }

      if (params.role_id && params.role_id !== 'all') {
        filtered = filtered.filter((u) => u.role_id === params.role_id);
      }

      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((u) => (params.status === 'active' ? u.active : !u.active));
      }

      const offset = params.offset || 0;
      const limit = params.limit || 50;
      const paginated = filtered.slice(offset, offset + limit);

      return {
        users: paginated,
        total_count: filtered.length,
        limit,
        offset,
      };
    }

    const { data, error } = await supabase.rpc('admin_get_users', {
      p_search: params.search || null,
      p_role_id: params.role_id && params.role_id !== 'all' ? params.role_id : null,
      p_status: params.status && params.status !== 'all' ? params.status : null,
      p_limit: params.limit || 50,
      p_offset: params.offset || 0,
    });

    if (error) {
      console.error('admin_get_users RPC failed:', error);
      throw new AdminUserApiError(error.message, error.code, error.details);
    }

    const res = data as { users?: AdminUserListItem[]; total_count?: number; limit?: number; offset?: number };
    return {
      users: Array.isArray(res.users) ? res.users : [],
      total_count: Number(res.total_count || 0),
      limit: Number(res.limit || 50),
      offset: Number(res.offset || 0),
    };
  },

  /**
   * Fetch detailed information about a single administrator
   */
  async getUser(userId: string): Promise<AdminUserDetail> {
    const mode = assertAdminUserApiConfigured();

    if (mode === 'dev_fallback') {
      const user = inMemoryUsers.find((u) => u.user_id === userId);
      if (!user) {
        throw new AdminUserApiError('Administrator account not found.', 'P0002');
      }

      if (user.is_super_admin) {
        return {
          user_id: user.user_id,
          display_name: user.display_name,
          email: user.email,
          active: user.active,
          is_super_admin: true,
          role: null,
          effective_permissions: [...CANONICAL_PERMISSIONS],
          created_at: user.created_at,
          updated_at: null,
        };
      }

      const role = FALLBACK_ASSIGNABLE_ROLES.find((r) => r.id === user.role_id) || null;
      return {
        user_id: user.user_id,
        display_name: user.display_name,
        email: user.email,
        active: user.active,
        is_super_admin: false,
        role: role
          ? {
              id: role.id,
              name_en: role.name_en,
              name_bn: role.name_bn,
              description: role.description,
              active: role.active,
              is_system: role.is_system,
            }
          : null,
        effective_permissions: role?.id === 'content_moderator' ? ['complaints.view', 'complaints.publish', 'complaints.reject'] : ['complaints.view'],
        created_at: user.created_at,
        updated_at: null,
      };
    }

    const { data, error } = await supabase.rpc('admin_get_user', {
      p_user_id: userId,
    });

    if (error) {
      console.error('admin_get_user RPC failed:', error);
      throw new AdminUserApiError(error.message, error.code, error.details);
    }

    return data as AdminUserDetail;
  },

  /**
   * Fetch active roles assignable to normal administrators
   * Requires admin_users.manage permission
   */
  async getAssignableRoles(): Promise<AssignableRole[]> {
    const mode = assertAdminUserApiConfigured();

    if (mode === 'dev_fallback') {
      return [...FALLBACK_ASSIGNABLE_ROLES];
    }

    const { data, error } = await supabase.rpc('admin_get_assignable_roles');

    if (error) {
      console.error('admin_get_assignable_roles RPC failed:', error);
      throw new AdminUserApiError(error.message, error.code, error.details);
    }

    return Array.isArray(data) ? data : [];
  },

  /**
   * Fetch roles for filter dropdown on User Management list
   * Requires admin_users.view permission (does not require admin_users.manage)
   */
  async getUserFilterRoles(): Promise<UserFilterRole[]> {
    const mode = assertAdminUserApiConfigured();

    if (mode === 'dev_fallback') {
      return FALLBACK_ASSIGNABLE_ROLES.map((r) => ({
        id: r.id,
        name_en: r.name_en,
        name_bn: r.name_bn,
        active: r.active,
      }));
    }

    const { data, error } = await supabase.rpc('admin_get_user_filter_roles');

    if (error) {
      console.error('admin_get_user_filter_roles RPC failed:', error);
      throw new AdminUserApiError(error.message, error.code, error.details);
    }

    return Array.isArray(data) ? data : [];
  },

  /**
   * Create a login-ready administrative user via server-side Edge Function
   */
  async createUser(input: CreateAdminUserInput): Promise<{ success: boolean; user_id: string }> {
    const mode = assertAdminUserApiConfigured();

    if (mode === 'dev_fallback') {
      const cleanEmail = input.email.trim().toLowerCase();
      if (inMemoryUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
        throw new AdminUserApiError('An account with this email address already exists.', 'EMAIL_ALREADY_EXISTS', 409);
      }

      const assignedRole = FALLBACK_ASSIGNABLE_ROLES.find((r) => r.id === input.role_id);
      const newId = `00000000-0000-0000-0000-${String(inMemoryUsers.length + 1).padStart(12, '0')}`;
      const newUser: AdminUserListItem = {
        user_id: newId,
        display_name: input.display_name?.trim() || null,
        email: cleanEmail,
        active: input.active !== undefined ? input.active : true,
        is_super_admin: false,
        role_id: input.role_id,
        role_name_en: assignedRole?.name_en || input.role_id,
        role_name_bn: assignedRole?.name_bn || null,
        created_at: new Date().toISOString(),
      };

      inMemoryUsers.unshift(newUser);
      return { success: true, user_id: newId };
    }

    // Call Supabase Edge Function 'admin-create-user'
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: input.email.trim().toLowerCase(),
        password: input.password,
        display_name: input.display_name?.trim() || null,
        role_id: input.role_id,
        active: input.active !== undefined ? input.active : true,
      },
    });

    if (error) {
      console.error('Edge Function admin-create-user failed:', error);
      let message = error.message || 'Failed to create user.';
      let code: string | undefined;

      // Extract error response body if available
      if (error && typeof error === 'object' && 'context' in error) {
        const ctx = (error as { context?: { json?: () => Promise<{ error?: string; code?: string }> } }).context;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            if (body?.error) message = body.error;
            if (body?.code) code = body.code;
          } catch {
            // Ignore parse failure
          }
        }
      }

      throw new AdminUserApiError(message, code);
    }

    if (!data || !data.success) {
      throw new AdminUserApiError(data?.error || 'Failed to create user.', data?.code);
    }

    return { success: true, user_id: data.user_id };
  },

  /**
   * Update a normal administrator's display name, assigned role, and status atomically
   */
  async updateUser(input: UpdateAdminUserInput): Promise<{ success: boolean; user_id: string }> {
    const mode = assertAdminUserApiConfigured();

    if (mode === 'dev_fallback') {
      const idx = inMemoryUsers.findIndex((u) => u.user_id === input.user_id);
      if (idx === -1) {
        throw new AdminUserApiError('Administrator account not found.', 'P0002');
      }

      if (inMemoryUsers[idx].is_super_admin) {
        throw new AdminUserApiError(
          'Protected system account: Super Administrator cannot be modified, deactivated, or demoted.',
          '42501'
        );
      }

      const assignedRole = FALLBACK_ASSIGNABLE_ROLES.find((r) => r.id === input.role_id);
      inMemoryUsers[idx] = {
        ...inMemoryUsers[idx],
        display_name: input.display_name?.trim() || null,
        role_id: input.role_id,
        role_name_en: assignedRole?.name_en || input.role_id,
        role_name_bn: assignedRole?.name_bn || null,
        active: input.active,
      };

      return { success: true, user_id: input.user_id };
    }

    const { data, error } = await supabase.rpc('admin_update_user', {
      p_user_id: input.user_id,
      p_display_name: input.display_name?.trim() || null,
      p_role_id: input.role_id,
      p_active: input.active,
    });

    if (error) {
      console.error('admin_update_user RPC failed:', error);
      throw new AdminUserApiError(error.message, error.code, error.details);
    }

    return { success: true, user_id: input.user_id };
  },
};
