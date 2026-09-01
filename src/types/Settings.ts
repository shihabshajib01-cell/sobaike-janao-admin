/**
 * Admin Interface Preferences Data Model
 * Clean preference foundation for administrative portal.
 */

import { ThemeMode } from '@/themes/ThemeProvider';
import { Language } from '@/context/LanguageContext';

export interface ThemeSettings {
  defaultTheme: ThemeMode;
  compactTableMode?: boolean;
}

export interface LanguageSettings {
  defaultLanguage: Language;
  enableBilingualUI?: boolean;
}

export interface SystemPreferences {
  itemsPerPage: number;
  autoRefreshInterval?: number;
  enableAuditLogging?: boolean;
}

export interface SystemSettings {
  theme: ThemeSettings;
  language: LanguageSettings;
  systemPreferences: SystemPreferences;
}

