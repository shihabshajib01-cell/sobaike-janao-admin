import React, { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { ComplaintFilterState } from '@/types/Complaint';
import { complaintApi } from '@/services/api';
import { RotateCcw, X, Filter } from 'lucide-react';

export interface ComplaintFiltersProps {
  filters: ComplaintFilterState;
  onFilterChange: (key: keyof ComplaintFilterState, value: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  categories?: { id: string; name_en: string; name_bn: string }[];
  locations?: string[];
}

export const ComplaintFilters: React.FC<ComplaintFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  categories: propCategories,
  locations: propLocations,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [availableSegments, setAvailableSegments] = useState<{ id: string; name_en: string; name_bn: string }[]>(
    propCategories || []
  );
  const [availableDistricts, setAvailableDistricts] = useState<string[]>(
    propLocations || []
  );

  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setAvailableSegments(propCategories);
    } else {
      complaintApi
        .getSegments()
        .then((segs) => {
          if (segs && segs.length > 0) {
            setAvailableSegments(segs);
          }
        })
        .catch((err) => console.warn('Failed to load taxonomy segments for filter:', err));
    }
  }, [propCategories]);

  useEffect(() => {
    if (propLocations && propLocations.length > 0) {
      setAvailableDistricts(propLocations);
    } else {
      complaintApi
        .getLocations()
        .then((locs) => {
          if (locs && locs.length > 0) {
            setAvailableDistricts(locs);
          }
        })
        .catch((err) => console.warn('Failed to load distinct locations for filter:', err));
    }
  }, [propLocations]);

  const categoryOptions = [
    { value: 'all', label: isBn ? 'সকল বিভাগ' : 'All Categories' },
    ...availableSegments.map((s) => ({
      value: s.id,
      label: isBn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn),
    })),
  ];

  const locationOptions = [
    { value: 'all', label: isBn ? 'সকল এলাকা' : 'All Locations' },
    ...availableDistricts.map((loc) => ({
      value: loc,
      label: loc,
    })),
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
          label={isBn ? 'এলাকা' : 'Location'}
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
