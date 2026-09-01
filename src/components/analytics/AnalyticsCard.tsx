import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils';

export interface AnalyticsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  subtext?: string;
  loading?: boolean;
  colorClass?: string;
  iconBgClass?: string;
  badge?: React.ReactNode;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  subtext,
  loading = false,
  colorClass = 'text-slate-900 dark:text-slate-100',
  iconBgClass = 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  badge,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const formatValue = (val: number | string): string => {
    if (typeof val !== 'number') return val;
    if (!isBn) return val.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return val
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  if (loading) {
    return (
      <Card variant="default" className="h-full">
        <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" className="h-full hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            {title}
          </span>
          <div
            className={cn(
              'p-2 rounded-lg shrink-0 flex items-center justify-center transition-transform group-hover:scale-105',
              iconBgClass
            )}
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold font-mono tracking-tight', colorClass)}>
              {formatValue(value)}
            </span>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              {description}
            </p>
          )}
          {subtext && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              {subtext}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard;
