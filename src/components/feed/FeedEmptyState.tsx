import React from 'react';
import { Rss, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/utils';

export interface FeedEmptyStateProps {
  title?: string;
  description?: string;
  onResetFilters?: () => void;
  className?: string;
}

export const FeedEmptyState: React.FC<FeedEmptyStateProps> = ({
  title,
  description,
  onResetFilters,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <Rss className="w-6 h-6" />
      </div>

      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {title || (isBn ? 'কোনো পাবলিক পোস্ট পাওয়া যায়নি' : 'No Public Feed Posts Found')}
      </h4>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {description ||
          (isBn
            ? 'আপনার নির্বাচিত ফিল্টার বা সার্চ কোয়েরির সাথে মিল পাওয়া যায়নি। ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।'
            : 'No content matching the selected status or filters. Try adjusting your query or resetting filters.')}
      </p>

      {onResetFilters && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onResetFilters}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          {isBn ? 'সকল ফিল্টার রিসেট করুন' : 'Reset All Filters'}
        </Button>
      )}
    </div>
  );
};

export default FeedEmptyState;
