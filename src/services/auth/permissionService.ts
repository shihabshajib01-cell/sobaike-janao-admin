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
  'location_activity.view',
  'map.view',
  'responses.view',
  'admin_users.view',
  'admin_users.manage',
  'roles.manage',
  'audit.view',
] as const;

export type CanonicalPermissionId = (typeof CANONICAL_PERMISSIONS)[number];

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
}

/**
 * Service to resolve effective administrative role and permissions for an authenticated admin.
 * Follows strict database RBAC foundation:
 * 1. Queries backend RPC admin_get_my_authorization_context()
 * 2. If assigned to an active role, returns role and effective permissions
 * 3. If no assignments exist anywhere in system, enters BOOTSTRAP MODE with 'roles.manage' only
 * 4. If system has assignments but user has none or role is inactive, user has 0 permissions
 */
export const permissionService = {
  /**
   * Resolves the effective authorization profile for the currently authenticated admin caller
   */
  async resolveCurrentUserAuthorization(): Promise<UserPermissionProfile> {
    const { data: authData } = await supabase.auth.getUser();
    return this.resolveUserPermissions(authData.user?.id || '');
  },

  /**
   * Resolves the effective permission profile for a user
   */
  async resolveUserPermissions(userId?: string): Promise<UserPermissionProfile> {
    if (!isSupabaseConfigured || !userId) {
      return {
        role: {
          id: 'dev_admin',
          name_en: 'System Administrator',
          name_bn: 'সিস্টেম অ্যাডমিনিস্ট্রেটর',
          active: true,
          is_system: true,
        },
        permissions: [...CANONICAL_PERMISSIONS],
        isBootstrapMode: true,
        isAdmin: true,
      };
    }

    try {
      // 1. Preferred approach: Database-authoritative runtime context RPC
      const { data: contextData, error: rpcError } = await supabase.rpc(
        'admin_get_my_authorization_context'
      );

      if (!rpcError && contextData && typeof contextData === 'object') {
        const parsed = contextData as {
          is_admin?: boolean;
          is_bootstrap?: boolean;
          role?: UserAssignedRole | null;
          permission_ids?: string[];
        };

        const isAdmin = Boolean(parsed.is_admin);
        const isBootstrap = Boolean(parsed.is_bootstrap);
        const role = parsed.role || null;
        const permissions = Array.isArray(parsed.permission_ids) ? parsed.permission_ids : [];

        return {
          isAdmin,
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
          permissions,
        };
      }

      if (rpcError) {
        console.warn('admin_get_my_authorization_context RPC not available, falling back to query:', rpcError.message);
      }

      // 2. Fallback: Fetch user's role assignment from user_roles
      const { data: userRoleRow, error: userRoleError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles:role_id (
            id,
            name_en,
            name_bn,
            description,
            active,
            is_system
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (userRoleError) {
        console.error('Error fetching user_roles fallback:', userRoleError.message);
      }

      // If user has an assigned role
      if (userRoleRow && userRoleRow.roles) {
        const rawRole = userRoleRow.roles as unknown;
        const roleData: UserAssignedRole = Array.isArray(rawRole) ? rawRole[0] : (rawRole as UserAssignedRole);

        if (roleData && roleData.active) {
          // Fetch effective permissions from role_permissions
          const { data: rolePerms, error: permError } = await supabase
            .from('role_permissions')
            .select('permission_id')
            .eq('role_id', roleData.id);

          if (permError) {
            console.error('Error fetching role_permissions fallback:', permError.message);
          }

          const effectivePerms = (rolePerms || []).map((rp: { permission_id: string }) => String(rp.permission_id));

          return {
            isAdmin: true,
            role: {
              id: String(roleData.id),
              name_en: String(roleData.name_en || ''),
              name_bn: roleData.name_bn ? String(roleData.name_bn) : null,
              description: roleData.description ? String(roleData.description) : null,
              active: Boolean(roleData.active),
              is_system: Boolean(roleData.is_system),
            },
            permissions: effectivePerms,
            isBootstrapMode: false,
          };
        } else if (roleData) {
          // Role exists but is inactive
          return {
            isAdmin: true,
            role: {
              id: String(roleData.id),
              name_en: String(roleData.name_en || ''),
              name_bn: roleData.name_bn ? String(roleData.name_bn) : null,
              description: roleData.description ? String(roleData.description) : null,
              active: false,
              is_system: Boolean(roleData.is_system),
            },
            permissions: [],
            isBootstrapMode: false,
          };
        }
      }

      // 3. Check genuine bootstrap mode via count
      try {
        const { count, error: countError } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true });

        if (!countError && count === 0) {
          // Genuine bootstrap mode: only 'roles.manage'
          return {
            isAdmin: true,
            role: {
              id: 'bootstrap_admin',
              name_en: 'Bootstrap Administrator',
              name_bn: 'বুটস্ট্র্যাপ অ্যাডমিনিস্ট্রেটর',
              description: 'Initial system administrator in bootstrap authorization mode',
              active: true,
              is_system: true,
            },
            permissions: ['roles.manage'],
            isBootstrapMode: true,
          };
        }
      } catch (err) {
        console.warn('Bootstrap count check failed:', err);
      }

      // 4. System has assignments, but this user has none -> Zero permissions
      return {
        isAdmin: true,
        role: null,
        permissions: [],
        isBootstrapMode: false,
      };
    } catch (err) {
      console.error('Failed to resolve user permissions:', err);
      throw err;
    }
  },
};

export default permissionService;
