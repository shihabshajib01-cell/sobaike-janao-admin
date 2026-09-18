import React from 'react';
import { ButtonBase } from './Button';
import { cn } from '@/utils';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'sm',
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const itemSize =
    size === 'sm'
      ? 'min-h-7 px-2 py-1 type-meta gap-1.5'
      : 'min-h-8 px-2.5 py-1.5 type-meta gap-1.5';

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-button-system="segmented-control"
      className={cn(
        'inline-flex items-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-0.5',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <ButtonBase
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.ariaLabel}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center justify-center rounded transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
              itemSize,
              isActive
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-900/40',
              option.className
            )}
          >
            {option.icon && (
              <span className="inline-flex shrink-0 [&_svg]:size-3.5" aria-hidden="true">
                {option.icon}
              </span>
            )}
            {option.label}
          </ButtonBase>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
