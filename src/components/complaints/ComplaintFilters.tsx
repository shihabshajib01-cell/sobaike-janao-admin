import React, { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { useLanguage } from '@/context/LanguageContext';
import { ComplaintFilterState } from '@/types/Complaint';
import { complaintApi } from '@/services/api';
import { RotateCcw, Filter } from 'lucide-react';
import {
  HARASSMENT_AGE_GROUP_OPTIONS,
  HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS,
  HARASSMENT_REPORTING_FOR_OPTIONS,
  getHarassmentAgeGroupLabel,
  getHarassmentRelationshipLabel,
  getHarassmentReportingForLabel,
} from '@/utils/harassmentClassification';

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
  const isHarassmentFilter = filters.category === 'harassment';

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


        {isHarassmentFilter && (
          <>
            <Select
              label={isBn ? 'প্রভাবিত ব্যক্তির বয়স' : "Affected person's age"}
              value={filters.affectedPersonAgeGroup}
              onChange={(e) => onFilterChange('affectedPersonAgeGroup', e.target.value)}
              options={[
                { value: 'all', label: isBn ? 'সকল বয়সের গ্রুপ' : 'All age groups' },
                ...HARASSMENT_AGE_GROUP_OPTIONS.map((item) => ({
                  value: item.value,
                  label: isBn ? item.labelBn : item.labelEn,
                })),
              ]}
            />

            <Select
              label={isBn ? 'অভিযুক্ত ব্যক্তির সঙ্গে সম্পর্ক' : 'Relationship'}
              value={filters.allegedAbuserRelationship}
              onChange={(e) => onFilterChange('allegedAbuserRelationship', e.target.value)}
              options={[
                { value: 'all', label: isBn ? 'সকল সম্পর্ক' : 'All relationships' },
                ...HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS.map((item) => ({
                  value: item.value,
                  label: isBn ? item.labelBn : item.labelEn,
                })),
              ]}
            />

            <Select
              label={isBn ? 'কার জন্য প্রতিবেদন' : 'Reporting for'}
              value={filters.reportingFor}
              onChange={(e) => onFilterChange('reportingFor', e.target.value)}
              options={[
                { value: 'all', label: isBn ? 'সকল ধরন' : 'All reporting types' },
                ...HARASSMENT_REPORTING_FOR_OPTIONS.map((item) => ({
                  value: item.value,
                  label: isBn ? item.labelBn : item.labelEn,
                })),
              ]}
            />
          </>
        )}

        {/* Action button */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              leftIcon={<RotateCcw />}
              fullWidth
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
            <FilterChip
              tone="info"
              onRemove={() => onFilterChange('searchQuery', '')}
              removeLabel="Remove search filter"
            >
              {isBn ? 'অনুসন্ধান' : 'Search'}: "{filters.searchQuery}"
            </FilterChip>
          )}

          {filters.category !== 'all' && (
            <FilterChip
              tone="info"
              onRemove={() => onFilterChange('category', 'all')}
              removeLabel="Remove category filter"
            >
              {getCategoryLabel(filters.category)}
            </FilterChip>
          )}


          {isHarassmentFilter && filters.affectedPersonAgeGroup !== 'all' && (
            <FilterChip
              tone="info"
              onRemove={() => onFilterChange('affectedPersonAgeGroup', 'all')}
              removeLabel="Remove age group filter"
            >
              {getHarassmentAgeGroupLabel(filters.affectedPersonAgeGroup, isBn ? 'bn' : 'en')}
            </FilterChip>
          )}

          {isHarassmentFilter && filters.allegedAbuserRelationship !== 'all' && (
            <FilterChip
              tone="info"
              onRemove={() => onFilterChange('allegedAbuserRelationship', 'all')}
              removeLabel="Remove relationship filter"
            >
              {getHarassmentRelationshipLabel(filters.allegedAbuserRelationship, isBn ? 'bn' : 'en')}
            </FilterChip>
          )}

          {isHarassmentFilter && filters.reportingFor !== 'all' && (
            <FilterChip
              tone="info"
              onRemove={() => onFilterChange('reportingFor', 'all')}
              removeLabel="Remove reporting-for filter"
            >
              {getHarassmentReportingForLabel(filters.reportingFor, isBn ? 'bn' : 'en')}
            </FilterChip>
          )}

          {filters.location !== 'all' && (
            <FilterChip
              tone="warning"
              onRemove={() => onFilterChange('location', 'all')}
              removeLabel="Remove location filter"
            >
              {getLocationLabel(filters.location)}
            </FilterChip>
          )}

          {filters.dateRange !== 'all' && (
            <FilterChip
              tone="success"
              onRemove={() => onFilterChange('dateRange', 'all')}
              removeLabel="Remove date range filter"
            >
              {getDateLabel(filters.dateRange)}
            </FilterChip>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplaintFilters;
