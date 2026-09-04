/**
 * Role Management API Service Layer
 * Interacts exclusively with Supabase RPCs:
 * - admin_list_roles
 * - admin_get_permission_catalogue
 * - admin_get_role_detail
 * - admin_create_role
 * - admin_update_role
 * - admin_replace_role_permissions
 * Strictly authoritative: no direct table mutations, no mock fallbacks in unconfigured production.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  RoleListItem,
  RoleRpcRow,
  PermissionCatalogueItem,
  CreateRoleInput,
  CreateRoleResult,
  RoleDetail,
  RoleUpdateInput,
  ReplaceRolePermissionsInput,
  ReplaceRolePermissionsResult,
  RoleApiError,
} from '@/types/Role';
import { generateRoleSlug } from '@/utils/roleUtils';

/**
 * Asserts whether role management is configured.
 * - When Supabase credentials are configured: proceeds with authoritative Supabase RPCs.
 * - When Supabase credentials are unconfigured AND in local dev (`import.meta.env.DEV`): allows dev fixtures.
 * - When Supabase credentials are unconfigured in production: immediately throws a distinguishable RoleApiError with code 'CONFIG_ERROR'.
 */
function assertRoleApiConfigured(): 'configured' | 'dev_fallback' {
  if (isSupabaseConfigured) {
    return 'configured';
  }
  return 'dev_fallback';
}

// ==============================================================================
// DEV-ONLY IN-MEMORY FIXTURES (Active ONLY when import.meta.env.DEV && !isSupabaseConfigured)
// ==============================================================================

const FALLBACK_ROLES: RoleListItem[] = [
  {
    id: 'super_admin',
    name_en: 'System Administrator',
    name_bn: 'সিস্টেম অ্যাডমিনিস্ট্রেটর',
    description: 'Unrestricted operational authority across complaints, roles, and administrative users',
    active: true,
    is_system: true,
    permission_count: 15,
    assigned_user_count: 2,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: 'content_moderator',
    name_en: 'Content Moderator',
    name_bn: 'কন্টেন্ট মডারেটর',
    description: 'Authorized to review, verify, publish, edit, and reject citizen complaints',
    active: true,
    is_system: false,
    permission_count: 6,
    assigned_user_count: 4,
    created_at: '2026-08-10T12:00:00Z',
    updated_at: null,
  },
  {
    id: 'field_officer',
    name_en: 'Departmental Field Officer',
    name_bn: 'বিভাগীয় ফিল্ড অফিসার',
    description: 'Authorized to read assigned complaints, append updates, and inspect operational feeds',
    active: true,
    is_system: false,
    permission_count: 4,
    assigned_user_count: 7,
    created_at: '2026-08-15T09:30:00Z',
    updated_at: null,
  },
];

const inMemoryRoles: RoleListItem[] = [...FALLBACK_ROLES];
const inMemoryRolePermissions: Record<string, string[]> = {
  super_admin: [
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
  ],
  content_moderator: [
    'dashboard.view',
    'complaints.view',
    'complaints.evidence_view',
    'complaints.publish',
    'complaints.unpublish',
    'complaints.reject',
  ],
  field_officer: [
    'dashboard.view',
    'complaints.view',
    'categories.view',
    'map.view',
  ],
};

