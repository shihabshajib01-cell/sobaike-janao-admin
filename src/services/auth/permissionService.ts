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
}

/**
 * Service to resolve effective administrative role and permissions for an authenticated admin.
 * Follows strict database RBAC foundation:
 * 1. Checks user_roles mapping for current user
 * 2. If assigned to an active role, loads role_permissions
 * 3. If no assignments exist across the system, enters BOOTSTRAP MODE (can_manage_roles = true)
 * 4. If system has assignments but user has none or role is inactive, user has 0 permissions
 */
export const permissionService = {
  /**
   * Resolves the effective permission profile for a user
   */
  async resolveUserPermissions(userId: string): Promise<UserPermissionProfile> {
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
      };
    }

    try {
      // 1. Fetch user's role assignment from user_roles
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
        console.error('Error fetching user_roles:', userRoleError.message);
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
            console.error('Error fetching role_permissions:', permError.message);
          }

          const effectivePerms = (rolePerms || []).map((rp: { permission_id: string }) => String(rp.permission_id));

          return {
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

      // 2. User has no role assigned. Check if the entire system is in BOOTSTRAP MODE.
      // Database RPC can_manage_roles() returns true when COUNT(public.user_roles) == 0.
      try {
        const { data: canManage, error: rpcError } = await supabase.rpc('can_manage_roles');

        if (!rpcError && Boolean(canManage)) {
          // System is in initial bootstrap mode
          return {
            role: {
              id: 'bootstrap_admin',
              name_en: 'Bootstrap Administrator',
              name_bn: 'বুটস্ট্র্যাপ অ্যাডমিনিস্ট্রেটর',
              description: 'Initial system administrator in bootstrap authorization mode',
              active: true,
              is_system: true,
            },
            permissions: [...CANONICAL_PERMISSIONS],
            isBootstrapMode: true,
          };
        }
      } catch (err) {
        console.warn('Bootstrap check via RPC failed:', err);
      }

      // 3. System has roles/assignments, but THIS user has no role assigned -> Zero permissions
      return {
        role: null,
        permissions: [],
        isBootstrapMode: false,
      };
    } catch (err) {
      console.error('Failed to resolve user permissions:', err);
      return {
        role: null,
        permissions: [],
        isBootstrapMode: false,
      };
    }
  },
};

export default permissionService;
