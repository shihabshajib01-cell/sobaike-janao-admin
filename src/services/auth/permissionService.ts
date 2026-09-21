import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const CANONICAL_PERMISSIONS = [
  'dashboard.view',
  'complaints.view',
  'complaints.evidence_view',
  'complaints.export',
  'complaints.publish',
  'complaints.unpublish',
  'complaints.reject',
  'categories.view',
  'categories.manage',
  'banners.manage',
  'location_activity.view',
  'map.view',
  'responses.view',
  'responses.publish',
  'responses.reject',
  'responses.unpublish',
  'responses.resubmit',
  'admin_users.view',
  'admin_users.manage',
  'roles.manage',
  'audit.view',
] as const;


const AUTHORIZATION_TIMEOUT_MS = 8000;

const withTimeout = async <T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export interface UserAssignedRole {
  id: string;
  name_en: string;
  name_bn: string | null;
  description?: string | null;
  active: boolean;
  is_system?: boolean;
}

export interface UserPermissionProfile {
  role: UserAssignedRole | null;
  permissions: string[];
  isBootstrapMode: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/**
 * Service to resolve effective administrative role and permissions for an authenticated admin.
 * Follows strict database RBAC foundation:
 * 1. Queries backend RPC admin_get_my_authorization_context() directly using auth.uid()
 * 2. If assigned to an active role, returns role and effective permissions
 * 3. If no assignments exist anywhere in system, returns BOOTSTRAP MODE with 'roles.manage' only
 * 4. If system has assignments but user has none or role is inactive, user has 0 permissions
 * 5. Fails closed immediately if RPC fails or caller is unauthorized (NO client table fallbacks)
 */
export const permissionService = {
  async resolveCurrentUserAuthorization(): Promise<UserPermissionProfile> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase authorization service is not configured in this environment.');
    }

    // The backend RPC is the authoritative authorization check and resolves
    // auth.uid() from the caller JWT. Avoid a redundant auth.getUser() network
    // round-trip here because it can block behind a stale browser auth lock.
    const { data: contextData, error: rpcError } = await withTimeout(
      supabase.rpc('admin_get_my_authorization_context'),
      AUTHORIZATION_TIMEOUT_MS,
      'Authorization context request timed out.'
    );

    if (rpcError) {
      console.error('Authorization context RPC failed:', rpcError.message || rpcError);
      throw new Error(`Authorization context RPC failed: ${rpcError.message || 'Unknown error'}`);
    }

    if (!contextData || typeof contextData !== 'object') {
      throw new Error('Invalid authorization context response received from server.');
    }

    const parsed = contextData as {
      is_admin?: boolean;
      is_super_admin?: boolean;
      is_bootstrap?: boolean;
      role?: UserAssignedRole | null;
      permission_ids?: string[];
    };

    const isAdmin = Boolean(parsed.is_admin);
    const isSuperAdmin = Boolean(parsed.is_super_admin);
    const isBootstrap = Boolean(parsed.is_bootstrap);
    const role = parsed.role || null;
    const permissions = Array.isArray(parsed.permission_ids) ? parsed.permission_ids : [];

    return {
      isAdmin,
      isSuperAdmin,
      isBootstrapMode: isBootstrap,
      role: role
        ? {
            id: String(role.id),
            name_en: String(role.name_en || ''),
            name_bn: role.name_bn ? String(role.name_bn) : null,
            description: role.description ? String(role.description) : null,
            active: Boolean(role.active),
            is_system: Boolean(role.is_system),
          }
        : null,
      permissions: isAdmin ? permissions : [],
    };
  },

  async resolveUserPermissions(_userId?: string): Promise<UserPermissionProfile> {
    return this.resolveCurrentUserAuthorization();
  },
};

export default permissionService;