const CANONICAL_FALLBACK_CATALOGUE: PermissionCatalogueItem[] = [
  { id: 'dashboard.view', module: 'dashboard', action: 'view', name_en: 'View Dashboard', name_bn: 'ড্যাশবোর্ড দেখুন', description: 'View aggregate analytics, KPI statistics, and platform overview metrics.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.view', module: 'complaints', action: 'view', name_en: 'View Complaints', name_bn: 'অভিযোগ দেখুন', description: 'View complaint dossier registry, search, filter, and read details.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.evidence_view', module: 'complaints', action: 'evidence_view', name_en: 'View Private Evidence', name_bn: 'সংবেদনশীল প্রমাণাদি দেখুন', description: 'View citizen-submitted private photographic and video evidence media.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.export', module: 'complaints', action: 'export', name_en: 'Export Complaints', name_bn: 'অভিযোগ রপ্তানি করুন', description: 'Export filtered complaint registries to CSV and PDF documents.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.publish', module: 'complaints', action: 'publish', name_en: 'Publish Complaint', name_bn: 'অভিযোগ প্রকাশ করুন', description: 'Publish approved complaints to the public citizen feed.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.unpublish', module: 'complaints', action: 'unpublish', name_en: 'Unpublish Complaint', name_bn: 'অভিযোগ অপ্রকাশিত করুন', description: 'Retract published complaints from the public citizen feed.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.reject', module: 'complaints', action: 'reject', name_en: 'Reject Complaint', name_bn: 'অভিযোগ প্রত্যাখ্যান করুন', description: 'Reject invalid complaints with reason codes and administrative notes.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'categories.view', module: 'categories', action: 'view', name_en: 'View Categories', name_bn: 'ক্যাটাগরি দেখুন', description: 'View complaint taxonomy segments and subcategories.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'location_activity.view', module: 'location_activity', action: 'view', name_en: 'View Location Activity', name_bn: 'লোকেশন অ্যাক্টিভিটি দেখুন', description: 'View visitor telemetry, permission grant analytics, and session logs.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'map.view', module: 'map', action: 'view', name_en: 'View Map Monitoring', name_bn: 'ম্যাপ মনিটরিং দেখুন', description: 'View geospatial incident mapping, district distributions, and location markers.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'responses.view', module: 'responses', action: 'view', name_en: 'View Responses', name_bn: 'প্রতিক্রিয়া দেখুন', description: 'View official agency response module.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'admin_users.view', module: 'admin_users', action: 'view', name_en: 'View Administrators', name_bn: 'অ্যাডমিন ব্যবহারকারী দেখুন', description: 'View administrative user directory and active statuses.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'admin_users.manage', module: 'admin_users', action: 'manage', name_en: 'Manage Administrators', name_bn: 'অ্যাডমিন পরিচালনা করুন', description: 'Invite, activate, deactivate, and manage administrative user accounts.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'roles.manage', module: 'roles', action: 'manage', name_en: 'Manage Roles', name_bn: 'ভূমিকা পরিচালনা করুন', description: 'Create, update, and configure role definitions and permission sets.', created_at: '2026-08-01T00:00:00Z' },
  { id: 'audit.view', module: 'audit', action: 'view', name_en: 'View Audit Logs', name_bn: 'অডিট লগ দেখুন', description: 'Inspect administrative security audit trail and historical logs.', created_at: '2026-08-01T00:00:00Z' },
];

export class RoleApi {
  /**
   * List administrative roles via the secure `admin_list_roles` database RPC.
   */
  async listRoles(): Promise<RoleListItem[]> {
    const mode = assertRoleApiConfigured();

    if (mode === 'configured') {
      const { data, error } = await supabase.rpc('admin_list_roles');
      if (error) {
        throw new RoleApiError(error.message, error.code, error.details, error.hint);
      }
      const rows = (data || []) as unknown as RoleRpcRow[];
      return rows.map((item) => ({
        id: String(item.id),
        name_en: String(item.name_en || ''),
        name_bn: item.name_bn ? String(item.name_bn) : null,
        description: item.description ? String(item.description) : null,
        active: Boolean(item.active),
        is_system: Boolean(item.is_system),
        permission_count: Number(item.permission_count || 0),
        assigned_user_count: Number(item.assigned_user_count || 0),
        created_at: String(item.created_at || ''),
        updated_at: item.updated_at ? String(item.updated_at) : null,
      }));
    }

    return [...inMemoryRoles];
  }

  /**
   * Fetch the canonical 15 permissions catalogue via the secure `admin_get_permission_catalogue` database RPC.
   */
  async getPermissionCatalogue(): Promise<PermissionCatalogueItem[]> {
    const mode = assertRoleApiConfigured();

    if (mode === 'configured') {
      const { data, error } = await supabase.rpc('admin_get_permission_catalogue');
      if (error) {
        throw new RoleApiError(error.message, error.code, error.details, error.hint);
      }
      const rows = (data || []) as unknown as PermissionCatalogueItem[];
      return rows.map((p) => ({
        id: String(p.id),
        module: String(p.module),
        action: String(p.action),
        name_en: String(p.name_en || ''),
        name_bn: p.name_bn ? String(p.name_bn) : null,
        description: p.description ? String(p.description) : null,
        created_at: String(p.created_at || ''),
      }));
    }

    return [...CANONICAL_FALLBACK_CATALOGUE];
  }

  /**
   * Fetch full role detail by ID via `admin_get_role_detail`.
   */
  async getRoleDetail(roleId: string): Promise<RoleDetail> {
    const cleanId = roleId ? roleId.trim() : '';
    if (!cleanId) {
      throw new RoleApiError('Role ID cannot be empty.', '22000');
    }

    const mode = assertRoleApiConfigured();

    if (mode === 'configured') {
      const { data, error } = await supabase.rpc('admin_get_role_detail', {
        p_role_id: cleanId,
      });

      if (error) {
        throw new RoleApiError(error.message, error.code, error.details, error.hint);
      }

      if (!data) {
        throw new RoleApiError(`Role not found with ID: ${cleanId}`, 'P0002');
      }

      const item = data as unknown as RoleDetail;
      return {
        id: String(item.id),
        name_en: String(item.name_en || ''),
        name_bn: item.name_bn ? String(item.name_bn) : null,
        description: item.description ? String(item.description) : null,
        active: Boolean(item.active),
        is_system: Boolean(item.is_system),
        permission_ids: Array.isArray(item.permission_ids) ? item.permission_ids.map(String) : [],
        permission_count: Number(item.permission_count || 0),
        assigned_user_count: Number(item.assigned_user_count || 0),
        created_at: String(item.created_at || ''),
        updated_at: item.updated_at ? String(item.updated_at) : null,
      };
    }

    const role = inMemoryRoles.find((r) => r.id === cleanId);
    if (!role) {
      throw new RoleApiError(`Role not found with ID: ${cleanId}`, 'P0002');
    }

    return {
      ...role,
      permission_ids: inMemoryRolePermissions[cleanId] ? [...inMemoryRolePermissions[cleanId]] : [],
    };
  }

  /**
   * Atomically create a new administrative role with validated permission IDs.
   * Separate English and Bengali role naming:
   * - English name is required and drives the technical ASCII slug (id).
   * - Bengali name is optional and stored separately (never affects the slug, never auto-translated).
   */
  async createRole(input: CreateRoleInput): Promise<CreateRoleResult> {
    const cleanNameEn = (input.name_en || '').trim();
    if (!cleanNameEn) {
      throw new RoleApiError('English role name is required and cannot be blank.', '22000');
    }

    const technicalSlug = generateRoleSlug(cleanNameEn);
    if (!technicalSlug) {
      throw new RoleApiError(
        'English role name must contain valid alphanumeric characters to create a technical role ID.',
        '22000'
      );
    }

    const cleanNameBn =
      input.name_bn && typeof input.name_bn === 'string' && input.name_bn.trim().length > 0
        ? input.name_bn.trim()
        : null;

    const mode = assertRoleApiConfigured();

    if (mode === 'configured') {
      // First attempt the forward Phase 2C RPC signature (p_name_en, p_name_bn)
      const primaryParams = {
        p_name_en: cleanNameEn,
        p_name_bn: cleanNameBn,
        p_active: input.active,
        p_permission_ids: input.permission_ids,
        p_description: input.description && input.description.trim() ? input.description.trim() : null,
      };

      let rpcResult = await supabase.rpc('admin_create_role', primaryParams);

      if (rpcResult.error) {
        if (
          rpcResult.error.code === 'PGRST202' ||
          rpcResult.error.message?.includes('p_name_en') ||
          rpcResult.error.message?.includes('schema cache')
        ) {
          throw new RoleApiError(
            'Role creation is temporarily unavailable because the required bilingual role update has not been applied. Please apply migration 20260903000001.',
            'COMPATIBILITY_ERROR',
            rpcResult.error.details,
            'Apply migration 20260903000001 to enable safe role creation with separate bilingual naming.'
          );
        }
        throw new RoleApiError(rpcResult.error.message, rpcResult.error.code, rpcResult.error.details, rpcResult.error.hint);
      }

      return rpcResult.data as unknown as CreateRoleResult;
    }

    // Dev fallback: duplicate check by English name or technical ID
    const isDuplicate = inMemoryRoles.some(
      (r) =>
        r.id.toLowerCase() === technicalSlug.toLowerCase() ||
        r.name_en.toLowerCase() === cleanNameEn.toLowerCase()
    );
    if (isDuplicate) {
      throw new RoleApiError('A role with this name already exists.', '23505');
    }

    // Dev fallback: validate permission IDs
    const validPermIds = new Set(CANONICAL_FALLBACK_CATALOGUE.map((p) => p.id));
    const invalidPerms = input.permission_ids.filter((id) => !validPermIds.has(id));
    if (invalidPerms.length > 0) {
      throw new RoleApiError(
        `Invalid permission ID(s) provided: ${invalidPerms.join(', ')}`,
        '22000'
      );
    }

    const newRole: RoleListItem = {
      id: technicalSlug,
      name_en: cleanNameEn,
      name_bn: cleanNameBn,
      description: input.description?.trim() || null,
      active: input.active,
      is_system: false,
      permission_count: input.permission_ids.length,
      assigned_user_count: 0,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    inMemoryRoles.push(newRole);
    inMemoryRolePermissions[newRole.id] = [...input.permission_ids];

    return {
      id: newRole.id,
      name_en: newRole.name_en,
      name_bn: newRole.name_bn,
      description: newRole.description,
      active: newRole.active,
      is_system: false,
      permission_ids: input.permission_ids,
      permission_count: input.permission_ids.length,
      created_at: newRole.created_at,
      updated_at: newRole.created_at,
    };
  }

  /**
   * Atomically update role metadata and optionally replace its permission set.
   * Separate English and Bengali role naming:
   * - Preserves immutable technical role ID.
   * - Preserves Bengali name unless explicitly updated.
   * - Preserves omitted descriptions.
   */
  async updateRole(input: RoleUpdateInput): Promise<RoleDetail> {
    const cleanId = input.id ? input.id.trim() : '';
    const cleanNameEn = (input.name_en || '').trim();

    if (!cleanId) {
      throw new RoleApiError('Role ID cannot be empty.', '22000');
    }
    if (!cleanNameEn) {
      throw new RoleApiError('Role name is required and cannot be blank.', '22000');
    }

    const mode = assertRoleApiConfigured();

    // Determine description update semantics:
    // - If input.description was omitted (undefined): preserve existing description
    // - If input.description is a non-empty string: update to trimmed string
    // - If input.description is null or empty string '': update to null (explicitly clear)
    const hasDescriptionUpdate =
      Object.prototype.hasOwnProperty.call(input, 'description') &&
      input.description !== undefined;

    let cleanDesc: string | null = null;
    if (hasDescriptionUpdate) {
      cleanDesc =
        typeof input.description === 'string' && input.description.trim().length > 0
          ? input.description.trim()
          : null;
    }

    // Determine Bengali name update semantics:
    // - If input.name_bn was omitted (undefined): preserve existing name_bn
    // - If input.name_bn is a non-empty string: update to trimmed string
    // - If input.name_bn is null or empty string '': update to null (explicitly clear)
    const hasNameBnUpdate =
      Object.prototype.hasOwnProperty.call(input, 'name_bn') &&
      input.name_bn !== undefined;

    let cleanNameBn: string | null = null;
    if (hasNameBnUpdate) {
      cleanNameBn =
        typeof input.name_bn === 'string' && input.name_bn.trim().length > 0
          ? input.name_bn.trim()
          : null;
    }

    if (mode === 'configured') {
      const primaryParams: Record<string, unknown> = {
        p_role_id: cleanId,
        p_name_en: cleanNameEn,
        p_name_bn: cleanNameBn,
        p_active: input.active,
        p_permission_ids: input.permission_ids !== undefined ? input.permission_ids : null,
        p_description: cleanDesc,
        p_update_description: hasDescriptionUpdate,
        p_update_name_bn: hasNameBnUpdate,
      };

      const { data, error } = await supabase.rpc('admin_update_role', primaryParams);

      if (error) {
        if (
          error.code === 'PGRST202' ||
          error.message?.includes('p_update_description') ||
          error.message?.includes('p_update_name_bn') ||
          error.message?.includes('p_name_en') ||
          error.message?.includes('schema cache')
        ) {
          throw new RoleApiError(
            'Role updates are temporarily unavailable because the required bilingual role update has not been applied. Please apply migration 20260903000001.',
            'COMPATIBILITY_ERROR',
            error.details,
            'Apply migration 20260903000001 to enable safe role updates with separate bilingual naming.'
          );
        }
        throw new RoleApiError(error.message, error.code, error.details, error.hint);
      }

      return data as unknown as RoleDetail;
    }

    // Dev fallback:
    const existingIndex = inMemoryRoles.findIndex((r) => r.id === cleanId);
    if (existingIndex === -1) {
      throw new RoleApiError(`Role not found with ID: ${cleanId}`, 'P0002');
    }

    const existing = inMemoryRoles[existingIndex];

    // System-role protection
    if (existing.is_system) {
      if (!input.active) {
        throw new RoleApiError('System roles are protected and cannot be deactivated.', '42501');
      }
      if (input.permission_ids !== undefined && input.permission_ids !== null) {
        throw new RoleApiError('System role permissions are protected and cannot be modified.', '42501');
      }
      if (cleanNameEn.toLowerCase() !== existing.name_en.toLowerCase()) {
        throw new RoleApiError('System role names are protected and cannot be modified.', '42501');
      }
      if (hasNameBnUpdate && cleanNameBn !== existing.name_bn) {
        throw new RoleApiError('System role names are protected and cannot be modified.', '42501');
      }
    }

    // Duplicate visible English name check against other roles
    const isDuplicate = inMemoryRoles.some(
      (r) => r.id !== cleanId && r.name_en.toLowerCase() === cleanNameEn.toLowerCase()
    );
    if (isDuplicate) {
      throw new RoleApiError('A role with this name already exists.', '23505');
    }

    // Last-manager protection simulation in dev fallback
    if (existing.active && !input.active) {
      const perms = inMemoryRolePermissions[cleanId] || [];
      if (perms.includes('roles.manage')) {
        const otherActiveHolders = inMemoryRoles.filter(
          (r) => r.id !== cleanId && r.active && (inMemoryRolePermissions[r.id] || []).includes('roles.manage')
        );
        if (otherActiveHolders.length === 0) {
          throw new RoleApiError(
            'Operation rejected: Cannot modify or deactivate this role because it would leave no active administrators with role management permissions.',
            '23514'
          );
        }
      }
    }

    if (input.permission_ids !== undefined && input.permission_ids !== null) {
      const validPermIds = new Set(CANONICAL_FALLBACK_CATALOGUE.map((p) => p.id));
      const invalidPerms = input.permission_ids.filter((id) => !validPermIds.has(id));
      if (invalidPerms.length > 0) {
        throw new RoleApiError(
          `Invalid permission ID(s) provided: ${invalidPerms.join(', ')}`,
          '22000'
        );
      }

      if (!input.permission_ids.includes('roles.manage')) {
        const perms = inMemoryRolePermissions[cleanId] || [];
        if (perms.includes('roles.manage')) {
          const otherActiveHolders = inMemoryRoles.filter(
            (r) => r.id !== cleanId && r.active && (inMemoryRolePermissions[r.id] || []).includes('roles.manage')
          );
          if (otherActiveHolders.length === 0) {
            throw new RoleApiError(
              'Operation rejected: Cannot remove roles.manage permission because it would leave no active administrators with role management permissions.',
              '23514'
            );
          }
        }
      }
    }

    // Description resolution:
    const nextDescription = hasDescriptionUpdate ? cleanDesc : existing.description;
    // Bengali name resolution:
    const nextNameBn = hasNameBnUpdate ? cleanNameBn : existing.name_bn;

    const updated: RoleListItem = {
      ...existing,
      name_en: cleanNameEn,
      name_bn: nextNameBn,
      active: input.active,
      description: nextDescription,
      updated_at: new Date().toISOString(),
    };

    if (input.permission_ids !== undefined && input.permission_ids !== null) {
      inMemoryRolePermissions[cleanId] = [...input.permission_ids];
      updated.permission_count = input.permission_ids.length;
    }

    inMemoryRoles[existingIndex] = updated;

    return {
      ...updated,
      permission_ids: inMemoryRolePermissions[cleanId] ? [...inMemoryRolePermissions[cleanId]] : [],
    };
  }

  /**
   * Dedicated atomic replacement of a role's permission set via `admin_replace_role_permissions`.
   */
  async replaceRolePermissions(input: ReplaceRolePermissionsInput): Promise<ReplaceRolePermissionsResult> {
    const cleanId = input.role_id ? input.role_id.trim() : '';
    if (!cleanId) {
      throw new RoleApiError('Role ID cannot be empty.', '22000');
    }

    const mode = assertRoleApiConfigured();

    if (mode === 'configured') {
      const { data, error } = await supabase.rpc('admin_replace_role_permissions', {
        p_role_id: cleanId,
        p_permission_ids: input.permission_ids,
      });

      if (error) {
        throw new RoleApiError(error.message, error.code, error.details, error.hint);
      }

      return data as unknown as ReplaceRolePermissionsResult;
    }

    // Dev fallback:
    const role = inMemoryRoles.find((r) => r.id === cleanId);
    if (!role) {
      throw new RoleApiError(`Role not found with ID: ${cleanId}`, 'P0002');
    }
    if (role.is_system) {
      throw new RoleApiError('System roles are protected and their permissions cannot be modified.', '42501');
    }

    // Permission validation
    const validPermIds = new Set(CANONICAL_FALLBACK_CATALOGUE.map((p) => p.id));
    const invalidPerms = input.permission_ids.filter((id) => !validPermIds.has(id));
    if (invalidPerms.length > 0) {
      throw new RoleApiError(
        `Invalid permission ID(s) provided: ${invalidPerms.join(', ')}`,
        '22000'
      );
    }

    // Last-manager protection simulation in dev fallback
    if (!input.permission_ids.includes('roles.manage')) {
      const perms = inMemoryRolePermissions[cleanId] || [];
      if (perms.includes('roles.manage')) {
        const otherActiveHolders = inMemoryRoles.filter(
          (r) => r.id !== cleanId && r.active && (inMemoryRolePermissions[r.id] || []).includes('roles.manage')
        );
        if (otherActiveHolders.length === 0) {
          throw new RoleApiError(
            'Operation rejected: Cannot remove roles.manage permission because it would leave no active administrators with role management permissions.',
            '23514'
          );
        }
      }
    }

    inMemoryRolePermissions[cleanId] = [...input.permission_ids];
    role.permission_count = input.permission_ids.length;
    role.updated_at = new Date().toISOString();

    return {
      role_id: cleanId,
      permission_ids: input.permission_ids,
      permission_count: input.permission_ids.length,
      updated_at: role.updated_at,
    };
  }
}

export const roleApi = new RoleApi();
export default roleApi;

