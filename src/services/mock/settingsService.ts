/**
 * Admin Interface Preferences Mock Service
 * Manages administrative portal preferences and interface defaults.
 * Persists locally to support real-time reactivity without backend requirements.
 */

import { SystemSettings } from '@/types/Settings';

const SETTINGS_STORAGE_KEY = 'sobaike_admin_settings_v1';

export const DEFAULT_SETTINGS: SystemSettings = {
  theme: {
    defaultTheme: 'system',
    compactTableMode: false,
  },
  language: {
    defaultLanguage: 'en',
    enableBilingualUI: true,
  },
  systemPreferences: {
    itemsPerPage: 10,
    autoRefreshInterval: 60,
    enableAuditLogging: true,
  },
};

export class SettingsService {
  /**
   * Get all active admin interface preferences
   */
  async getSettings(): Promise<SystemSettings> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          theme: { ...DEFAULT_SETTINGS.theme, ...parsed.theme },
          language: { ...DEFAULT_SETTINGS.language, ...parsed.language },
          systemPreferences: { ...DEFAULT_SETTINGS.systemPreferences, ...parsed.systemPreferences },
        };
      }
    } catch {
      // Fallback
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Update admin interface preferences
   */
  async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const current = await this.getSettings();
    const updated: SystemSettings = {
      theme: { ...current.theme, ...updates.theme },
      language: { ...current.language, ...updates.language },
      systemPreferences: { ...current.systemPreferences, ...updates.systemPreferences },
    };

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }

    return updated;
  }

  /**
   * Reset all preferences to interface defaults baseline
   */
  async resetSettings(): Promise<SystemSettings> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore
    }
    return { ...DEFAULT_SETTINGS };
  }
}

export const mockSettingsService = new SettingsService();
export default mockSettingsService;
