/**
 * Notification Types & Interfaces for Sobaike Janao Admin
 * Maps strictly to the backend public.admin_notifications schema and Phase 1/2 RPCs.
 */

export type NotificationCategory =
  | 'complaint'
  | 'administration'
  | 'role'
  | 'security'
  | 'personal'
  | 'system';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type NotificationLayer = 'toast' | 'feed' | 'both' | 'silent';

export type NotificationAudienceMode = 'broadcast' | 'personal' | 'role_scoped';

export type NotificationEventKey =
  | 'complaint.submitted'
  | 'complaint.evidence_attached'
  | 'complaint.published'
  | 'complaint.unpublished'
  | 'complaint.rejected'
  | 'admin.created'
  | 'admin.activated'
  | 'admin.deactivated'
  | 'admin.role_changed'
  | 'role.created'
  | 'role.updated'
  | 'role.permissions_changed'
  | string;

export interface AdminNotification {
  id: string;
  event_group_id: string;
  event_key: NotificationEventKey;
  category: NotificationCategory;
  layer: NotificationLayer;
  severity: NotificationSeverity;
  audience_mode: NotificationAudienceMode;
  actor_user_id: string | null;
  actor_display_name: string | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  title_en: string;
  title_bn: string;
  body_en: string;
  body_bn: string;
  metadata: Record<string, unknown> | null;
  route: string | null;
  created_at: string;
  read_at: string | null;
}

export type NotificationFilterType =
  | 'all'
  | 'unread'
  | 'complaint'
  | 'administration'
  | 'role'
  | 'security';

export interface NotificationListParams {
  limit?: number;
  before_created_at?: string | null;
  before_id?: string | null;
  unread_only?: boolean;
  category?: string | null;
}
