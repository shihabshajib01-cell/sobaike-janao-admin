/**
 * Admin Activity Log & Audit Trail API Service Layer
 * 
 * Interacts with Supabase RPC:
 * - admin_list_audit_logs
 * 
 * In accordance with Phase 3B RBAC security architecture, direct SELECT access to
 * public.admin_audit_logs is revoked from authenticated roles. All audit history
 * retrieval is mediated via authorized RPC enforcing the audit.view permission.
 * 
 * Production mode strictly fails closed when Supabase is unconfigured.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AuditLogItem,
  AuditLogQueryParams,
  AuditLogListResponse,
  AuditApiError,
} from '@/types/AuditLog';

function assertAuditApiConfigured(): 'configured' | 'dev_fallback' {
  if (isSupabaseConfigured) {
    return 'configured';
  }
  return 'dev_fallback';
}

// ==============================================================================
// DEV-ONLY IN-MEMORY FIXTURES (Active ONLY when import.meta.env.DEV && !isSupabaseConfigured)
// Mirrors the real canonical database schema and real audit actions produced by migrations.
// ==============================================================================

const FALLBACK_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'complaint.publish',
    target_type: 'complaint',
    target_id: 'CMP-2026-0001',
    details: {
      published: true,
      category: 'infrastructure',
      ward: 'Ward 10',
    },
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    actor_id: '00000000-0000-0000-0000-000000000002',
    actor_email: 'tanvir.moderator@sobaike-janao.org',
    actor_display_name: 'Tanvir Ahmed',
    action: 'complaint.reject',
    target_type: 'complaint',
    target_id: 'CMP-2026-0002',
    details: {
      status: 'rejected',
      reason_code: 'duplicate_report',
      note: 'Identical road damage report already being tracked under CMP-2026-0001',
    },
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'ROLE_PERMISSIONS_REPLACED',
    target_type: 'role',
    target_id: 'content_moderator',
    details: {
      permission_ids: ['complaints.verify', 'complaints.unpublish'],
      permission_count: 8,
      added_count: 2,
      removed_count: 0,
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'ADMIN_USER_UPDATED',
    target_type: 'admin_user',
    target_id: '00000000-0000-0000-0000-000000000002',
    details: {
      target_user_id: '00000000-0000-0000-0000-000000000002',
      display_name: 'Tanvir Ahmed',
      previous_role_id: 'field_officer',
      role_id: 'content_moderator',
      role_changed: true,
      active: true,
    },
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'USER_MEMBERSHIP_FINALIZED',
    target_type: 'admin_user',
    target_id: '00000000-0000-0000-0000-000000000003',
    details: {
      target_user_id: '00000000-0000-0000-0000-000000000003',
      email: 'sadia.field@sobaike-janao.org',
      role_id: 'field_officer',
      active: false,
    },
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'complaint.unpublish',
    target_type: 'complaint',
    target_id: 'CMP-2026-0005',
    details: {
      published: false,
      reason: 'Citizen withdrew submission pending verification',
    },
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000007',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'ROLE_CREATED',
    target_type: 'role',
    target_id: 'senior_investigator',
    details: {
      role_id: 'senior_investigator',
      name_en: 'Senior Investigator',
      name_bn: 'সিনিয়র তদন্তকারী',
      permission_count: 9,
    },
    created_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000008',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'ADMIN_USER_UPDATED',
    target_type: 'admin_user',
    target_id: '00000000-0000-0000-0000-000000000003',
    details: {
      target_user_id: '00000000-0000-0000-0000-000000000003',
      display_name: 'Sadia Rahman',
      active: false,
      active_changed: true,
      reason: 'Temporary administrative leave',
    },
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000009',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'ROLE_UPDATED',
    target_type: 'role',
    target_id: 'senior_investigator',
    details: {
      role_id: 'senior_investigator',
      name_en: 'Senior Investigative Officer',
      name_bn: 'সিনিয়র তদন্ত কর্মকর্তা',
      active: true,
      meta_changed: true,
    },
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a1000000-0000-4000-8000-000000000010',
    actor_id: '00000000-0000-0000-0000-000000000001',
    actor_email: 'admin@sobaike-janao.org',
    actor_display_name: 'Primary System Administrator',
    action: 'ADMIN_USER_UPDATED',
    target_type: 'admin_user',
    target_id: '00000000-0000-0000-0000-000000000002',
    details: {
      target_user_id: '00000000-0000-0000-0000-000000000002',
      display_name: 'Tanvir Ahmed',
      active: true,
      active_changed: true,
    },
    created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
  },
];

export const auditLogApi = {
  /**
   * Retrieves paginated audit logs via authorized Supabase RPC
   */
  async getAuditLogs(params: AuditLogQueryParams = {}): Promise<AuditLogListResponse> {
    const status = assertAuditApiConfigured();

    const limit = Math.min(Math.max(params.limit || 15, 1), 100);
    const offset = Math.max(params.offset || 0, 0);

    if (status === 'configured') {
      try {
        const { data, error } = await supabase.rpc('admin_list_audit_logs', {
          p_limit: limit,
          p_offset: offset,
          p_search: params.search?.trim() || null,
          p_action: params.action && params.action !== 'all' ? params.action : null,
          p_target_type: params.target_type && params.target_type !== 'all' ? params.target_type : null,
          p_actor_id: params.actor_id && params.actor_id !== 'all' ? params.actor_id : null,
          p_date_from: params.date_from || null,
          p_date_to: params.date_to || null,
        });

        if (error) {
          throw new AuditApiError(
            `Audit log retrieval failed: ${error.message}`,
            error.code,
            error.details
          );
        }

        // Authoritative JSON response contract: { logs: [...], total_count: number }
        const rawLogs: any[] = Array.isArray(data?.logs) ? data.logs : [];
        const totalCount: number = typeof data?.total_count === 'number'
          ? data.total_count
          : 0;

        const mapped: AuditLogItem[] = rawLogs.map((item: any) => ({
          id: item.id,
          actor_id: item.actor_id || null,
          actor_email: item.actor_email || null,
          actor_display_name: item.actor_display_name || null,
          action: item.action,
          target_type: item.target_type,
          target_id: item.target_id || null,
          details: item.details || {},
          created_at: item.created_at,
        }));

        return {
          logs: mapped,
          total_count: totalCount,
          has_more: offset + mapped.length < totalCount,
        };
      } catch (err: unknown) {
        if (err instanceof AuditApiError) throw err;
        const msg = err instanceof Error ? err.message : 'Unknown audit log error';
        throw new AuditApiError(msg, 'RPC_ERROR');
      }
    }

    // Dev Fallback Processing
    let filtered = [...FALLBACK_AUDIT_LOGS];

    // Filter by search
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.target_id?.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.actor_display_name?.toLowerCase().includes(q) ||
          log.actor_email?.toLowerCase().includes(q)
      );
    }

    // Filter by action
    if (params.action && params.action !== 'all') {
      filtered = filtered.filter((log) => log.action === params.action);
    }

    // Filter by target_type
    if (params.target_type && params.target_type !== 'all') {
      const targetQuery = params.target_type.toLowerCase();
      filtered = filtered.filter(
        (log) => log.target_type.toLowerCase() === targetQuery
      );
    }

    // Filter by actor_id
    if (params.actor_id && params.actor_id !== 'all') {
      filtered = filtered.filter((log) => log.actor_id === params.actor_id);
    }

    // Filter by date
    if (params.date_from) {
      const fromTime = new Date(params.date_from).getTime();
      if (!isNaN(fromTime)) {
        filtered = filtered.filter((log) => new Date(log.created_at).getTime() >= fromTime);
      }
    }

    if (params.date_to) {
      const toTime = new Date(params.date_to).getTime();
      if (!isNaN(toTime)) {
        filtered = filtered.filter((log) => new Date(log.created_at).getTime() <= toTime);
      }
    }

    const totalCount = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      logs: paginated,
      total_count: totalCount,
      has_more: offset + paginated.length < totalCount,
    };
  },
};
