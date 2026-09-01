import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge, BadgeStatus } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { StatusSummary } from '@/types/Analytics';
import { ComplaintLifecycleStatus } from '@/types/Complaint';
import { Activity, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils';

export interface StatusChartProps {
  statusItems: StatusSummary[];
  loading?: boolean;
}

const STATUS_UI_MAP: Record<
  ComplaintLifecycleStatus,
  { colorClass: string; badgeStatus: BadgeStatus }
> = {
  submitted: { colorClass: 'bg-amber-500', badgeStatus: 'pending' },
  published: { colorClass: 'bg-sky-500', badgeStatus: 'published' },
  rejected: { colorClass: 'bg-red-500', badgeStatus: 'rejected' },
  edited: { colorClass: 'bg-purple-500', badgeStatus: 'info' },
};

export const StatusChart: React.FC<StatusChartProps> = ({ statusItems, loading = false }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  const totalComplaints = statusItems.reduce((acc, curr) => acc + curr.count, 0);
  const resolvedCount = statusItems.find((s) => s.status === 'published')?.count || 0;
  const publishedCount = statusItems.find((s) => s.status === 'published')?.count || 0;

  if (loading || statusItems.length === 0) {
    return (
      <Card variant="default" className="h-full">
        <CardHeader>
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-60 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'স্ট্যাটাস লাইফসাইকেল পাইপলাইন' : 'Status Lifecycle Distribution'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'নাগরিক আবেদন থেকে চূড়ান্ত সমাধান পর্যন্ত ৬-ধাপের ভলিউম ও অনুপাত'
                : 'Proportional volume across 6 verified lifecycle stages'}
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">
              {isBn ? 'মোট ট্র্যাকিং' : 'Total Tracked'}
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatNumber(totalComplaints)}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-3 space-y-4">
          {/* Segmented Distribution Progress Bar */}
          <div className="space-y-1.5" aria-label="Status distribution visual bar">
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
              {statusItems.map((item) => {
                const uiConfig = STATUS_UI_MAP[item.status] || { colorClass: 'bg-slate-400', badgeStatus: 'default' };
                return (
                  <div
                    key={item.status}
                    style={{ width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%` }}
                    className={cn(uiConfig.colorClass, 'h-full transition-all duration-300 relative group')}
                    title={`${isBn ? item.labelBn : item.labelEn}: ${item.count} (${item.percentage.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-0.5">
              <span>{isBn ? 'দাখিল (০%)' : 'Submitted (0%)'}</span>
              <span>{isBn ? 'সমাধান (১০০%)' : 'Resolved (100%)'}</span>
            </div>
          </div>

          {/* Detailed Status Breakdown Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {statusItems.map((item) => {
              const label = isBn ? item.labelBn : item.labelEn;
              const uiConfig = STATUS_UI_MAP[item.status] || { colorClass: 'bg-slate-400', badgeStatus: 'default' };

              return (
                <div
                  key={item.status}
                  className="py-2.5 flex items-center justify-between group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-1 rounded transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', uiConfig.colorClass)} />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {label}
                    </span>
                    <Badge status={uiConfig.badgeStatus} size="sm" variant="subtle">
                      {item.percentage.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="text-right shrink-0 flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {formatNumber(item.count)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {isBn ? 'টি' : 'items'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </div>

      {/* Footer Insight Note */}
      <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            {isBn ? 'সফল সমাধান' : 'Resolution Count'}:{' '}
            <strong className="text-slate-700 dark:text-slate-300 font-mono">
              {formatNumber(resolvedCount)}
            </strong>{' '}
            ({totalComplaints > 0 ? ((resolvedCount / totalComplaints) * 100).toFixed(1) : 0}%)
          </span>
        </span>
        <span className="text-[10px] text-slate-400">
          {isBn ? 'পাবলিক প্রচারিত' : 'Public Broadcast'}:{' '}
          <strong className="font-mono">{formatNumber(publishedCount)}</strong>
        </span>
      </div>
    </Card>
  );
};

export default StatusChart;
