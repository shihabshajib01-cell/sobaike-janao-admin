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

export const notificationApi = {
  /**
   * Fetch paginated list of notifications for the current active admin.
   * Utilizes the authoritative RPC: public.admin_list_notifications
   * Correctly handles security pagination across multiple backend pages.
   */
  async listNotifications(params?: NotificationListParams): Promise<NotificationListResult> {
    const limit = params?.limit ?? 20;

    if (!isSupabaseConfigured) {
      throw new NotificationApiError(
        'Supabase notifications service is not configured in this environment.',
        'CONFIG_ERROR'
      );
    }

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
  },

  /**
   * Retrieve total unread notification count for the current admin.
   * Utilizes authoritative RPC: public.admin_get_unread_notification_count
   */
  async getUnreadCount(): Promise<number> {
    if (!isSupabaseConfigured) {
      throw new NotificationApiError(
        'Supabase notifications service is not configured in this environment.',
        'CONFIG_ERROR'
      );
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
      throw new NotificationApiError(
        'Supabase notifications service is not configured in this environment.',
        'CONFIG_ERROR'
      );
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
      throw new NotificationApiError(
        'Supabase notifications service is not configured in this environment.',
        'CONFIG_ERROR'
      );
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
