import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Globe,
  Sliders,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { SystemSettings } from '@/types/Settings';
import { settingsApi, DEFAULT_SETTINGS } from '@/services/api';
import { useLanguage, Language } from '@/context/LanguageContext';
import { useTheme, ThemeMode } from '@/themes/ThemeProvider';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const isBn = language === 'bn';

  const { mode: currentThemeMode, setTheme } = useTheme();

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [resetNotice, setResetNotice] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    settingsApi.getSettings().then((loaded) => {
      if (mounted) {
        setSettings(loaded);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await settingsApi.updateSettings(settings);
      setSettings(saved);

      // Apply theme mode if changed
      if (saved.theme.defaultTheme !== currentThemeMode) {
        setTheme(saved.theme.defaultTheme);
      }

      // Apply language if changed
      if (saved.language.defaultLanguage !== language) {
        setLanguage(saved.language.defaultLanguage);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        isBn
          ? 'আপনি কি নিশ্চিত যে সকল সেটিংস ডিফল্ট মানে রিসেট করতে চান?'
          : 'Are you sure you want to restore all settings to default values?'
      )
    ) {
      const reset = await settingsApi.resetSettings();
      setSettings(reset);
      setTheme(reset.theme.defaultTheme);
      setResetNotice(true);
      setTimeout(() => setResetNotice(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isBn ? 'সেটিংস কনফিগারেশন লোড হচ্ছে...' : 'Loading system preferences...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. Header with Actions */}
      <PageHeader
        title={isBn ? 'সিস্টেম সেটিংস' : 'System Configuration & Settings'}
        description={
          isBn
            ? 'পোর্টাল থিম, ভাষা এবং অ্যাডমিন ইন্টারফেস পছন্দসমূহ'
            : 'Configure administrative display preferences, language options, and interface defaults'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            >
              {isBn ? 'ডিফল্ট রিসেট' : 'Reset Defaults'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              leftIcon={<Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />}
            >
              {isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300 transition-all duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">
              {isBn
                ? 'সিস্টেম সেটিংস সফলভাবে সংরক্ষিত এবং হালনাগাদ হয়েছে।'
                : 'Interface preferences have been successfully saved and applied.'}
            </span>
          </div>
        </div>
      )}

      {resetNotice && (
        <div className="p-3.5 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-lg flex items-center gap-2 text-xs text-sky-800 dark:text-sky-300">
          <FileCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="font-medium">
            {isBn
              ? 'সকল সিস্টেম সেটিংস ডিফল্ট মানে পুনরুদ্ধার করা হয়েছে।'
              : 'All preferences restored to interface defaults.'}
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Theme & Visual Preferences */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'থিম ও ডিসপ্লে সেটিংস' : 'Theme & Visual Preferences'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'ইন্টারফেস কালার মোড এবং টেবিল স্পেসিং প্রিফারেন্স'
                : 'Select color schemes and interface density for comfortable daily triage'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                {isBn ? 'ডিফল্ট থিম মোড' : 'Default Theme Mode'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'light' as ThemeMode,
                    labelEn: 'Light',
                    labelBn: 'লাইট মোড',
                    icon: Sun,
                    iconColor: 'text-amber-500',
                  },
                  {
                    id: 'dark' as ThemeMode,
                    labelEn: 'Dark',
                    labelBn: 'ডার্ক মোড',
                    icon: Moon,
                    iconColor: 'text-sky-400',
                  },
                  {
                    id: 'system' as ThemeMode,
                    labelEn: 'System',
                    labelBn: 'সিস্টেম',
                    icon: Monitor,
                    iconColor: 'text-slate-400',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = settings.theme.defaultTheme === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          theme: { ...settings.theme, defaultTheme: item.id },
                        });
                        setTheme(item.id);
                      }}
                      className={`p-3.5 rounded-lg border text-left flex flex-col items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${item.iconColor}`} />
                      <span className="text-xs font-semibold">
                        {isBn ? item.labelBn : item.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    {isBn ? 'কমপ্যাক্ট টেবিল ভিউ' : 'Compact Table Density'}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'অতিরিক্ত ডেটা প্রদর্শনের জন্য টেবিলের সেল প্যাডিং হ্রাস করুন'
                      : 'Reduce table row padding to maximize visible information density'}
                  </p>
                </div>
                <Switch
                  checked={settings.theme.compactTableMode}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      theme: { ...settings.theme, compactTableMode: checked },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Language & Localization */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'ভাষা ও স্থানীয়করণ' : 'Language & Localization'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'পোর্টালের প্রাথমিক ইন্টারফেস ভাষা এবং দ্বিভাষিক ডিসপ্লে'
                : 'Primary interface language and bilingual title display controls'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                {isBn ? 'ডিফল্ট ইন্টারফেস ভাষা' : 'Default Interface Language'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: 'en' as Language,
                    label: 'English (EN)',
                    sub: 'English interface text',
                  },
                  {
                    id: 'bn' as Language,
                    label: 'বাংলা (BN)',
                    sub: 'বাংলা ইন্টারফেস টেক্সট',
                  },
                ].map((item) => {
                  const isSelected = settings.language.defaultLanguage === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          language: { ...settings.language, defaultLanguage: item.id },
                        });
                        setLanguage(item.id);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{item.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        {item.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    {isBn ? 'দ্বিভাষিক শিরোনাম প্রদর্শন' : 'Enable Bilingual Subtitles'}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'অভিযোগ ও বিভাগের বাংলা এবং ইংরেজি উভয় নাম পাশাপাশি প্রদর্শন করুন'
                      : 'Show both English and Bengali titles concurrently where available'}
                  </p>
                </div>
                <Switch
                  checked={settings.language.enableBilingualUI}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      language: { ...settings.language, enableBilingualUI: checked },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: System Preferences */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'সিস্টেম পছন্দসমূহ' : 'System Preferences'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'পেজিনেশন লিমিট, অটো-রিফ্রেশ সময়কাল এবং অডিট ট্র্যাকিং'
                : 'Pagination defaults, auto-refresh intervals, and administrative event logging'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label={isBn ? 'প্রতি পৃষ্ঠায় ডেটা সংখ্যা' : 'Default Items Per Page'}
                value={settings.systemPreferences.itemsPerPage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    systemPreferences: {
                      ...settings.systemPreferences,
                      itemsPerPage: Number(e.target.value),
                    },
                  })
                }
                className="text-xs"
              >
                <option value={10}>10 items</option>
                <option value={25}>25 items</option>
                <option value={50}>50 items</option>
                <option value={100}>100 items</option>
              </Select>

              <Select
                label={isBn ? 'অটো-রিফ্রেশ সময়কাল' : 'Auto-Refresh Interval'}
                value={settings.systemPreferences.autoRefreshInterval}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    systemPreferences: {
                      ...settings.systemPreferences,
                      autoRefreshInterval: Number(e.target.value),
                    },
                  })
                }
                className="text-xs"
              >
                <option value={0}>{isBn ? 'নিষ্ক্রিয় (Disabled)' : 'Disabled'}</option>
                <option value={30}>{isBn ? 'প্রতি ৩০ সেকেন্ড' : 'Every 30 seconds'}</option>
                <option value={60}>{isBn ? 'প্রতি ১ মিনিট' : 'Every 1 minute'}</option>
                <option value={300}>{isBn ? 'প্রতি ৫ মিনিট' : 'Every 5 minutes'}</option>
              </Select>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    {isBn ? 'অ্যাডমিন অডিট ট্রেইল সক্রিয়' : 'Audit Trail Logging'}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'সকল প্রশাসনিক ক্রিয়া এবং ওয়ার্কফ্লো অনুমোদন অডিট লগে রেকর্ড করুন'
                      : 'Record administrative reviews, publishes, and role assignments in audit logs'}
                  </p>
                </div>
                <Switch
                  checked={settings.systemPreferences.enableAuditLogging}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      systemPreferences: {
                        ...settings.systemPreferences,
                        enableAuditLogging: checked,
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;

