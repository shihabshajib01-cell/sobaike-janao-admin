import React from 'react';
import { ResponseFilterState } from '@/types/Response';
import { useLanguage } from '@/context/LanguageContext';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Filter, X, Building2, UserCheck, Layers } from 'lucide-react';
import { cn } from '@/utils';

export interface ResponseFiltersProps {
  filters: ResponseFilterState;
  onChange: (filters: ResponseFilterState) => void;
  onReset: () => void;
  className?: string;
}

export const ResponseFilters: React.FC<ResponseFiltersProps> = ({
  filters,
  onChange,
  onReset,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Category options
  const categoryOptions = [
    { value: 'all', label: isBn ? 'সকল ক্যাটাগরি' : 'All Categories' },
    { value: 'roads_traffic', label: isBn ? 'রাস্তাঘাট ও ট্রাফিক' : 'Roads & Traffic' },
    { value: 'waste_management', label: isBn ? 'বর্জ্য ব্যবস্থাপনা' : 'Waste Management' },
    { value: 'water_drainage', label: isBn ? 'পানি ও পয়ঃনিষ্কাশন' : 'Water & Drainage' },
    { value: 'electricity_gas', label: isBn ? 'বিদ্যুৎ ও জ্বালানি' : 'Electricity & Utilities' },
    { value: 'street_lighting', label: isBn ? 'সড়ক বাতি ও সংকেত' : 'Street Lighting & Signals' },
    { value: 'civic_issues', label: isBn ? 'নাগরিক সেবা ও অন্যান্য' : 'Civic Issues' },
  ];

  // Related Content Type options
  const relatedTypeOptions = [
    { value: 'all', label: isBn ? 'সকল রেকর্ড ধরন' : 'All Linked Types' },
    { value: 'complaint', label: isBn ? 'নাগরিক অভিযোগ' : 'Citizen Complaints' },
    { value: 'post', label: isBn ? 'পাবলিক ফিড পোস্ট' : 'Public Feed Posts' },
  ];

  // Author role options
  const authorRoleOptions = [
    { value: 'all', label: isBn ? 'সকল প্রেরক' : 'All Authors' },
    { value: 'official', label: isBn ? 'দাপ্তরিক কর্মকর্তা (Official)' : 'Official Authorities' },
    { value: 'citizen', label: isBn ? 'নাগরিক (Citizen)' : 'Verified Citizens' },
  ];

  // Check how many filters are active
  const activeFilterCount = [
    filters.relatedType !== 'all',
    filters.authorRole !== 'all',
    filters.categoryId !== 'all',
    Boolean(filters.search),
    filters.status !== 'all',
  ].filter(Boolean).length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Dropdown Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {/* 1. Related Record Type */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            {isBn ? 'সংযুক্ত রেকর্ডের ধরন' : 'Linked Record Type'}
          </label>
          <Select
            value={filters.relatedType}
            onChange={(e) =>
              onChange({
                ...filters,
                relatedType: e.target.value as ResponseFilterState['relatedType'],
              })
            }
            options={relatedTypeOptions}
            className="text-xs"
          />
        </div>

        {/* 2. Author Role */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            {isBn ? 'প্রেরকের ধরন' : 'Author Classification'}
          </label>
          <Select
            value={filters.authorRole}
            onChange={(e) =>
              onChange({
                ...filters,
                authorRole: e.target.value as ResponseFilterState['authorRole'],
              })
            }
            options={authorRoleOptions}
            className="text-xs"
          />
        </div>

        {/* 3. Category */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {isBn ? 'ক্যাটাগরি' : 'Category'}
          </label>
          <Select
            value={filters.categoryId}
            onChange={(e) =>
              onChange({
                ...filters,
                categoryId: e.target.value,
              })
            }
            options={categoryOptions}
            className="text-xs"
          />
        </div>

        {/* 4. Reset & Filter Controls */}
        <div className="flex items-end pb-0.5">
          {activeFilterCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              leftIcon={<X className="w-3.5 h-3.5" />}
              className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 w-full sm:w-auto"
            >
              {isBn ? 'ফিল্টার মুছুন' : 'Reset All'} ({activeFilterCount})
            </Button>
          ) : (
            <div className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1.5">
              {isBn ? 'কোনো ফিল্টার সক্রিয় নেই' : 'Standard view'}
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            {isBn ? 'সক্রিয় ফিল্টার:' : 'Active Filters:'}
          </span>

          {filters.relatedType !== 'all' && (
            <Badge status="info" size="sm" className="gap-1 text-[11px]">
              {filters.relatedType === 'complaint'
                ? isBn ? 'অভিযোগ' : 'Complaint'
                : isBn ? 'ফিড পোস্ট' : 'Feed Post'}
              <button
                type="button"
                onClick={() => onChange({ ...filters, relatedType: 'all' })}
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}

          {filters.authorRole !== 'all' && (
            <Badge status="info" size="sm" className="gap-1 text-[11px]">
              {filters.authorRole === 'official'
                ? isBn ? 'অফিশিয়াল' : 'Official Authority'
                : isBn ? 'নাগরিক' : 'Citizen'}
              <button
                type="button"
                onClick={() => onChange({ ...filters, authorRole: 'all' })}
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}

          {filters.categoryId !== 'all' && (
            <Badge status="info" size="sm" className="gap-1 text-[11px]">
              {categoryOptions.find((c) => c.value === filters.categoryId)?.label || filters.categoryId}
              <button
                type="button"
                onClick={() => onChange({ ...filters, categoryId: 'all' })}
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}

          {filters.search && (
            <Badge status="default" size="sm" className="gap-1 text-[11px]">
              "{filters.search}"
              <button
                type="button"
                onClick={() => onChange({ ...filters, search: '' })}
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponseFilters;
