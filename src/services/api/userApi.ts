/**
 * User Management API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import { User, UserFilterState, UserStats } from '@/types/User';
import { userFallback } from '@/services/fallback/userFallback';

export class UserApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get filtered and searched admin users
   */
  async getUsers(params: Partial<UserFilterState> = {}): Promise<{
    users: User[];
    total: number;
  }> {
    try {
      const response = await this.client.get<{ users: User[]; total: number }>('/users', {
        params,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return userFallback.getUsers(params);
  }

  /**
   * Get single user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await this.client.get<User>(`/users/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return userFallback.getUserById(id);
  }

  /**
   * Get user summary counts
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await this.client.get<UserStats>('/users/stats');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return userFallback.getUserStats();
  }
}

export const userApi = new UserApi();
export default userApi;

