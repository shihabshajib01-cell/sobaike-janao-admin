import React from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { ComplaintFilterState } from '@/types/Complaint';
import { RotateCcw, X, Filter } from 'lucide-react';

export interface ComplaintFiltersProps {
  filters: ComplaintFilterState;
  onFilterChange: (key: keyof ComplaintFilterState, value: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const ComplaintFilters: React.FC<ComplaintFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const categoryOptions = [
    { value: 'all', label: isBn ? 'সকল বিভাগ' : 'All Categories' },
    { value: 'civic_issues', label: isBn ? 'নাগরিক সমস্যা ও ড্রেনেজ' : 'Civic Problems & Drainage' },
    { value: 'roads_traffic', label: isBn ? 'রাস্তাঘাট ও ট্রাফিক' : 'Roads & Traffic' },
    { value: 'waste_management', label: isBn ? 'বর্জ্য ব্যবস্থাপনা' : 'Waste Management' },
    { value: 'extortion', label: isBn ? 'চাঁদাবাজি ও অবৈধ টোল' : 'Extortion & Illegal Tolls' },
    { value: 'harassment', label: isBn ? 'পাবলিক হয়রানি' : 'Public Harassment' },
    { value: 'corruption', label: isBn ? 'সরকারি দপ্তরের অনিয়ম' : 'Public Office Irregularities' },
  ];

  const locationOptions = [
    { value: 'all', label: isBn ? 'সকল এলাকা / ওয়ার্ড' : 'All Locations / Wards' },
    { value: 'Ward 14', label: isBn ? 'ওয়ার্ড ১৪ (মিরপুর)' : 'Ward 14 (Mirpur)' },
    { value: 'Ward 22', label: isBn ? 'ওয়ার্ড ২২ (ধানমন্ডি)' : 'Ward 22 (Dhanmondi)' },
    { value: 'Ward 31', label: isBn ? 'ওয়ার্ড ৩১ (মোহাম্মদপুর)' : 'Ward 31 (Mohammadpur)' },
    { value: 'Ward 01', label: isBn ? 'ওয়ার্ড ০১ (উত্তরা)' : 'Ward 01 (Uttara)' },
    { value: 'Ward 18', label: isBn ? 'ওয়ার্ড ১৮ (গুলশান)' : 'Ward 18 (Gulshan)' },
    { value: 'Ward 09', label: isBn ? 'ওয়ার্ড ০৯ (ফার্মগেট)' : 'Ward 09 (Farmgate)' },
    { value: 'Ward 20', label: isBn ? 'ওয়ার্ড ২০ (মহাখালী)' : 'Ward 20 (Mohakhali)' },
    { value: 'Ward 13', label: isBn ? 'ওয়ার্ড ১৩ (কাজীপাড়া)' : 'Ward 13 (Kazipara)' },
    { value: 'Ward 48', label: isBn ? 'ওয়ার্ড ৪৮ (যাত্রাবাড়ী)' : 'Ward 48 (Jatrabari)' },
  ];

  const dateOptions = [
    { value: 'all', label: isBn ? 'সকল সময়' : 'All Time' },
    { value: 'today', label: isBn ? 'আজকের অভিযোগ (২৪ ঘণ্টা)' : 'Today (Last 24 Hours)' },
    { value: 'week', label: isBn ? 'গত ৭ দিন' : 'Past 7 Days' },
    { value: 'month', label: isBn ? 'গত ৩০ দিন' : 'Past 30 Days' },
  ];

  // Helper to get readable label for active filter badges
  const getCategoryLabel = (val: string) =>
    categoryOptions.find((o) => o.value === val)?.label || val;
  const getLocationLabel = (val: string) =>
    locationOptions.find((o) => o.value === val)?.label || val;
  const getDateLabel = (val: string) =>
    dateOptions.find((o) => o.value === val)?.label || val;

  return (
    <div className="space-y-3">
      {/* Filters Form Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* Category Select */}
        <Select
          label={isBn ? 'বিভাগ নির্বাচন' : 'Category'}
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          options={categoryOptions}
        />

        {/* Location Select */}
        <Select
          label={isBn ? 'এলাকা / ওয়ার্ড' : 'Location / Ward'}
          value={filters.location}
          onChange={(e) => onFilterChange('location', e.target.value)}
          options={locationOptions}
        />

        {/* Date Range Select */}
        <Select
          label={isBn ? 'সময়কাল' : 'Date Range'}
          value={filters.dateRange}
          onChange={(e) => onFilterChange('dateRange', e.target.value)}
          options={dateOptions}
        />

        {/* Action button */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="h-9 w-full text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <span>{isBn ? 'ফিল্টার রিসেট' : 'Reset Filters'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Applied Filters Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium inline-flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>{isBn ? 'সক্রিয় ফিল্টারসমূহ:' : 'Active Filters:'}</span>
          </span>

          {filters.searchQuery && (
            <Badge status="info" size="sm" className="inline-flex items-center gap-1">
              <span>{isBn ? 'অনুসন্ধান' : 'Search'}: "{filters.searchQuery}"</span>
              <button
                type="button"
                onClick={() => onFilterChange('searchQuery', '')}
                className="hover:opacity-75 cursor-pointer"
                aria-label="Remove search filter"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.category !== 'all' && (
            <Badge status="info" size="sm" className="inline-flex items-center gap-1">
              <span>{getCategoryLabel(filters.category)}</span>
              <button
                type="button"
                onClick={() => onFilterChange('category', 'all')}
                className="hover:opacity-75 cursor-pointer"
                aria-label="Remove category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.location !== 'all' && (
            <Badge status="warning" size="sm" className="inline-flex items-center gap-1">
              <span>{getLocationLabel(filters.location)}</span>
              <button
                type="button"
                onClick={() => onFilterChange('location', 'all')}
                className="hover:opacity-75 cursor-pointer"
                aria-label="Remove location filter"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.dateRange !== 'all' && (
            <Badge status="approved" size="sm" className="inline-flex items-center gap-1">
              <span>{getDateLabel(filters.dateRange)}</span>
              <button
                type="button"
                onClick={() => onFilterChange('dateRange', 'all')}
                className="hover:opacity-75 cursor-pointer"
                aria-label="Remove date range filter"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplaintFilters;
