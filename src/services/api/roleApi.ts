/**
 * Role Management API Service Layer
 * Interacts exclusively with Supabase RPC `admin_list_roles`.
 * Strictly read-only: no direct table reads, no mock data fallbacks, no mutation bypasses.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RoleListItem, RoleRpcRow, RoleApiError } from '@/types/Role';

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
}

export const roleApi = new RoleApi();
export default roleApi;

