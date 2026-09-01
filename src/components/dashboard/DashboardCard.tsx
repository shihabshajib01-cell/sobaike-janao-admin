import React from 'react';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import {
  FileText,
  Clock,
  Rss,
  XCircle,
  Edit3,
  TrendingUp,
  TrendingDown,
  LucideIcon,
} from 'lucide-react';
import { DashboardStats } from '@/types/Dashboard';
import { cn } from '@/utils';

export interface DashboardStatCardItemProps {
  titleEn: string;
  titleBn: string;
  value: number;
  change: number;
  icon: LucideIcon;
  subtextEn: string;
  subtextBn: string;
  iconBgClass: string;
  iconColorClass: string;
  highlightBorder?: boolean;
}

export const StatCard: React.FC<DashboardStatCardItemProps> = ({
  titleEn,
  titleBn,
  value,
  change,
  icon: Icon,
  subtextEn,
  subtextBn,
  iconBgClass,
  iconColorClass,
  highlightBorder,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const isPositive = change > 0;
  const isNeutral = change === 0;

  // Convert number to Bengali numerals if language is Bangla
  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  const formatChange = (val: number): string => {
    const formatted = Math.abs(val).toFixed(1);
    if (!isBn) return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const bnFormatted = formatted
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
    return `${val > 0 ? '+' : '-'}${bnFormatted}%`;
  };

  return (
    <Card
      variant="default"
      padding="sm"
      className={cn(
        'relative overflow-hidden transition-all duration-150 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700',
        highlightBorder && 'border-sky-300 dark:border-sky-800/80 bg-sky-50/20 dark:bg-sky-950/10'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isBn ? titleBn : titleEn}
          </p>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {formatNumber(value)}
          </div>
        </div>
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-2xs',
            iconBgClass,
            iconColorClass
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
        <div
          className={cn(
            'inline-flex items-center gap-1 font-medium',
            isPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : isNeutral
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : isNeutral ? null : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{formatChange(change)}</span>
        </div>
        <span className="text-slate-400 dark:text-slate-500 truncate ml-2">
          {isBn ? subtextBn : subtextEn}
        </span>
      </div>
    </Card>
  );
};

export interface DashboardCardsGridProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

export const DashboardCardsGrid: React.FC<DashboardCardsGridProps> = ({ stats, loading }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-28 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 animate-pulse p-4 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  const cardsData: DashboardStatCardItemProps[] = [
    {
      titleEn: 'Total Complaints',
      titleBn: 'মোট অভিযোগ',
      value: stats.totalComplaints,
      change: stats.trends.totalComplaintsChange,
      icon: FileText,
      subtextEn: 'vs last 30 days',
      subtextBn: 'বিগত ৩০ দিনের তুলনায়',
      iconBgClass: 'bg-sky-50 dark:bg-sky-950/60',
      iconColorClass: 'text-sky-600 dark:text-sky-400',
    },
    {
      titleEn: 'Submitted',
      titleBn: 'দাখিলকৃত',
      value: stats.submitted,
      change: stats.trends.submittedChange,
      icon: Clock,
      subtextEn: 'awaiting triage',
      subtextBn: 'ট্রায়াজ অপেক্ষমান',
      iconBgClass: 'bg-amber-50 dark:bg-amber-950/60',
      iconColorClass: 'text-amber-600 dark:text-amber-400',
      highlightBorder: stats.submitted > 100,
    },
    {
      titleEn: 'Published',
      titleBn: 'প্রকাশিত',
      value: stats.published,
      change: stats.trends.publishedChange,
      icon: Rss,
      subtextEn: 'on public feed',
      subtextBn: 'পাবলিক ফিডে সক্রিয়',
      iconBgClass: 'bg-blue-50 dark:bg-blue-950/60',
      iconColorClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      titleEn: 'Rejected',
      titleBn: 'বাতিলকৃত',
      value: stats.rejected,
      change: stats.trends.rejectedChange,
      icon: XCircle,
      subtextEn: 'declined complaints',
      subtextBn: 'বাতিলকৃত আবেদন',
      iconBgClass: 'bg-rose-50 dark:bg-rose-950/60',
      iconColorClass: 'text-rose-600 dark:text-rose-400',
    },
    {
      titleEn: 'Edited',
      titleBn: 'সম্পাদিত',
      value: stats.edited,
      change: stats.trends.editedChange,
      icon: Edit3,
      subtextEn: 'revised versions',
      subtextBn: 'সংশোধিত সংস্করণ',
      iconBgClass: 'bg-indigo-50 dark:bg-indigo-950/60',
      iconColorClass: 'text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cardsData.map((card, idx) => (
        <StatCard key={idx} {...card} />
      ))}
    </div>
  );
};

export default DashboardCardsGrid;
