/**
 * Settings API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import { SystemSettings } from '@/types/Settings';
import { settingsFallback, DEFAULT_SETTINGS } from '@/services/fallback/settingsFallback';

export class SettingsApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Fetch current admin interface preferences
   */
  async getSettings(): Promise<SystemSettings> {
    try {
      const response = await this.client.get<SystemSettings>('/settings');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return settingsFallback.getSettings();
  }

  /**
   * Persist updated admin interface preferences
   */
  async updateSettings(newSettings: Partial<SystemSettings>): Promise<SystemSettings> {
    try {
      const response = await this.client.put<SystemSettings>('/settings', newSettings);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return settingsFallback.updateSettings(newSettings);
  }

  /**
   * Reset interface preferences to default values
   */
  async resetSettings(): Promise<SystemSettings> {
    try {
      const response = await this.client.post<SystemSettings>('/settings/reset');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return settingsFallback.resetSettings();
  }
}

export { DEFAULT_SETTINGS };
export const settingsApi = new SettingsApi();
export default settingsApi;

