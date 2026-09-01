/**
 * Role Management API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import { Role, Permission } from '@/types/User';
import { roleFallback } from '@/services/fallback/roleFallback';

export class RoleApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get all defined roles
   */
  async getRoles(): Promise<Role[]> {
    try {
      const response = await this.client.get<Role[]>('/roles');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return roleFallback.getRoles();
  }

  /**
   * Get single role by ID
   */
  async getRoleById(id: string): Promise<Role | null> {
    try {
      const response = await this.client.get<Role>(`/roles/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return roleFallback.getRoleById(id);
  }

  /**
   * Return permission objects associated with a specific role
   */
  async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    try {
      const response = await this.client.get<Permission[]>(`/roles/${roleId}/permissions`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return roleFallback.getPermissionsForRole(roleId);
  }
}

export const roleApi = new RoleApi();
export default roleApi;

