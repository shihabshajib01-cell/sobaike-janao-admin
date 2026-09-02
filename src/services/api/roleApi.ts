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

export class RoleApi {
  /**
   * Validate Supabase configuration before invoking RPC
   */
  private checkConfig(): void {
    if (!isSupabaseConfigured) {
      throw new RoleApiError('Supabase client is not configured.');
    }
  }

  /**
   * List administrative roles via the secure `admin_list_roles` database RPC.
   * Returns role summaries including computed permission counts and assigned user counts.
   */
  async listRoles(): Promise<RoleListItem[]> {
    this.checkConfig();

    const { data, error } = await supabase.rpc('admin_list_roles');

    if (error) {
      console.error('Failed to list roles via RPC admin_list_roles:', error);
      throw new RoleApiError(
        error.message || 'Failed to load roles',
        error.code,
        error.details,
        error.hint
      );
    }

    if (!data) {
      return [];
    }

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

  /**
   * Fetch the canonical 15 permissions catalogue via the secure `admin_get_permission_catalogue` database RPC.
   * Returns permissions grouped/sorted by module and action.
   */
  async getPermissionCatalogue(): Promise<PermissionCatalogueItem[]> {
    this.checkConfig();

    const { data, error } = await supabase.rpc('admin_get_permission_catalogue');

    if (error) {
      console.error('Failed to load permission catalogue via RPC admin_get_permission_catalogue:', error);
      throw new RoleApiError(
        error.message || 'Failed to load permission catalogue',
        error.code,
        error.details,
        error.hint
      );
    }

    if (!data) {
      return [];
    }

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

  /**
   * Atomically create a new administrative role with validated permission IDs via `admin_create_role` RPC.
   * Creates role, assigns permissions, and generates audit log in a single transaction.
   */
  async createRole(input: CreateRoleInput): Promise<CreateRoleResult> {
    this.checkConfig();

    const { data, error } = await supabase.rpc('admin_create_role', {
      p_name: input.name.trim(),
      p_active: input.active,
      p_permission_ids: input.permission_ids,
      p_description: input.description && input.description.trim() ? input.description.trim() : null,
    });

    if (error) {
      console.error('Failed to create role via RPC admin_create_role:', error);
      throw new RoleApiError(
        error.message || 'Failed to create role',
        error.code,
        error.details,
        error.hint
      );
    }

    const result = data as unknown as CreateRoleResult;
    return result;
  }
}

export const roleApi = new RoleApi();
export default roleApi;

