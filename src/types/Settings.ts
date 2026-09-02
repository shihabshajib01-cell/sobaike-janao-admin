/**
 * System Settings Domain Types
 */
import { Language } from '@/context/LanguageContext';
import { ThemeMode } from '@/themes/ThemeProvider';

export interface ThemeSettings {
  defaultTheme: ThemeMode;
  compactTableMode: boolean;
}

export interface LanguageSettings {
  defaultLanguage: Language;
  enableBilingualUI: boolean;
}

export interface SystemPreferences {
  itemsPerPage: number;
  autoRefreshInterval: number;
  enableAuditLogging: boolean;
}

export interface SystemSettings {
  theme: ThemeSettings;
  language: LanguageSettings;
  systemPreferences: SystemPreferences;
}
