import React from 'react';
import { CategoryFilterState, Feature } from '@/types/Category';
import { useLanguage } from '@/context/LanguageContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, RotateCcw, X, Filter } from 'lucide-react';
import { cn } from '@/utils';

export interface CategoryFiltersProps {
  filters: CategoryFilterState;
  features: Feature[];
  onChange: (filters: CategoryFilterState) => void;
  onReset: () => void;
  className?: string;
  totalResultsCount?: number;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  filters,
  features,
  onChange,
  onReset,
  className,
  totalResultsCount,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.status !== 'all' ||
    filters.featureId !== 'all';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, status: e.target.value as CategoryFilterState['status'] });
  };

  const handleFeatureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, featureId: e.target.value });
  };

  const featureOptions = [
    { value: 'all', label: isBn ? 'সকল ফিচার (Top-Level)' : 'All Features (Top-Level)' },
    ...features.map((f) => ({
      value: f.id,
      label: isBn ? f.nameBn : f.nameEn,
    })),
  ];

  const statusOptions = [
    { value: 'all', label: isBn ? 'সকল স্ট্যাটাস' : 'All Statuses' },
    { value: 'active', label: isBn ? 'সক্রিয় (Active)' : 'Active Only' },
    { value: 'inactive', label: isBn ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive Only' },
  ];

  return (
    <div className={cn('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="lg:col-span-6">
          <Input
            id="category-search-input"
            type="text"
            placeholder={
              isBn
                ? 'ফিচার, ক্যাটাগরি বা সাবক্যাটাগরি খুঁজুন (বাংলা / English)...'
                : 'Search feature, category or subcategory name...'
            }
            value={filters.search}
            onChange={handleSearchChange}
            isSearch
            onClear={() => onChange({ ...filters, search: '' })}
            className="w-full"
          />
        </div>

        {/* Feature Filter */}
        <div className="lg:col-span-3">
          <Select
            id="category-feature-filter"
            options={featureOptions}
            value={filters.featureId}
            onChange={handleFeatureChange}
            aria-label={isBn ? 'ফিচার ফিল্টার' : 'Filter by Feature'}
          />
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-3">
          <Select
            id="category-status-filter"
            options={statusOptions}
            value={filters.status}
            onChange={handleStatusChange}
            aria-label={isBn ? 'স্ট্যাটাস ফিল্টার' : 'Filter by Status'}
          />
        </div>
      </div>

      {/* Active Filter Indicators & Reset Action */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {isBn ? 'সক্রিয় ফিল্টারসমূহ:' : 'Active filters:'}
            </span>

            {filters.search && (
              <Badge status="default" size="sm" className="gap-1">
                <span>{isBn ? 'অনুসন্ধান:' : 'Search:'} {filters.search}</span>
                <button
                  onClick={() => onChange({ ...filters, search: '' })}
                  className="hover:text-slate-900 dark:hover:text-white"
                  aria-label="Remove search filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.featureId !== 'all' && (
              <Badge status="info" size="sm" className="gap-1">
                <span>
                  {featureOptions.find((o) => o.value === filters.featureId)?.label}
                </span>
                <button
                  onClick={() => onChange({ ...filters, featureId: 'all' })}
                  className="hover:text-slate-900 dark:hover:text-white"
                  aria-label="Remove feature filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.status !== 'all' && (
              <Badge
                status={filters.status === 'active' ? 'approved' : 'default'}
                size="sm"
                className="gap-1"
              >
                <span>
                  {filters.status === 'active'
                    ? isBn ? 'সক্রিয়' : 'Active'
                    : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                </span>
                <button
                  onClick={() => onChange({ ...filters, status: 'all' })}
                  className="hover:text-slate-900 dark:hover:text-white"
                  aria-label="Remove status filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {typeof totalResultsCount === 'number' && (
              <span className="text-slate-500 dark:text-slate-400 ml-1">
                ({totalResultsCount} {isBn ? 'টি পাওয়া গেছে' : 'found'})
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="w-3 h-3" />}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white h-7 px-2"
          >
            {isBn ? 'সব রিসেট করুন' : 'Reset all'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CategoryFilters;
