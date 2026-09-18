import React from 'react';
import { X } from 'lucide-react';
import { ButtonBase } from './Button';
import { cn } from '@/utils';

export type FilterChipTone = 'neutral' | 'info' | 'warning' | 'success';

export interface FilterChipProps {
  children: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  icon?: React.ReactNode;
  tone?: FilterChipTone;
  className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  children,
  onRemove,
  removeLabel = 'Remove filter',
  icon,
  tone = 'neutral',
  className,
}) => {
  const toneStyles: Record<FilterChipTone, string> = {
    neutral:
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
    info:
      'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/70',
    warning:
      'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/70',
    success:
      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/70',
  };

  return (
    <span
      data-button-system="filter-chip"
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2 py-1 type-meta font-medium',
        toneStyles[tone],
        className
      )}
    >
      {icon && (
        <span className="inline-flex shrink-0 [&_svg]:size-3.5" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="min-w-0 truncate">{children}</span>
      {onRemove && (
        <ButtonBase
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-current/70 hover:text-current hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="size-3" aria-hidden="true" />
        </ButtonBase>
      )}
    </span>
  );
};

export default FilterChip;
