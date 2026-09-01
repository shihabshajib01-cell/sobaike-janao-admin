import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { MapPinOff, RotateCcw } from 'lucide-react';
import { cn } from '@/utils';

export interface MapEmptyStateProps {
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export const MapEmptyState: React.FC<MapEmptyStateProps> = ({
  onResetFilters,
  hasActiveFilters = false,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <MapPinOff className="w-6 h-6" />
      </div>

      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {hasActiveFilters
          ? isBn
            ? 'এই ফিল্টারে কোনো অবস্থান পাওয়া যায়নি'
            : 'No Complaint Locations Match Current Filters'
          : isBn
          ? 'কোনো অভিযোগের অবস্থান পাওয়া যায়নি'
          : 'No Complaint Locations Found'}
      </h3>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {hasActiveFilters
          ? isBn
            ? 'ফিল্টারের মান পরিবর্তন করুন বা রিসেট করে ম্যাপে সব অভিযোগ পর্যবেক্ষণ করুন।'
            : 'Try adjusting or clearing your category, ward, or status filters to view markers on the map.'
          : isBn
          ? 'বর্তমান ডাটাবেসে জিওগ্রাফিক স্থানাঙ্কসহ কোনো সক্রিয় অভিযোগ তালিকাভুক্ত নেই।'
          : 'There are currently no complaints with valid geographic coordinates available.'}
      </p>

      {hasActiveFilters && onResetFilters && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onResetFilters}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          {isBn ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
        </Button>
      )}
    </div>
  );
};

export default MapEmptyState;
