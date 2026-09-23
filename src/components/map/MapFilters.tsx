import React from 'react';
import {
  MapFilterState,
  MapSegmentOption,
  MapSubcategoryOption,
  MapLocationTaxonomy,
} from '@/types/Map';
import { ComplaintLifecycleStatus } from '@/types/Complaint';
import { useLanguage } from '@/context/LanguageContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Badge } from '@/components/ui/Badge';
import {
  RotateCcw,
  SlidersHorizontal,
  MapPin,
  Folder,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { cn } from '@/utils';
import {
  HARASSMENT_AGE_GROUP_OPTIONS,
  HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS,
  HARASSMENT_REPORTING_FOR_OPTIONS,
  getHarassmentAgeGroupLabel,
  getHarassmentRelationshipLabel,
  getHarassmentReportingForLabel,
} from '@/utils/harassmentClassification';

export interface MapFiltersProps {
  filters: MapFilterState;
  onChange: (filters: MapFilterState) => void;
  onReset: () => void;
  segments: MapSegmentOption[];
  subcategories: MapSubcategoryOption[];
  districts: string[];
  locationTaxonomy: MapLocationTaxonomy | null;
  totalResultsCount: number;
  className?: string;
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  filters,
  onChange,
  onReset,
  segments,
  subcategories,
  districts,
  locationTaxonomy,
  totalResultsCount,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const isHarassmentFilter = filters.segment === 'harassment';
  const filteredDistricts = (locationTaxonomy?.districts || [])
    .filter(item => filters.division === 'all' || item.divisionId === filters.division);
  const selectedDistrict = locationTaxonomy?.districts.find(item =>
    item.nameEn.toLowerCase() === filters.district.toLowerCase() ||
    item.nameBn === filters.district
  );
  const canonicalUpazilas = (locationTaxonomy?.upazilas || [])
    .filter(item => selectedDistrict && item.districtId === selectedDistrict.id);

  // Subcategories filtered by selected segment
  const filteredSubcategories =
    filters.segment && filters.segment !== 'all'
      ? subcategories.filter((sub) => sub.segmentId === filters.segment)
      : subcategories;

  // Active filters presence check
  const hasActiveFilters = Boolean(
    filters.searchQuery ||
      (filters.segment && filters.segment !== 'all') ||
      (filters.subcategory && filters.subcategory !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      (filters.district && filters.district !== 'all') ||
      (filters.division && filters.division !== 'all') ||
      (filters.upazila && filters.upazila !== 'all') ||
      (filters.affectedPersonAgeGroup && filters.affectedPersonAgeGroup !== 'all') ||
      (filters.allegedAbuserRelationship && filters.allegedAbuserRelationship !== 'all') ||
      (filters.reportingFor && filters.reportingFor !== 'all') ||
      (filters.dateRange && filters.dateRange !== 'all')
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  };

  const handleSegmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      segment: e.target.value,
      subcategory: 'all', // Reset subcategory when segment changes
      affectedPersonAgeGroup: 'all',
      allegedAbuserRelationship: 'all',
      reportingFor: 'all',
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

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, district: e.target.value, upazila: 'all' });
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...filters,
      division: e.target.value,
      district: 'all',
      upazila: 'all',
    });
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
      case 'unpublished':
        return isBn ? 'অপ্রকাশিত' : 'Unpublished';
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

  const selectedSegmentObj = segments.find((s) => s.id === filters.segment);
  const selectedSubcategoryObj = subcategories.find(
    (s) => s.id === filters.subcategory
  );

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
            placeholder={
              isBn
                ? 'আইডি, শিরোনাম, জেলা বা ঠিকানা খুঁজুন...'
                : 'Search ID, title, district, address...'
            }
            isSearch
            onClear={() => onChange({ ...filters, searchQuery: '' })}
            className="h-9 text-xs"
          />
        </div>

        {/* Segment */}
        <div>
          <Select
            id="map-segment-select"
            value={filters.segment}
            onChange={handleSegmentChange}
            className="h-9 text-xs"
          >
            <option value="all">{isBn ? 'সকল খাত/বিভাগ' : 'All Segments'}</option>
            {segments.map((seg) => (
              <option key={seg.id} value={seg.id}>
                {isBn ? seg.nameBn : seg.nameEn}
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
            disabled={!filters.segment || filters.segment === 'all'}
            className="h-9 text-xs"
          >
            <option value="all">
              {isBn ? 'সকল উপ-শ্রেণি' : 'All Subcategories'}
            </option>
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
            <option value="unpublished">
              {isBn ? 'অপ্রকাশিত' : 'Unpublished'}
            </option>
            <option value="rejected">{isBn ? 'বাতিলকৃত' : 'Rejected'}</option>
            <option value="edited">{isBn ? 'সম্পাদিত' : 'Edited'}</option>
          </Select>
        </div>


        {isHarassmentFilter && (
          <>
            <div>
              <Select id="map-harassment-age-select" value={filters.affectedPersonAgeGroup} onChange={(e) => onChange({ ...filters, affectedPersonAgeGroup: e.target.value })} className="h-9 text-xs">
                <option value="all">{isBn ? 'সকল বয়সের গ্রুপ' : 'All age groups'}</option>
                {HARASSMENT_AGE_GROUP_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isBn ? item.labelBn : item.labelEn}</option>)}
              </Select>
            </div>
            <div>
              <Select id="map-harassment-relationship-select" value={filters.allegedAbuserRelationship} onChange={(e) => onChange({ ...filters, allegedAbuserRelationship: e.target.value })} className="h-9 text-xs">
                <option value="all">{isBn ? 'সকল সম্পর্ক' : 'All relationships'}</option>
                {HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isBn ? item.labelBn : item.labelEn}</option>)}
              </Select>
            </div>
            <div>
              <Select id="map-harassment-reporting-for-select" value={filters.reportingFor} onChange={(e) => onChange({ ...filters, reportingFor: e.target.value })} className="h-9 text-xs">
                <option value="all">{isBn ? 'কার জন্য: সকল' : 'Reporting for: all'}</option>
                {HARASSMENT_REPORTING_FOR_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isBn ? item.labelBn : item.labelEn}</option>)}
              </Select>
            </div>
          </>
        )}

        {/* Division, District, Upazila/Thana: all choices come from the existing
            SQL-controlled location taxonomy, including zero-report locations. */}
        <div>
          <Select id="map-division-select" value={filters.division}
            onChange={handleDivisionChange} disabled={!locationTaxonomy}
            aria-label={isBn ? 'বিভাগ নির্বাচন' : 'Select division'} className="h-9 text-xs">
            <option value="all">{isBn ? 'সকল বিভাগ (৮)' : 'All Divisions (8)'}</option>
            {locationTaxonomy?.divisions.map(division => (
              <option key={division.id} value={division.id}>
                {isBn ? division.nameBn : division.nameEn}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Select id="map-district-select" value={filters.district}
            onChange={handleDistrictChange}
            aria-label={isBn ? 'জেলা নির্বাচন' : 'Select district'} className="h-9 text-xs">
            <option value="all">{isBn ? 'সকল জেলা (৬৪)' : 'All Districts (64)'}</option>
            {locationTaxonomy
              ? filteredDistricts.map(item => (
                <option key={item.id} value={item.nameEn}>
                  {isBn ? item.nameBn : item.nameEn}
                </option>
              ))
              : districts.map(name => <option key={name} value={name}>{name}</option>)}
          </Select>
        </div>
        <div>
          <Select id="map-upazila-select" value={filters.upazila}
            onChange={event => onChange({ ...filters, upazila: event.target.value })}
            disabled={!locationTaxonomy || !selectedDistrict}
            aria-label={isBn ? 'উপজেলা বা থানা নির্বাচন' : 'Select upazila or thana'}
            className="h-9 text-xs">
            <option value="all">{isBn ? 'সকল উপজেলা / থানা' : 'All Upazilas / Thanas'}</option>
            {[...canonicalUpazilas]
              .sort((a, b) => (isBn ? a.nameBn : a.nameEn)
                .localeCompare(isBn ? b.nameBn : b.nameEn))
              .map(item => (
                <option key={item.id} value={item.id}>
                  {isBn ? item.nameBn : item.nameEn}
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
            <span>{isBn ? 'ফিল্টার:' : 'Active:'}</span>
          </span>

          {!hasActiveFilters ? (
            <span className="text-slate-400 italic text-[11px]">
              {isBn
                ? 'কোনো ফিল্টার প্রয়োগ করা হয়নি (সকল পয়েন্ট দৃশ্যমান)'
                : 'Showing all mapped points'}
            </span>
          ) : (
            <>
              {filters.searchQuery && (
                <FilterChip
                  onRemove={() => onChange({ ...filters, searchQuery: '' })}
                  removeLabel="Remove search filter"
                >
                  "{filters.searchQuery}"
                </FilterChip>
              )}

              {filters.segment && filters.segment !== 'all' && (
                <FilterChip
                  icon={<Folder />}
                  onRemove={() =>
                    onChange({
                      ...filters,
                      segment: 'all',
                      subcategory: 'all',
                      affectedPersonAgeGroup: 'all',
                      allegedAbuserRelationship: 'all',
                      reportingFor: 'all',
                    })
                  }
                  removeLabel="Remove segment filter"
                >
                  {selectedSegmentObj
                    ? isBn
                      ? selectedSegmentObj.nameBn
                      : selectedSegmentObj.nameEn
                    : filters.segment}
                </FilterChip>
              )}

              {filters.subcategory && filters.subcategory !== 'all' && (
                <FilterChip
                  onRemove={() => onChange({ ...filters, subcategory: 'all' })}
                  removeLabel="Remove subcategory filter"
                >
                  {selectedSubcategoryObj
                    ? isBn
                      ? selectedSubcategoryObj.nameBn
                      : selectedSubcategoryObj.nameEn
                    : filters.subcategory}
                </FilterChip>
              )}


              {isHarassmentFilter && filters.affectedPersonAgeGroup !== 'all' && (
                <FilterChip
                  onRemove={() => onChange({ ...filters, affectedPersonAgeGroup: 'all' })}
                  removeLabel="Remove map age group filter"
                >
                  {getHarassmentAgeGroupLabel(filters.affectedPersonAgeGroup, isBn ? 'bn' : 'en')}
                </FilterChip>
              )}

              {isHarassmentFilter && filters.allegedAbuserRelationship !== 'all' && (
                <FilterChip
                  onRemove={() => onChange({ ...filters, allegedAbuserRelationship: 'all' })}
                  removeLabel="Remove map relationship filter"
                >
                  {getHarassmentRelationshipLabel(filters.allegedAbuserRelationship, isBn ? 'bn' : 'en')}
                </FilterChip>
              )}

              {isHarassmentFilter && filters.reportingFor !== 'all' && (
                <FilterChip
                  onRemove={() => onChange({ ...filters, reportingFor: 'all' })}
                  removeLabel="Remove map reporting-for filter"
                >
                  {getHarassmentReportingForLabel(filters.reportingFor, isBn ? 'bn' : 'en')}
                </FilterChip>
              )}

              {filters.status && filters.status !== 'all' && (
                <FilterChip
                  tone="info"
                  icon={<CheckCircle2 />}
                  onRemove={() => onChange({ ...filters, status: 'all' })}
                  removeLabel="Remove status filter"
                >
                  {getStatusLabel(filters.status)}
                </FilterChip>
              )}

              {filters.division && filters.division !== 'all' && (
                <FilterChip icon={<MapPin />} tone="warning"
                  onRemove={() => onChange({ ...filters, division: 'all', district: 'all', upazila: 'all' })}
                  removeLabel={isBn ? 'বিভাগ ফিল্টার মুছুন' : 'Remove division filter'}>
                  {(() => {
                    const value = locationTaxonomy?.divisions.find(item => item.id === filters.division);
                    return value ? (isBn ? value.nameBn : value.nameEn) : filters.division;
                  })()}
                </FilterChip>
              )}
              {filters.district && filters.district !== 'all' && (
                <FilterChip tone="warning" icon={<MapPin />}
                  onRemove={() => onChange({ ...filters, district: 'all', upazila: 'all' })}
                  removeLabel={isBn ? 'জেলা ফিল্টার মুছুন' : 'Remove district filter'}>
                  {(() => {
                    const value = locationTaxonomy?.districts.find(item => item.nameEn === filters.district);
                    return value && isBn ? value.nameBn : filters.district;
                  })()}
                </FilterChip>
              )}
              {filters.upazila && filters.upazila !== 'all' && (
                <FilterChip tone="warning" icon={<MapPin />}
                  onRemove={() => onChange({ ...filters, upazila: 'all' })}
                  removeLabel={isBn ? 'উপজেলা ফিল্টার মুছুন' : 'Remove upazila filter'}>
                  {(() => {
                    const value = locationTaxonomy?.upazilas.find(item => item.id === filters.upazila);
                    return value ? (isBn ? value.nameBn : value.nameEn) : filters.upazila;
                  })()}
                </FilterChip>
              )}

              {filters.dateRange && filters.dateRange !== 'all' && (
                <FilterChip
                  tone="success"
                  icon={<Calendar />}
                  onRemove={() => onChange({ ...filters, dateRange: 'all' })}
                  removeLabel="Remove date range filter"
                >
                  {getDateRangeLabel(filters.dateRange)}
                </FilterChip>
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
              leftIcon={<RotateCcw />}
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
