import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { FolderTree, RotateCcw, Search } from 'lucide-react';
import { cn } from '@/utils';

export interface CategoryEmptyStateProps {
  isSearchOrFiltered?: boolean;
  onResetFilters?: () => void;
  className?: string;
}

export const CategoryEmptyState: React.FC<CategoryEmptyStateProps> = ({
  isSearchOrFiltered = false,
  onResetFilters,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4">
        {isSearchOrFiltered ? (
          <Search className="w-6 h-6" />
        ) : (
          <FolderTree className="w-6 h-6" />
        )}
      </div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {isSearchOrFiltered
          ? isBn
            ? 'কোনো ক্যাটাগরি খুঁজে পাওয়া যায়নি'
            : 'No matching categories found'
          : isBn
          ? 'কোনো ক্যাটাগরি বিদ্যমান নেই'
          : 'No categories available'}
      </h3>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        {isSearchOrFiltered
          ? isBn
            ? 'আপনার অনুসন্ধানের সাথে মেলে এমন কোনো ফিচার, ক্যাটাগরি বা সাব-ক্যাটাগরি নেই। ফিল্টার রিসেট করে আবার চেষ্টা করুন।'
            : 'No categories, features or subcategories match the selected filter criteria. Try clearing or relaxing your filters.'
          : isBn
          ? 'বর্তমান শ্রেণিবিন্যাস কাঠামোতে কোনো ক্যাটাগরি লোড করা সম্ভব হয়নি।'
          : 'The taxonomy classification tree is currently empty or loading.'}
      </p>

      {isSearchOrFiltered && onResetFilters && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onResetFilters}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          {isBn ? 'ফিল্টার রিসেট করুন' : 'Reset filters'}
        </Button>
      )}
    </div>
  );
};

export default CategoryEmptyState;
