/**
 * Audit Log Fallback Service
 */

import { AuditLog, AuditLogFilters, AuditStats } from '@/types/AuditLog';
import { mockAuditLogService } from '@/services/mock/auditLogService';

export const auditLogFallback = {
  getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    return mockAuditLogService.getAuditLogs(filters);
  },

  getAuditLogById(id: string): Promise<AuditLog | null> {
    return mockAuditLogService.getAuditLogById(id);
  },

  getAuditStats(): Promise<AuditStats> {
    return mockAuditLogService.getAuditStats();
  },
};

export default auditLogFallback;


