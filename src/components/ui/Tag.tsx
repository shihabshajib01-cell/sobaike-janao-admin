import React from 'react';
import { cn } from '@/utils';

export type TagTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'violet';

export type TagSize = 'sm' | 'md';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  size?: TagSize;
  icon?: React.ReactNode;
  mono?: boolean;
  children: React.ReactNode;
}

const toneStyles: Record<TagTone, string> = {
  neutral:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  info:
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/50 dark:text-sky-300',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300',
  danger:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300',
  violet:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/70 dark:bg-violet-950/40 dark:text-violet-300',
};

const sizeStyles: Record<TagSize, string> = {
  sm: 'min-h-6 px-2 py-0.5 type-badge-sm gap-1.5',
  md: 'min-h-7 px-2.5 py-1 type-meta gap-1.5',
};

export const Tag: React.FC<TagProps> = ({
  tone = 'neutral',
  size = 'sm',
  icon,
  mono = false,
  className,
  children,
  ...props
}) => (
  <span
    data-ui="tag"
    className={cn(
      'inline-flex max-w-full items-center rounded-md border font-medium leading-none whitespace-nowrap',
      toneStyles[tone],
      sizeStyles[size],
      mono && 'font-mono',
      className
    )}
    {...props}
  >
    {icon && (
      <span
        className="inline-flex shrink-0 items-center justify-center [&_svg]:size-3.5"
        aria-hidden="true"
      >
        {icon}
      </span>
    )}
    <span className="min-w-0 truncate">{children}</span>
  </span>
);

export default Tag;
