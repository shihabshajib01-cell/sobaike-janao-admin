import React from 'react';
import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  Info,
  X,
} from 'lucide-react';
import { IconButton } from './Button';
import { cn } from '@/utils';

export type FeedbackNoticeTone =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral';

export interface FeedbackNoticeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: FeedbackNoticeTone;
  title?: React.ReactNode;
  children: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  compact?: boolean;
}

const toneStyles: Record<FeedbackNoticeTone, string> = {
  info:
    'border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-900/70 dark:bg-sky-950/35 dark:text-sky-200',
  success:
    'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200',
  warning:
    'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200',
  error:
    'border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-200',
  neutral:
    'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
};

const icons: Record<FeedbackNoticeTone, React.ReactNode> = {
  info: <Info />,
  success: <CircleCheck />,
  warning: <AlertTriangle />,
  error: <CircleX />,
  neutral: <Info />,
};

export const FeedbackNotice: React.FC<FeedbackNoticeProps> = ({
  tone = 'info',
  title,
  children,
  onDismiss,
  dismissLabel = 'Dismiss',
  compact = false,
  className,
  ...props
}) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    data-ui="feedback-notice"
    className={cn(
      'flex items-start gap-2.5 rounded-lg border',
      compact ? 'px-3 py-2.5 type-helper' : 'px-3.5 py-3 type-secondary',
      toneStyles[tone],
      className
    )}
    {...props}
  >
    <span
      className="mt-0.5 inline-flex shrink-0 items-center justify-center [&_svg]:size-4"
      aria-hidden="true"
    >
      {icons[tone]}
    </span>

    <div className="min-w-0 flex-1">
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && 'mt-0.5')}>{children}</div>
    </div>

    {onDismiss && (
      <IconButton
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        aria-label={dismissLabel}
        icon={<X />}
        className="-mr-1 -mt-1 shrink-0"
      />
    )}
  </div>
);

export default FeedbackNotice;
