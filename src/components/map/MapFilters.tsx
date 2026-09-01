import React from 'react';
import { MapFilterState } from '@/types/Map';
import { Category, Subcategory } from '@/types/Category';
import { ComplaintLifecycleStatus } from '@/types/Complaint';
import { useLanguage } from '@/context/LanguageContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  RotateCcw,
  SlidersHorizontal,
  X,
  MapPin,
  Folder,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { cn } from '@/utils';

export interface MapFiltersProps {
  filters: MapFilterState;
  onChange: (filters: MapFilterState) => void;
  onReset: () => void;
  categories: Category[];
  subcategories: Subcategory[];
  availableWards: string[];
  totalResultsCount: number;
  className?: string;
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  filters,
  onChange,
  onReset,
  categories,
  subcategories,
  availableWards,
  totalResultsCount,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Subcategories filtered by category
  const filteredSubcategories = filters.category && filters.category !== 'all'
    ? subcategories.filter((sub) => sub.categoryId === filters.category)
    : subcategories;

  // Active filters count
  const hasActiveFilters = Boolean(
    filters.searchQuery ||
    (filters.category && filters.category !== 'all') ||
    (filters.subcategory && filters.subcategory !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    (filters.ward && filters.ward !== 'all') ||
    (filters.dateRange && filters.dateRange !== 'all')
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      category: e.target.value,
      subcategory: 'all', // Reset subcategory when category changes
    });
  };

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, subcategory: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      status: e.target.value as ComplaintLifecycleStatus | 'all',
    });
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, ward: e.target.value });
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, dateRange: e.target.value });
  };

  // Status Labels Mapping
  const getStatusLabel = (status: ComplaintLifecycleStatus | 'all') => {
    switch (status) {
      case 'submitted':
        return isBn ? 'দাখিলকৃত' : 'Submitted';
      case 'published':
        return isBn ? 'প্রকাশিত' : 'Published';
      case 'rejected':
        return isBn ? 'বাতিলকৃত' : 'Rejected';
      case 'edited':
        return isBn ? 'সম্পাদিত' : 'Edited';
      default:
        return isBn ? 'সকল স্ট্যাটাস' : 'All Statuses';
    }
  };

  const getDateRangeLabel = (val: string) => {
    switch (val) {
      case 'today':
        return isBn ? 'আজকে' : 'Today';
      case 'week':
        return isBn ? 'গত ৭ দিন' : 'Past 7 Days';
      case 'month':
        return isBn ? 'গত ৩০ দিন' : 'Past 30 Days';
      default:
        return isBn ? 'সকল সময়' : 'All Time';
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === filters.category);
  const selectedSubcategoryObj = subcategories.find((s) => s.id === filters.subcategory);

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xs',
        className
      )}
    >
      {/* Primary Row: Search & Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="sm:col-span-2 lg:col-span-2">
          <Input
            id="map-search-input"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder={isBn ? 'অভিযোগ আইডি, এলাকা বা শিরোনাম খুঁজুন...' : 'Search ID, title, or address...'}
            isSearch
            onClear={() => onChange({ ...filters, searchQuery: '' })}
            className="h-9 text-xs"
          />
        </div>

        {/* Category */}
        <div>
          <Select
            id="map-category-select"
            value={filters.category}
            onChange={handleCategoryChange}
            className="h-9 text-xs"
          >
            <option value="all">{isBn ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {isBn ? cat.nameBn : cat.nameEn}
              </option>
            ))}
          </Select>
        </div>

        {/* Subcategory */}
        <div>
          <Select
            id="map-subcategory-select"
            value={filters.subcategory}
            onChange={handleSubcategoryChange}
            disabled={!filters.category || filters.category === 'all'}
            className="h-9 text-xs"
          >
            <option value="all">{isBn ? 'সকল সাব-ক্যাটাগরি' : 'All Subcategories'}</option>
            {filteredSubcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {isBn ? sub.nameBn : sub.nameEn}
              </option>
            ))}
          </Select>
        </div>

        {/* Status */}
        <div>
          <Select
            id="map-status-select"
            value={filters.status}
            onChange={handleStatusChange}
            className="h-9 text-xs"
          >
            <option value="all">{isBn ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
            <option value="submitted">{isBn ? 'দাখিলকৃত' : 'Submitted'}</option>
            <option value="published">{isBn ? 'প্রকাশিত' : 'Published'}</option>
            <option value="rejected">{isBn ? 'বাতিলকৃত' : 'Rejected'}</option>
            <option value="edited">{isBn ? 'সম্পাদিত' : 'Edited'}</option>
          </Select>
        </div>

        {/* Ward / Area */}
        <div>
          <Select
            id="map-ward-select"
            value={filters.ward}
            onChange={handleWardChange}
            className="h-9 text-xs"
          >
            <option value="all">{isBn ? 'সকল ওয়ার্ড / এলাকা' : 'All Wards'}</option>
            {availableWards.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Secondary Bar: Active Filters Chips, Date Range, Results Count, Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        {/* Left: Active Chips */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isBn ? 'সক্রিয় ফিল্টার:' : 'Active:'}</span>
          </span>

          {!hasActiveFilters ? (
            <span className="text-slate-400 italic text-[11px]">
              {isBn ? 'কোনো ফিল্টার প্রয়োগ করা হয়নি (সকল অভিযোগ দৃশ্যমান)' : 'Showing all geographic points'}
            </span>
          ) : (
            <>
              {filters.searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  <span>"{filters.searchQuery}"</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, searchQuery: '' })}
                    className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Remove search filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.category && filters.category !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  <Folder className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{selectedCategoryObj ? (isBn ? selectedCategoryObj.nameBn : selectedCategoryObj.nameEn) : filters.category}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, category: 'all', subcategory: 'all' })}
                    className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Remove category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.subcategory && filters.subcategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  <span>{selectedSubcategoryObj ? (isBn ? selectedSubcategoryObj.nameBn : selectedSubcategoryObj.nameEn) : filters.subcategory}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, subcategory: 'all' })}
                    className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Remove subcategory filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.status && filters.status !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  <span>{getStatusLabel(filters.status)}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, status: 'all' })}
                    className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Remove status filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.ward && filters.ward !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>{filters.ward}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, ward: 'all' })}
                    className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Remove ward filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.dateRange && filters.dateRange !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>{getDateRangeLabel(filters.dateRange)}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, dateRange: 'all' })}
                    className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Remove date range filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: Date Range quick select & Results & Reset */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Quick Date Range */}
          <div className="w-32">
            <Select
              id="map-date-range-select"
              value={filters.dateRange}
              onChange={handleDateRangeChange}
              className="h-7 text-xs py-0"
            >
              <option value="all">{isBn ? 'সকল সময়' : 'All Time'}</option>
              <option value="today">{isBn ? 'আজকে' : 'Today'}</option>
              <option value="week">{isBn ? 'গত ৭ দিন' : 'Past 7 Days'}</option>
              <option value="month">{isBn ? 'গত ৩০ দিন' : 'Past 30 Days'}</option>
            </Select>
          </div>

          <Badge variant="outline" size="sm" className="font-mono">
            {totalResultsCount} {isBn ? 'পয়েন্ট' : 'points'}
          </Badge>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              leftIcon={<RotateCcw className="w-3 h-3" />}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {isBn ? 'রিসেট' : 'Reset'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapFilters;
