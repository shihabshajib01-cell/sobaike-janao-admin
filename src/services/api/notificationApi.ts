/**
 * Notification API Service Layer
 * Interacts with Supabase Notification RPCs:
 * - admin_list_notifications
 * - admin_get_unread_notification_count
 * - admin_mark_notification_read
 * - admin_mark_all_notifications_read
 * 
 * Strictly adheres to Phase 1/2 contracts without modifying or querying tables directly.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  AdminNotification,
  NotificationListParams,
  NotificationListResult,
} from '@/types/Notification';
import { isSecurityNotification } from '@/utils/notificationUtils';

export class NotificationApiError extends Error {
  code?: string;
  details?: string;

  constructor(message: string, code?: string, details?: string) {
    super(message);
    this.name = 'NotificationApiError';
    this.code = code;
    this.details = details;
  }
}

// Dev fallback in-memory data adhering strictly to canonical database schema
const FALLBACK_NOTIFICATIONS: AdminNotification[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    event_group_id: 'e1111111-1111-1111-1111-111111111111',
    event_key: 'complaint.submitted',
    category: 'complaint',
    layer: 'action_required',
    severity: 'action_required',
    audience_mode: 'permission',
    actor_user_id: null,
    actor_display_name: 'Citizen Portal',
    target_type: 'complaint',
    target_id: 'CMP-2026-0001',
    target_label: 'Waterlogging in Mirpur-10',
    title_en: 'New complaint submitted',
    title_bn: 'নতুন অভিযোগ দাখিল করা হয়েছে',
    body_en: 'Complaint CMP-2026-0001 has been submitted and is awaiting moderation review.',
    body_bn: 'অভিযোগ CMP-2026-0001 দাখিল করা হয়েছে এবং মডারেশন পর্যালোচনার জন্য অপেক্ষমাণ।',
    metadata: { complaint_id: 'CMP-2026-0001' },
    route: '/complaints/CMP-2026-0001',
    created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    event_group_id: 'e2222222-2222-2222-2222-222222222222',
    event_key: 'complaint.evidence_attached',
    category: 'complaint',
    layer: 'action_required',
    severity: 'info',
    audience_mode: 'permission',
    actor_user_id: null,
    actor_display_name: 'Citizen Portal',
    target_type: 'complaint',
    target_id: 'CMP-2026-0001',
    target_label: 'Waterlogging evidence photo',
    title_en: 'Evidence attached to complaint',
    title_bn: 'অভিযোগে প্রমাণাদি সংযুক্ত করা হয়েছে',
    body_en: 'Additional photographic evidence was uploaded for CMP-2026-0001.',
    body_bn: 'CMP-2026-0001 অভিযোগের জন্য অতিরিক্ত ছবি প্রমাণ হিসেবে আপলোড করা হয়েছে।',
    metadata: { complaint_id: 'CMP-2026-0001' },
    route: '/complaints/CMP-2026-0001',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    event_group_id: 'e3333333-3333-3333-3333-333333333333',
    event_key: 'admin.role_changed',
    category: 'administration',
    layer: 'security_privilege',
    severity: 'security',
    audience_mode: 'personal',
    actor_user_id: null,
    actor_display_name: 'Superadmin',
    target_type: 'admin_user',
    target_id: 'a0000001-0000-4000-8000-000000000001',
    target_label: 'Field Moderator',
    title_en: 'Administrative role assignment modified',
    title_bn: 'প্রশাসনিক ভূমিকা বরাদ্দ পরিবর্তন করা হয়েছে',
    body_en: 'Your administrative role was elevated to Senior Moderator.',
    body_bn: 'আপনার প্রশাসনিক ভূমিকা সিনিয়র মডারেটরে উন্নীত করা হয়েছে।',
    metadata: { user_id: 'a0000001-0000-4000-8000-000000000001' },
    route: '/users',
    created_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    event_group_id: 'e4444444-4444-4444-4444-444444444444',
    event_key: 'role.permissions_changed',
    category: 'role',
    layer: 'security_privilege',
    severity: 'security',
    audience_mode: 'permission',
    actor_user_id: null,
    actor_display_name: 'Security Admin',
    target_type: 'role',
    target_id: 'field_officer',
    target_label: 'Field Officer',
    title_en: 'Role security permissions updated',
    title_bn: 'ভূমিকার নিরাপত্তা অনুমতিসমূহ হালনাগাদ করা হয়েছে',
    body_en: 'Critical permissions for role "Field Officer" were updated in security audit.',
    body_bn: '"ফিল্ড অফিসার" ভূমিকার জন্য গুরুত্বপূর্ণ নিরাপত্তা অনুমতি অডিট শেষে হালনাগাদ করা হয়েছে।',
    metadata: { role_id: 'field_officer' },
    route: '/roles/field_officer',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    read_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    event_group_id: 'e5555555-5555-5555-5555-555555555555',
    event_key: 'complaint.published',
    category: 'complaint',
    layer: 'workflow_activity',
    severity: 'info',
    audience_mode: 'permission',
    actor_user_id: null,
    actor_display_name: 'Content Moderator',
    target_type: 'complaint',
    target_id: 'CMP-2026-0002',
    target_label: 'Damaged drainage on Green Road',
    title_en: 'Complaint published to public portal',
    title_bn: 'অভিযোগটি নাগরিক পোর্টালে প্রকাশিত হয়েছে',
    body_en: 'Complaint CMP-2026-0002 has been verified and published.',
    body_bn: 'অভিযোগ CMP-2026-0002 যাচাই করা হয়েছে এবং প্রকাশিত হয়েছে।',
    metadata: { complaint_id: 'CMP-2026-0002' },
    route: '/complaints/CMP-2026-0002',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    read_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    event_group_id: 'e6666666-6666-6666-6666-666666666666',
    event_key: 'admin.created',
    category: 'administration',
    layer: 'administrative_oversight',
    severity: 'info',
    audience_mode: 'super_admin_only',
    actor_user_id: null,
    actor_display_name: 'System Admin',
    target_type: 'admin_user',
    target_id: 'a0000099-0000-4000-8000-000000000099',
    target_label: 'Zonal Inspector',
    title_en: 'New administrator account provisioned',
    title_bn: 'নতুন প্রশাসক অ্যাকাউন্ট যুক্ত করা হয়েছে',
    body_en: 'Administrator account for Zonal Inspector was successfully created.',
    body_bn: 'জোনাল পরিদর্শকের জন্য নতুন প্রশাসক অ্যাকাউন্ট সফলভাবে তৈরি করা হয়েছে।',
    metadata: { user_id: 'a0000099-0000-4000-8000-000000000099' },
    route: '/users',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    read_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    event_group_id: 'e7777777-7777-7777-7777-777777777777',
    event_key: 'admin.activated',
    category: 'administration',
    layer: 'administrative_oversight',
    severity: 'info',
    audience_mode: 'super_admin_only',
    actor_user_id: null,
    actor_display_name: 'Superadmin',
    target_type: 'admin_user',
    target_id: 'a0000099-0000-4000-8000-000000000099',
    target_label: 'Zonal Inspector',
    title_en: 'Administrator activated',
    title_bn: 'প্রশাসক সক্রিয় করা হয়েছে',
    body_en: null,
    body_bn: null,
    metadata: { user_id: 'a0000099-0000-4000-8000-000000000099' },
    route: '/users',
    created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    read_at: null,
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    event_group_id: 'e8888888-8888-8888-8888-888888888888',
    event_key: 'role.permissions_changed',
    category: 'role',
    layer: 'security_privilege',
    severity: 'security',
    audience_mode: 'permission',
    actor_user_id: null,
    actor_display_name: 'Security Admin',
    target_type: 'role',
    target_id: 'moderator',
    target_label: 'Moderator',
    title_en: 'Security permissions revoked',
    title_bn: 'নিরাপত্তা অনুমতি বাতিল করা হয়েছে',
    body_en: 'Unpublish permissions revoked during monthly security audit.',
    body_bn: 'মাসিক নিরাপত্তা অডিটের সময় অপ্রকাশের অনুমতি বাতিল করা হয়েছে।',
    metadata: { role_id: 'moderator' },
    route: '/roles/moderator',
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    read_at: null,
  },
];

let inMemoryFallbackNotifications = [...FALLBACK_NOTIFICATIONS];

export const notificationApi = {
  /**
   * Fetch paginated list of notifications for the current active admin.
   * Utilizes the authoritative RPC: public.admin_list_notifications
   * Correctly handles security pagination across multiple backend pages.
   */
  async listNotifications(params?: NotificationListParams): Promise<NotificationListResult> {
    const isSecurityFilter = params?.category === 'security';
    const limit = params?.limit ?? 20;

    // In-memory fallback handler for local/offline testing
    if (!isSupabaseConfigured) {
      let list = [...inMemoryFallbackNotifications];
      if (params?.unread_only) {
        list = list.filter((n) => !n.read_at);
      }
      if (params?.category) {
        if (isSecurityFilter) {
          list = list.filter((n) => isSecurityNotification(n));
        } else {
          list = list.filter((n) => n.category === params.category);
        }
      }
      if (params?.before_created_at) {
        const beforeTime = new Date(params.before_created_at).getTime();
        list = list.filter((n) => {
          const itemTime = new Date(n.created_at).getTime();
          if (itemTime < beforeTime) return true;
          if (itemTime === beforeTime && params.before_id) {
            return n.id < params.before_id;
          }
          return false;
        });
      }
      const pageItems = list.slice(0, limit);
      const result = pageItems as NotificationListResult;
      result.hasMore = list.length > limit;
      return result;
    }

    // Direct RPC call for non-security categories
    if (!isSecurityFilter) {
      const { data, error } = await supabase.rpc('admin_list_notifications', {
        p_limit: limit,
        p_before_created_at: params?.before_created_at || null,
        p_before_id: params?.before_id || null,
        p_unread_only: params?.unread_only ?? false,
        p_category: params?.category || null,
      });

      if (error) {
        console.error('admin_list_notifications RPC failed:', error);
        throw new NotificationApiError(error.message, error.code, error.details);
      }

      const results = (Array.isArray(data) ? (data as AdminNotification[]) : []) as NotificationListResult;
      results.hasMore = results.length === limit;
      return results;
    }

    // Security filter pagination: Keyset pagination loop
    // Fetches backend pages using normal keyset pagination until enough security items
    // are collected for the requested UI page size, or the backend has no more rows.
    const collected: AdminNotification[] = [];
    const seenIds = new Set<string>();

    let cursorCreatedAt = params?.before_created_at || null;
    let cursorId = params?.before_id || null;
    let backendHasMore = true;
    let hasMoreSecurityAfterCollection = false;

    const BACKEND_BATCH_SIZE = 50; // max allowed by RPC
    const visitedCursors = new Set<string>();
    if (cursorCreatedAt && cursorId) {
      visitedCursors.add(`${cursorCreatedAt}_${cursorId}`);
    }

    while (collected.length < limit && backendHasMore) {
      const { data, error } = await supabase.rpc('admin_list_notifications', {
        p_limit: BACKEND_BATCH_SIZE,
        p_before_created_at: cursorCreatedAt,
        p_before_id: cursorId,
        p_unread_only: params?.unread_only ?? false,
        p_category: null, // query all categories because security items have category 'administration' or 'role'
      });

      if (error) {
        console.error('admin_list_notifications RPC failed during security scan:', error);
        throw new NotificationApiError(error.message, error.code, error.details);
      }

      const batch = Array.isArray(data) ? (data as AdminNotification[]) : [];
      if (batch.length === 0) {
        backendHasMore = false;
        hasMoreSecurityAfterCollection = false;
        break;
      }

      const isBatchExhausted = batch.length < BACKEND_BATCH_SIZE;
      if (isBatchExhausted) {
        backendHasMore = false;
      }

      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        if (isSecurityNotification(item)) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            collected.push(item);
          }

          if (collected.length === limit) {
            // Target limit reached. Check if more rows exist in this batch or in next batches
            if (!isBatchExhausted) {
              hasMoreSecurityAfterCollection = true;
            } else {
              hasMoreSecurityAfterCollection = batch
                .slice(i + 1)
                .some((remainingItem) => isSecurityNotification(remainingItem));
            }
            break;
          }
        }
      }

      // If we still need more security items and backend has more rows,
      // update cursor to the last scanned item of this batch to fetch the next batch
      if (collected.length < limit && backendHasMore) {
        const lastBatchItem = batch[batch.length - 1];
        const nextCursorCreatedAt = lastBatchItem?.created_at;
        const nextCursorId = lastBatchItem?.id;

        // Detect cursor stall
        if (
          !nextCursorCreatedAt ||
          !nextCursorId ||
          (nextCursorCreatedAt === cursorCreatedAt && nextCursorId === cursorId)
        ) {
          throw new NotificationApiError(
            'Security pagination failed: cursor did not advance',
            'CURSOR_STALLED'
          );
        }

        const cursorKey = `${nextCursorCreatedAt}_${nextCursorId}`;
        if (visitedCursors.has(cursorKey)) {
          throw new NotificationApiError(
            'Security pagination failed: cursor cycle detected',
            'CURSOR_CYCLE'
          );
        }
        visitedCursors.add(cursorKey);

        cursorCreatedAt = nextCursorCreatedAt;
        cursorId = nextCursorId;
      }
    }

    const result = collected as NotificationListResult;
    // hasMore must reflect whether more security notifications may still exist
    if (collected.length < limit) {
      result.hasMore = false;
    } else {
      result.hasMore = hasMoreSecurityAfterCollection;
    }

    return result;
  },

  /**
   * Retrieve total unread notification count for the current admin.
   * Utilizes authoritative RPC: public.admin_get_unread_notification_count
   */
  async getUnreadCount(): Promise<number> {
    if (!isSupabaseConfigured) {
      return inMemoryFallbackNotifications.filter((n) => !n.read_at).length;
    }

    const { data, error } = await supabase.rpc('admin_get_unread_notification_count');

    if (error) {
      console.error('admin_get_unread_notification_count RPC failed:', error);
      throw new NotificationApiError(error.message, error.code, error.details);
    }

    return Number(data || 0);
  },

  /**
   * Mark a single notification as read.
   * Utilizes authoritative RPC: public.admin_mark_notification_read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!notificationId) return false;

    if (!isSupabaseConfigured) {
      inMemoryFallbackNotifications = inMemoryFallbackNotifications.map((n) =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      );
      return true;
    }

    const { data, error } = await supabase.rpc('admin_mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error('admin_mark_notification_read RPC failed:', error);
      throw new NotificationApiError(error.message, error.code, error.details);
    }

    return Boolean(data);
  },

  /**
   * Mark all unread notifications as read for the current active admin.
   * Utilizes authoritative RPC: public.admin_mark_all_notifications_read
   */
  async markAllAsRead(): Promise<number> {
    if (!isSupabaseConfigured) {
      const now = new Date().toISOString();
      let count = 0;
      inMemoryFallbackNotifications = inMemoryFallbackNotifications.map((n) => {
        if (!n.read_at) {
          count++;
          return { ...n, read_at: now };
        }
        return n;
      });
      return count;
    }

    const { data, error } = await supabase.rpc('admin_mark_all_notifications_read');

    if (error) {
      console.error('admin_mark_all_notifications_read RPC failed:', error);
      throw new NotificationApiError(error.message, error.code, error.details);
    }

    return Number(data || 0);
  },
};

export default notificationApi;
