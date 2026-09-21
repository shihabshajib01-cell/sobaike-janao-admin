import React from 'react';
import { Search, RotateCcw, Filter, Smartphone, ShieldCheck, Clock, Globe } from 'lucide-react';
import { LocationActivityFilters as FilterState } from '@/types/LocationActivity';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { sortLocalizedTextOptions } from '@/utils/dropdownOptions';

export interface LocationActivityFiltersProps {
  filters: FilterState;
  browserOptions?: string[];
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
  hasActiveFilters?: boolean;
}

export const LocationActivityFilters: React.FC<LocationActivityFiltersProps> = ({
  filters,
  browserOptions = [],
  onChange,
  onReset,
  hasActiveFilters = false,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const permissionOptions = [
    { value: 'all', label: isBn ? 'সকল অবস্থা' : 'All Statuses' },
    ...sortLocalizedTextOptions(
      [
        { value: 'granted', label: isBn ? 'অনুমোদিত' : 'Granted' },
        { value: 'denied', label: isBn ? 'অনুমতি দেওয়া হয়নি' : 'Denied' },
        { value: 'prompt', label: isBn ? 'এখন নয় (Prompt)' : 'Not Now (Prompt)' },
        { value: 'unavailable', label: isBn ? 'অনুপলব্ধ' : 'Unavailable' },
      ],
      language
    ),
  ];

  const deviceOptions = [
    { value: 'all', label: isBn ? 'সকল ডিভাইস' : 'All Devices' },
    ...sortLocalizedTextOptions(
      [
        { value: 'desktop', label: isBn ? 'ডেস্কটপ' : 'Desktop' },
        { value: 'mobile', label: isBn ? 'মোবাইল' : 'Mobile' },
        { value: 'tablet', label: isBn ? 'ট্যাবলেট' : 'Tablet' },
        { value: 'unknown', label: isBn ? 'অজানা' : 'Unknown' },
      ],
      language
    ),
  ];

  const resolvedBrowsers =
    browserOptions.length > 0
      ? browserOptions
      : ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];

  const browserSelectOptions = [
    { value: 'all', label: isBn ? 'সকল ব্রাউজার' : 'All Browsers' },
    ...sortLocalizedTextOptions(
      Array.from(new Set(resolvedBrowsers)).map((browser) => ({
        value: browser,
        label: browser,
      })),
      language
    ),
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      search: e.target.value,
    });
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      permission: e.target.value as FilterState['permission'],
    });
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      device: e.target.value as FilterState['device'],
    });
  };

  const handleBrowserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      browser: e.target.value,
    });
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      timeRange: e.target.value as FilterState['timeRange'],
    });
  };

  return (
    <Card variant="default" className="shadow-xs">
      <CardContent className="p-3.5 sm:p-4 space-y-3">
        {/* Top: Search Input & Quick Info */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder={
                isBn
                  ? 'ভিজিটর আইডি, সেশন আইডি, ব্রাউজার, ওএস বা টাইমজোন অনুসন্ধান...'
                  : 'Search by Visitor ID, Session ID, Browser, OS, Platform, Timezone...'
              }
              value={filters.search}
              onChange={handleSearchChange}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="h-9 text-xs"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              leftIcon={<RotateCcw />}
              className="shrink-0"
            >
              <span>{isBn ? 'ফিল্টার রিসেট' : 'Reset Filters'}</span>
            </Button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* 1. Permission Status */}
          <div className="space-y-1">
            <label htmlFor="location-permission-filter" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              <span>{isBn ? 'অনুমতি অবস্থা' : 'Permission'}</span>
            </label>
            <Select
              id="location-permission-filter"
              value={filters.permission}
              onChange={handlePermissionChange}
              className="h-8.5 text-xs"
              options={permissionOptions}
            />
          </div>

          {/* 2. Device Category */}
          <div className="space-y-1">
            <label htmlFor="location-device-filter" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-slate-400" />
              <span>{isBn ? 'ডিভাইস' : 'Device'}</span>
            </label>
            <Select
              id="location-device-filter"
              value={filters.device}
              onChange={handleDeviceChange}
              className="h-8.5 text-xs"
              options={deviceOptions}
            />
          </div>

          {/* 3. Browser */}
          <div className="space-y-1">
            <label htmlFor="location-browser-filter" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>{isBn ? 'ব্রাউজার' : 'Browser'}</span>
            </label>
            <Select
              id="location-browser-filter"
              value={filters.browser}
              onChange={handleBrowserChange}
              className="h-8.5 text-xs"
              options={browserSelectOptions}
            />
          </div>

          {/* 4. Time Range */}
          <div className="space-y-1">
            <label htmlFor="location-time-range-filter" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{isBn ? 'সময়কাল' : 'Time Range'}</span>
            </label>
            <Select
              id="location-time-range-filter"
              value={filters.timeRange}
              onChange={handleTimeRangeChange}
              className="h-8.5 text-xs"
            >
              <option value="all">{isBn ? 'সর্বদা' : 'All Time'}</option>
              <option value="24h">{isBn ? 'বিগত ২৪ ঘণ্টা' : 'Last 24 Hours'}</option>
              <option value="7d">{isBn ? 'বিগত ৭ দিন' : 'Last 7 Days'}</option>
              <option value="30d">{isBn ? 'বিগত ৩০ দিন' : 'Last 30 Days'}</option>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationActivityFilters;
