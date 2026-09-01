/**
 * Permission Foundation API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import { Permission, User } from '@/types/User';
import { Complaint } from '@/types/Complaint';
import {
  permissionFallback,
  AdminRole,
  AdminUser,
  CURRENT_ADMIN_USER,
} from '@/services/fallback/permissionFallback';

export class PermissionApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get all registered system permissions
   */
  async getPermissions(): Promise<Permission[]> {
    try {
      const response = await this.client.get<Permission[]>('/permissions');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return permissionFallback.getPermissions();
  }

  /**
   * Synchronous permission check helper
   */
  can(user: User | AdminUser | null | undefined, permissionId: string): boolean {
    return permissionFallback.can(user, permissionId);
  }

  /**
   * Workflow method checks
   */
  canEditComplaint(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    return permissionFallback.canEditComplaint(user, complaint);
  }

  canReject(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    return permissionFallback.canReject(user, complaint);
  }

  canPublish(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    return permissionFallback.canPublish(user, complaint);
  }

  canAddUpdate(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    return permissionFallback.canAddUpdate(user, complaint);
  }
}

export const permissionApi = new PermissionApi();
export default permissionApi;
export { type AdminRole, type AdminUser, CURRENT_ADMIN_USER } from '@/services/fallback/permissionFallback';

