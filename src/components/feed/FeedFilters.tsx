import React from 'react';
import { FeedFilterState } from '@/types/Post';
import { useLanguage } from '@/context/LanguageContext';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { X, Image, MapPin } from 'lucide-react';
import { cn } from '@/utils';

export interface FeedFiltersProps {
  filters: FeedFilterState;
  onChange: (filters: FeedFilterState) => void;
  onReset: () => void;
  className?: string;
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({
  filters,
  onChange,
  onReset,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Category & Subcategory options
  const categoryOptions = [
    { value: 'all', label: isBn ? 'সকল ক্যাটাগরি' : 'All Categories' },
    { value: 'roads_traffic', label: isBn ? 'রাস্তাঘাট ও ট্রাফিক' : 'Roads & Traffic' },
    { value: 'waste_management', label: isBn ? 'বর্জ্য ব্যবস্থাপনা' : 'Waste Management' },
    { value: 'water_drainage', label: isBn ? 'পানি ও নিষ্কাশন' : 'Water & Drainage' },
    { value: 'extortion', label: isBn ? 'চাঁদাবাজি' : 'Extortion' },
    { value: 'civic_issues', label: isBn ? 'নাগরিক সমস্যা' : 'Civic Problems' },
  ];

  const subcategoryMap: Record<string, { value: string; labelEn: string; labelBn: string }[]> = {
    roads_traffic: [
      { value: 'all', labelEn: 'All Subcategories', labelBn: 'সকল সাব-ক্যাটাগরি' },
      { value: 'open_manhole', labelEn: 'Open Manhole', labelBn: 'উন্মুক্ত ম্যানহোল' },
      { value: 'road_damage', labelEn: 'Road Surface Damage', labelBn: 'রাস্তা ক্ষতিগ্রস্ত' },
      { value: 'traffic_signal', labelEn: 'Traffic Signal Issue', labelBn: 'ট্রাফিক সিগন্যাল' },
    ],
    waste_management: [
      { value: 'all', labelEn: 'All Subcategories', labelBn: 'সকল সাব-ক্যাটাগরি' },
      { value: 'uncollected_garbage', labelEn: 'Uncollected Garbage', labelBn: 'অনপসারিত বর্জ্য' },
      { value: 'dumpster_overflow', labelEn: 'Container Overflow', labelBn: 'ডাস্টবিন উপচে পড়া' },
    ],
    water_drainage: [
      { value: 'all', labelEn: 'All Subcategories', labelBn: 'সকল সাব-ক্যাটাগরি' },
      { value: 'pipe_leak', labelEn: 'Pipeline Leakage', labelBn: 'পাইপলাইন লিকেজ' },
      { value: 'water_pollution', labelEn: 'Water Pollution', labelBn: 'পানি দূষণ' },
      { value: 'waterlogging', labelEn: 'Waterlogging', labelBn: 'জলাবদ্ধতা' },
    ],
    extortion: [
      { value: 'all', labelEn: 'All Subcategories', labelBn: 'সকল সাব-ক্যাটাগরি' },
      { value: 'market_toll', labelEn: 'Unlawful Market Toll', labelBn: 'অবৈধ বাজার টোল' },
      { value: 'transport_extortion', labelEn: 'Transport Extortion', labelBn: 'পরিবহন চাঁদাবাজি' },
    ],
    civic_issues: [
      { value: 'all', labelEn: 'All Subcategories', labelBn: 'সকল সাব-ক্যাটাগরি' },
      { value: 'street_lighting', labelEn: 'Street Lighting', labelBn: 'সড়ক বাতি' },
      { value: 'illegal_billboards', labelEn: 'Illegal Billboards', labelBn: 'অবৈধ বিলবোর্ড' },
      { value: 'noise_pollution', labelEn: 'Noise Pollution', labelBn: 'শব্দ দূষণ' },
    ],
  };

  const currentSubcategories =
    filters.categoryId && filters.categoryId !== 'all' && subcategoryMap[filters.categoryId]
      ? subcategoryMap[filters.categoryId].map((sub) => ({
          value: sub.value,
          label: isBn ? sub.labelBn : sub.labelEn,
        }))
      : [{ value: 'all', label: isBn ? 'সকল সাব-ক্যাটাগরি' : 'All Subcategories' }];

  const mediaOptions = [
    { value: 'all', label: isBn ? 'সকল মিডিয়া টাইপ' : 'All Media Types' },
    { value: 'text_only', label: isBn ? 'শুধুমাত্র টেক্সট (মিডিয়া নেই)' : 'Text Only (No Media)' },
    { value: 'single_image', label: isBn ? 'একক ছবি (১টি ছবি)' : 'Single Image (1 Photo)' },
    { value: 'multiple_images', label: isBn ? 'একাধিক ছবি (গ্যালারি)' : 'Multiple Images (Gallery)' },
  ];

  const wardOptions = [
    { value: 'all', label: isBn ? 'সকল ওয়ার্ড' : 'All Wards' },
    { value: 'Ward 01', label: isBn ? 'ওয়ার্ড ০১ (উত্তরা)' : 'Ward 01 (Uttara)' },
    { value: 'Ward 14', label: isBn ? 'ওয়ার্ড ১৪ (মিরপুর)' : 'Ward 14 (Mirpur)' },
    { value: 'Ward 18', label: isBn ? 'ওয়ার্ড ১৮ (গুলশান)' : 'Ward 18 (Gulshan)' },
    { value: 'Ward 19', label: isBn ? 'ওয়ার্ড ১৯ (মহাখালী)' : 'Ward 19 (Mohakhali)' },
    { value: 'Ward 22', label: isBn ? 'ওয়ার্ড ২২ (ধানমন্ডি)' : 'Ward 22 (Dhanmondi)' },
    { value: 'Ward 27', label: isBn ? 'ওয়ার্ড ২৭ (তেজগাঁও)' : 'Ward 27 (Tejgaon)' },
    { value: 'Ward 31', label: isBn ? 'ওয়ার্ড ৩১ (মোহাম্মদপুর)' : 'Ward 31 (Mohammadpur)' },
    { value: 'Ward 56', label: isBn ? 'ওয়ার্ড ৫৬ (কামরাঙ্গীরচর)' : 'Ward 56 (Kamrangirchar)' },
  ];

  const handleCategoryChange = (catId: string) => {
    onChange({
      ...filters,
      categoryId: catId,
      subcategoryId: 'all',
    });
  };

  // Active filter counting
  const hasActiveFilters =
    filters.categoryId !== 'all' ||
    filters.subcategoryId !== 'all' ||
    filters.hasMedia !== 'all' ||
    filters.ward !== 'all';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Category */}
        <Select
          value={filters.categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          options={categoryOptions}
          className="text-xs"
        />

        {/* Subcategory */}
        <Select
          value={filters.subcategoryId}
          onChange={(e) => onChange({ ...filters, subcategoryId: e.target.value })}
          options={currentSubcategories}
          disabled={!filters.categoryId || filters.categoryId === 'all'}
          className="text-xs"
        />

        {/* Media Type */}
        <Select
          value={filters.hasMedia}
          onChange={(e) => onChange({ ...filters, hasMedia: e.target.value })}
          options={mediaOptions}
          className="text-xs"
        />

        {/* Ward */}
        <Select
          value={filters.ward}
          onChange={(e) => onChange({ ...filters, ward: e.target.value })}
          options={wardOptions}
          className="text-xs"
        />
      </div>

      {/* Active filter badges & reset */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {filters.categoryId !== 'all' && (
              <Badge variant="subtle" size="sm" className="gap-1">
                <span>{categoryOptions.find((c) => c.value === filters.categoryId)?.label}</span>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className="hover:text-slate-900 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.hasMedia !== 'all' && (
              <Badge variant="subtle" size="sm" className="gap-1">
                <Image className="w-3 h-3" />
                <span>{mediaOptions.find((m) => m.value === filters.hasMedia)?.label}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, hasMedia: 'all' })}
                  className="hover:text-slate-900 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.ward !== 'all' && (
              <Badge variant="subtle" size="sm" className="gap-1">
                <MapPin className="w-3 h-3" />
                <span>{wardOptions.find((w) => w.value === filters.ward)?.label}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, ward: 'all' })}
                  className="hover:text-slate-900 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs h-7 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            <span>{isBn ? 'ফিল্টার সাফ করুন' : 'Clear Filters'}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default FeedFilters;
