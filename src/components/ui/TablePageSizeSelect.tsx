import React, { ChangeEvent, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/utils';

export interface TablePageSizeSelectProps {
  value: number;
  onChange: (pageSize: number) => void;
  options?: number[];
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const TablePageSizeSelect: React.FC<TablePageSizeSelectProps> = ({
  value,
  onChange,
  options = [10, 20, 50],
  disabled = false,
  id = 'table-page-size',
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const normalizedOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...options, value].filter(
            (option) => Number.isFinite(option) && option > 0
          )
        )
      ).sort((a, b) => a - b),
    [options, value]
  );

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = Number(event.target.value);
    if (!Number.isFinite(nextValue) || nextValue <= 0 || nextValue === value) {
      return;
    }
    onChange(nextValue);
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 type-meta text-slate-500 dark:text-slate-400',
        className
      )}
    >
      <span className="hidden whitespace-nowrap sm:inline">
        {isBn ? 'প্রতি পৃষ্ঠায় সারি' : 'Rows per page'}
      </span>
      <span className="whitespace-nowrap sm:hidden">
        {isBn ? 'সারি' : 'Rows'}
      </span>

      <span className="relative inline-flex items-center">
        <select
          id={id}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label={isBn ? 'প্রতি পৃষ্ঠায় সারির সংখ্যা' : 'Rows per page'}
          className="h-8 min-w-16 appearance-none rounded-md border border-slate-300 bg-white pl-2.5 pr-7 type-meta font-semibold text-slate-700 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          {normalizedOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 size-3.5 text-slate-400"
          aria-hidden="true"
        />
      </span>
    </label>
  );
};

export default TablePageSizeSelect;
