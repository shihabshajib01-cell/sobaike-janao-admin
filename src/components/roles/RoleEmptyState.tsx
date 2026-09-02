import React from 'react';
import { Shield, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

export interface RoleEmptyStateProps {
  className?: string;
}

export const RoleEmptyState: React.FC<RoleEmptyStateProps> = ({ className = '' }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 my-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-xs">
        <Shield className="w-7 h-7" />
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
        {isBn ? 'এখনো কোনো ভূমিকা তৈরি করা হয়নি' : 'No roles created yet'}
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        {isBn
          ? 'অ্যাডমিনিস্ট্রেটররা কোন ক্ষেত্র এবং কার্যকলাপে প্রবেশ করতে পারবেন তা নির্ধারণ করতে ভূমিকা তৈরি করুন।'
          : 'Create roles to define which areas and actions administrators can access.'}
      </p>

      <div className="flex flex-col items-center gap-2">
        <Button
          id="empty-create-role-btn"
          variant="primary"
          size="sm"
          disabled
          aria-disabled="true"
          leftIcon={<Plus className="w-4 h-4" />}
          title={
            isBn
              ? 'ভূমিকা তৈরি করার প্রক্রিয়া পরবর্তী ধাপে চালু হবে'
              : 'Create Role workflow will be enabled in the upcoming phase'
          }
          className="cursor-not-allowed opacity-60"
        >
          {isBn ? 'ভূমিকা তৈরি করুন' : 'Create Role'}
        </Button>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          {isBn
            ? 'রোল ক্রিয়েশন ফ্লো পরবর্তী ফেজে উপলব্ধ হবে'
            : 'Role creation workflow available in next phase'}
        </span>
      </div>
    </div>
  );
};

export default RoleEmptyState;
