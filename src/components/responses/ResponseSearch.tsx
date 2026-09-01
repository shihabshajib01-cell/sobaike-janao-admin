import React from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/utils';

export interface ResponseSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const ResponseSearch: React.FC<ResponseSearchProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const defaultPlaceholder = isBn
    ? 'প্রতিক্রিয়ার বিষয়বস্তু, প্রেরকের নাম, অভিযোগ/পোস্ট আইডি দিয়ে খুঁজুন...'
    : 'Search by content, author name, Complaint ID, or Response ID...';

  return (
    <div className={cn('relative flex-1 min-w-[260px]', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        className={cn(
          'w-full pl-9 pr-9 py-2 text-xs rounded-lg border bg-white dark:bg-slate-900',
          'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500',
          'transition-colors duration-150'
        )}
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default ResponseSearch;
