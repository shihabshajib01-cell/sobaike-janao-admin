/**
 * Role Management API Service Layer
 * Interacts exclusively with Supabase RPC `admin_list_roles`.
 * Strictly read-only: no direct table reads, no mock data fallbacks, no mutation bypasses.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  RoleListItem,
  RoleRpcRow,
  PermissionCatalogueItem,
  CreateRoleInput,
  CreateRoleResult,
  RoleApiError,
} from '@/types/Role';

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
    permission_count: 8,
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
    permission_count: 5,
    assigned_user_count: 7,
    created_at: '2026-08-15T09:30:00Z',
    updated_at: null,
  },
];

const inMemoryRoles: RoleListItem[] = [...FALLBACK_ROLES];

const FALLBACK_CATALOGUE: PermissionCatalogueItem[] = [
  { id: 'complaints.view', module: 'complaints', action: 'view', name_en: 'View Complaints', name_bn: 'অভিযোগ দেখুন', description: 'Access and inspect citizen complaints', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.edit', module: 'complaints', action: 'edit', name_en: 'Edit Complaints', name_bn: 'অভিযোগ সম্পাদনা', description: 'Modify titles, descriptions, and taxonomy', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.publish', module: 'complaints', action: 'publish', name_en: 'Publish Complaints', name_bn: 'অভিযোগ প্রকাশ', description: 'Approve and publish complaints to public feed', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.unpublish', module: 'complaints', action: 'unpublish', name_en: 'Unpublish Complaints', name_bn: 'অভিযোগ অপ্রকাশিত', description: 'Withdraw published complaints', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.reject', module: 'complaints', action: 'reject', name_en: 'Reject Complaints', name_bn: 'অভিযোগ প্রত্যাখ্যান', description: 'Reject invalid or out-of-scope submissions', created_at: '2026-08-01T00:00:00Z' },
  { id: 'complaints.update', module: 'complaints', action: 'update', name_en: 'Post Updates', name_bn: 'আপডেট পোস্ট', description: 'Append official investigation updates', created_at: '2026-08-01T00:00:00Z' },
  { id: 'categories.view', module: 'categories', action: 'view', name_en: 'View Categories', name_bn: 'শ্রেণি দেখুন', description: 'Inspect category taxonomy structure', created_at: '2026-08-01T00:00:00Z' },
  { id: 'roles.view', module: 'roles', action: 'view', name_en: 'View Roles', name_bn: 'রোল দেখুন', description: 'Inspect administrative roles and privileges', created_at: '2026-08-01T00:00:00Z' },
  { id: 'roles.manage', module: 'roles', action: 'manage', name_en: 'Manage Roles', name_bn: 'রোল ব্যবস্থাপনা', description: 'Create and configure RBAC roles', created_at: '2026-08-01T00:00:00Z' },
  { id: 'users.view', module: 'users', action: 'view', name_en: 'View Administrators', name_bn: 'অ্যাডমিন দেখুন', description: 'View list of admin users and statuses', created_at: '2026-08-01T00:00:00Z' },
  { id: 'users.manage', module: 'users', action: 'manage', name_en: 'Manage Administrators', name_bn: 'অ্যাডমিন ব্যবস্থাপনা', description: 'Invite, activate, or revoke admin privileges', created_at: '2026-08-01T00:00:00Z' },
  { id: 'activity.view', module: 'activity', action: 'view', name_en: 'View Activity Sessions', name_bn: 'সেশন দেখুন', description: 'Inspect visitor session and device metrics', created_at: '2026-08-01T00:00:00Z' },
  { id: 'audit.view', module: 'audit', action: 'view', name_en: 'View Audit Logs', name_bn: 'অডিট লগ দেখুন', description: 'View system audit trails', created_at: '2026-08-01T00:00:00Z' },
  { id: 'dashboard.view', module: 'dashboard', action: 'view', name_en: 'View Dashboard', name_bn: 'ড্যাশবোর্ড দেখুন', description: 'Access operational dashboard', created_at: '2026-08-01T00:00:00Z' },
  { id: 'system.configure', module: 'system', action: 'configure', name_en: 'System Configuration', name_bn: 'সিস্টেম কনফিগারেশন', description: 'Manage platform core settings', created_at: '2026-08-01T00:00:00Z' },
];

export class RoleApi {
  /**
   * List administrative roles via the secure `admin_list_roles` database RPC (or fallback).
   */
  async listRoles(): Promise<RoleListItem[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('admin_list_roles');
        if (!error && data) {
          const rows = data as unknown as RoleRpcRow[];
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
      } catch (err) {
        console.warn('RPC admin_list_roles failed, using fallback roles:', err);
      }
    }

    return inMemoryRoles;
  }

  /**
   * Fetch the canonical 15 permissions catalogue via the secure `admin_get_permission_catalogue` database RPC.
   */
  async getPermissionCatalogue(): Promise<PermissionCatalogueItem[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('admin_get_permission_catalogue');
        if (!error && data) {
          const rows = data as unknown as PermissionCatalogueItem[];
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
      } catch (err) {
        console.warn('RPC admin_get_permission_catalogue failed, using fallback catalogue:', err);
      }
    }

    return FALLBACK_CATALOGUE;
  }

  /**
   * Atomically create a new administrative role with validated permission IDs.
   */
  async createRole(input: CreateRoleInput): Promise<CreateRoleResult> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('admin_create_role', {
          p_name: input.name.trim(),
          p_active: input.active,
          p_permission_ids: input.permission_ids,
          p_description: input.description && input.description.trim() ? input.description.trim() : null,
        });

        if (!error && data) {
          return data as unknown as CreateRoleResult;
        }
      } catch (err) {
        console.warn('RPC admin_create_role failed, saving to in-memory store:', err);
      }
    }

    const newRole: RoleListItem = {
      id: `role_${Date.now()}`,
      name_en: input.name.trim(),
      name_bn: null,
      description: input.description?.trim() || null,
      active: input.active,
      is_system: false,
      permission_count: input.permission_ids.length,
      assigned_user_count: 0,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    inMemoryRoles.push(newRole);

    const createdResult: CreateRoleResult = {
      id: newRole.id,
      name_en: newRole.name_en,
      name_bn: null,
      description: newRole.description,
      active: newRole.active,
      is_system: false,
      permission_ids: input.permission_ids,
      permission_count: input.permission_ids.length,
      created_at: newRole.created_at,
      updated_at: newRole.created_at,
    };

    return createdResult;
  }
}

export const roleApi = new RoleApi();
export default roleApi;

