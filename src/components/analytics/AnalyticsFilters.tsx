import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useLanguage } from '@/context/LanguageContext';
import { AnalyticsDateRange, AnalyticsFilterState } from '@/types/Analytics';
import { Category } from '@/types/Category';
import { Download, RefreshCw } from 'lucide-react';
import { categoryApi } from '@/services/api';

export interface AnalyticsFiltersProps {
  filters: AnalyticsFilterState;
  onFilterChange: (newFilters: AnalyticsFilterState) => void;
  onRefresh: () => void;
  onExportClick: () => void;
  loading?: boolean;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  onExportClick,
  loading = false,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    categoryApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  const dateRangeOptions: Array<{ value: AnalyticsDateRange; labelEn: string; labelBn: string }> = [
    { value: 'today', labelEn: 'Today (24 Hours)', labelBn: 'আজ (২৪ ঘণ্টা)' },
    { value: '7days', labelEn: 'Last 7 Days', labelBn: 'বিগত ৭ দিন' },
    { value: '30days', labelEn: 'Last 30 Days', labelBn: 'বিগত ৩০ দিন' },
    { value: 'all', labelEn: 'All Time Records', labelBn: 'সর্বকালীন রেকর্ড' },
  ];

  const categoryOptions = [
    { value: 'all', label: isBn ? 'সকল ক্যাটাগরি' : 'All Categories' },
    ...categories.map((c) => ({
      value: c.id,
      label: isBn ? c.nameBn : c.nameEn,
    })),
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
      {/* Filters Group */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Selector Pill/Button Group */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
          {dateRangeOptions.map((opt) => {
            const isActive = filters.dateRange === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFilterChange({ ...filters, dateRange: opt.value })}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-pressed={isActive}
              >
                {isBn ? opt.labelBn : opt.labelEn}
              </button>
            );
          })}
        </div>

        {/* Category Filter */}
        <div className="w-48">
          <Select
            value={filters.categoryId || 'all'}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                categoryId: e.target.value === 'all' ? undefined : e.target.value,
              })
            }
            options={categoryOptions}
            className="h-8 text-xs py-1"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={onExportClick}
          leftIcon={<Download className="w-3.5 h-3.5" />}
          title={isBn ? 'অ্যানালিটিক্স রিপোর্ট ডাউনলোড' : 'Export Analytics Report'}
        >
          {isBn ? 'রিপোর্ট এক্সপোর্ট' : 'Export'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          title={isBn ? 'ডাটা রিফ্রেশ করুন' : 'Refresh analytics data'}
        >
          {isBn ? 'রিফ্রেশ' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
};

export default AnalyticsFilters;
