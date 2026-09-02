/**
 * Audit Log Domain Types
 */

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

export type AuditModule =
  | 'complaints'
  | 'feed'
  | 'responses'
  | 'categories'
  | 'users'
  | 'system'
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
  timestamp: string;
  module: AuditModule;
  action: AuditAction;
  entityId: string;
  entityType?: string;
  description: string;
  descriptionBn?: string;
  actor: AuditActor;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  search?: string;
  module?: AuditModule | 'all';
  action?: string;
  dateRange?: 'all' | 'today' | '7days' | '30days' | string;
}

export interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  activeModules: number;
  topAction: string;
}
