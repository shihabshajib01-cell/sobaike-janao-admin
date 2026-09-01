/**
 * Audit Log Data Model
 * Minimal, visibility-focused administrative event logging.
 * Captures operational activity across complaints, feed, responses, users, and categories.
 */

export type AuditModule =
  | 'complaints'
  | 'feed'
  | 'responses'
  | 'categories'
  | 'users'
  | 'system';

export type AuditAction =
  | 'approve'
  | 'reject'
  | 'publish'
  | 'resolve'
  | 'status_change'
  | 'role_change'
  | 'create'
  | 'update'
  | 'deactivate'
  | 'export'
  | string;

export interface AuditActor {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  module: AuditModule;
  entityId: string;
  entityType?: string;
  actor: AuditActor;
  timestamp: string;
  description: string;
  descriptionBn?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  search?: string;
  module?: AuditModule | 'all';
  action?: string | 'all';
  dateRange?: 'today' | '7days' | '30days' | 'all';
  actorId?: string;
}

export interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  activeModules: number;
  topAction: string;
}
