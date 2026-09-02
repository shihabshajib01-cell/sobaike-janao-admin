/**
 * System Settings API Service
 */
import { SystemSettings } from '@/types/Settings';

export const DEFAULT_SETTINGS: SystemSettings = {
  theme: {
    defaultTheme: 'light',
    compactTableMode: false,
  },
  language: {
    defaultLanguage: 'bn',
    enableBilingualUI: true,
  },
  systemPreferences: {
    itemsPerPage: 25,
    autoRefreshInterval: 60,
    enableAuditLogging: true,
  },
};

const STORAGE_KEY = 'sobaike_system_settings_v1';

export const settingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  },

  updateSettings: async (settings: SystemSettings): Promise<SystemSettings> => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
    return settings;
  },

  resetSettings: async (): Promise<SystemSettings> => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  },
};

export default settingsApi;
