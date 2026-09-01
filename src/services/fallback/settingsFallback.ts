/**
 * Settings Fallback Service
 */

import { SystemSettings } from '@/types/Settings';
import { mockSettingsService, DEFAULT_SETTINGS } from '@/services/mock/settingsService';

export const settingsFallback = {
  getSettings(): Promise<SystemSettings> {
    return mockSettingsService.getSettings();
  },

  updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    return mockSettingsService.updateSettings(updates);
  },

  resetSettings(): Promise<SystemSettings> {
    return mockSettingsService.resetSettings();
  },

  resetToDefaults(): Promise<SystemSettings> {
    return mockSettingsService.resetSettings();
  },
};



export { DEFAULT_SETTINGS };
export default settingsFallback;
