import React from 'react';
import { Users, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

export interface UserEmptyStateProps {
  hasFilters?: boolean;
  onResetFilters?: () => void;
  className?: string;
}

export const UserEmptyState: React.FC<UserEmptyStateProps> = ({
  hasFilters = false,
  onResetFilters,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg ${
        className || ''
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
        <Users className="w-6 h-6" />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {hasFilters
          ? isBn
            ? 'কোনো ব্যবহারকারী পাওয়া যায়নি'
            : 'No users found matching criteria'
          : isBn
          ? 'কোনো ব্যবহারকারী তালিকাভুক্ত নেই'
          : 'No users registered'}
      </h3>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {hasFilters
          ? isBn
            ? 'আপনার অনুসন্ধানের ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।'
            : 'Try adjusting your search terms or clearing the selected role and status filters.'
          : isBn
          ? 'নতুন অ্যাডমিন ব্যবহারকারী আমন্ত্রণ জানাতে উপরের বাটনে ক্লিক করুন।'
          : 'Admin users and their permissions will appear here once provisioned.'}
      </p>

      {hasFilters && onResetFilters && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onResetFilters}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          {isBn ? 'ফিল্টার রিসেট করুন' : 'Clear all filters'}
        </Button>
      )}
    </div>
  );
};

export default UserEmptyState;
