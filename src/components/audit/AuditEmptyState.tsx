import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

export interface AuditEmptyStateProps {
  hasFilters?: boolean;
  onResetFilters?: () => void;
}

export const AuditEmptyState: React.FC<AuditEmptyStateProps> = ({
  hasFilters = false,
  onResetFilters,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {hasFilters
          ? isBn
            ? 'কোনো অডিট রেকর্ড পাওয়া যায়নি'
            : 'No matching audit records found'
          : isBn
          ? 'এখনও কোনো অডিট লগ নেই'
          : 'No audit logs available'}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {hasFilters
          ? isBn
            ? 'আপনার ফিল্টারিং বা সার্চ কিওয়ার্ডের সাথে মেলে এমন কোনো প্রশাসনিক অ্যাক্টিভিটি পাওয়া যায়নি।'
            : 'Try adjusting your search criteria or clearing filters to view historical system activity.'
          : isBn
          ? 'সিস্টেমে কোনো প্রশাসনিক ক্রিয়া সম্পাদিত হলে তার ট্রায়াল এখানে প্রদর্শিত হবে।'
          : 'Administrative events and operator actions will automatically populate in this audit log.'}
      </p>

      {hasFilters && onResetFilters && (
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

export default AuditEmptyState;
