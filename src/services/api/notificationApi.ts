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
} from '@/types/Notification';

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

// Dev fallback in-memory data for environments without live Supabase
const FALLBACK_NOTIFICATIONS: AdminNotification[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    event_group_id: 'e1111111-1111-1111-1111-111111111111',
    event_key: 'complaint.submitted',
    category: 'complaint',
    layer: 'action_required',
    severity: 'action_required',
    audience_mode: 'broadcast',
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
    audience_mode: 'broadcast',
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
    target_type: 'user',
    target_id: 'u-operator-01',
    target_label: 'Field Moderator',
    title_en: 'Administrative role assignment modified',
    title_bn: 'প্রশাসনিক ভূমিকা বরাদ্দ পরিবর্তন করা হয়েছে',
    body_en: 'Your administrative role was elevated to Senior Moderator.',
    body_bn: 'আপনার প্রশাসনিক ভূমিকা সিনিয়র মডারেটরে উন্নীত করা হয়েছে।',
    metadata: { user_id: 'u-operator-01' },
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
    audience_mode: 'role_scoped',
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
    audience_mode: 'broadcast',
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
    target_type: 'user',
    target_id: 'u-field-99',
    target_label: 'Zonal Inspector',
    title_en: 'New administrator account provisioned',
    title_bn: 'নতুন প্রশাসক অ্যাকাউন্ট যুক্ত করা হয়েছে',
    body_en: 'Administrator account for Zonal Inspector was successfully created.',
    body_bn: 'জোনাল পরিদর্শকের জন্য নতুন প্রশাসক অ্যাকাউন্ট সফলভাবে তৈরি করা হয়েছে।',
    metadata: { user_id: 'u-field-99' },
    route: '/users',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    read_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
  },
];

let inMemoryFallbackNotifications = [...FALLBACK_NOTIFICATIONS];

export const notificationApi = {
  /**
   * Fetch paginated list of notifications for the current active admin.
   * Utilizes the authoritative RPC: public.admin_list_notifications
   */
  async listNotifications(params?: NotificationListParams): Promise<AdminNotification[]> {
    if (!isSupabaseConfigured) {
      let list = [...inMemoryFallbackNotifications];
      if (params?.unread_only) {
        list = list.filter((n) => !n.read_at);
      }
      if (params?.category) {
        if (params.category === 'security') {
          list = list.filter(
            (n) =>
              n.category === 'security' ||
              n.severity === 'security' ||
              n.layer === 'security_privilege'
          );
        } else {
          list = list.filter((n) => n.category === params.category);
        }
      }
      if (params?.before_created_at) {
        list = list.filter(
          (n) => new Date(n.created_at).getTime() < new Date(params.before_created_at!).getTime()
        );
      }
      const limit = params?.limit ?? 20;
      return list.slice(0, limit);
    }

    const isSecurityFilter = params?.category === 'security';
    const rpcCategory = isSecurityFilter ? null : params?.category || null;

    const { data, error } = await supabase.rpc('admin_list_notifications', {
      p_limit: params?.limit ?? 20,
      p_before_created_at: params?.before_created_at || null,
      p_before_id: params?.before_id || null,
      p_unread_only: params?.unread_only ?? false,
      p_category: rpcCategory,
    });

    if (error) {
      console.error('admin_list_notifications RPC failed:', error);
      throw new NotificationApiError(error.message, error.code, error.details);
    }

    let results = Array.isArray(data) ? (data as AdminNotification[]) : [];
    if (isSecurityFilter) {
      results = results.filter(
        (n) =>
          n.category === 'security' ||
          n.severity === 'security' ||
          n.layer === 'security_privilege'
      );
    }

    return results;
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
