/**
 * Audit Log API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import { AuditLog, AuditLogFilters, AuditStats } from '@/types/AuditLog';
import { auditLogFallback } from '@/services/fallback/auditLogFallback';

export class AuditLogApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Fetch filtered audit logs
   */
  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    try {
      const response = await this.client.get<AuditLog[]>('/audit-logs', {
        params: filters as Record<string, string | number | boolean | undefined>,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return auditLogFallback.getAuditLogs(filters);
  }

  /**
   * Fetch single audit log entry by ID
   */
  async getAuditLogById(id: string): Promise<AuditLog | null> {
    try {
      const response = await this.client.get<AuditLog>(`/audit-logs/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return auditLogFallback.getAuditLogById(id);
  }

  /**
   * Return high-level audit summary metrics
   */
  async getAuditStats(): Promise<AuditStats> {
    try {
      const response = await this.client.get<AuditStats>('/audit-logs/stats');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return auditLogFallback.getAuditStats();
  }
}

export const auditLogApi = new AuditLogApi();
export default auditLogApi;

