import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { CategorySummaryItem } from '@/types/Dashboard';
import { FolderTree, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/utils';

const CATEGORY_COLOR_MAP: Record<string, string> = {
  civic_issues: 'bg-sky-500 dark:bg-sky-400',
  roads_traffic: 'bg-amber-500 dark:bg-amber-400',
  waste_management: 'bg-emerald-500 dark:bg-emerald-400',
  extortion: 'bg-rose-500 dark:bg-rose-400',
  harassment: 'bg-purple-500 dark:bg-purple-400',
  corruption: 'bg-pink-500 dark:bg-pink-400',
};

export interface CategoryOverviewProps {
  categories: CategorySummaryItem[];
  loading?: boolean;
}

export const CategoryOverview: React.FC<CategoryOverviewProps> = ({ categories, loading }) => {
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

  if (loading || categories.length === 0) {
    return (
      <Card variant="default" className="h-full">
        <CardHeader>
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-60 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2 py-1">
              <div className="flex justify-between">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const highestCategory = categories.reduce(
    (max, item) => (item.count > max.count ? item : max),
    categories[0]
  );

  return (
    <Card variant="default" className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'নাগরিক সেবা ক্যাটাগরি বিশ্লেষণ' : 'Civic Issue Taxonomy & Distribution'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'পৌর সেবা ও অপরাধ বিভাগভিত্তিক অভিযোগের আনুপাতিক হার'
                : 'Proportional volume and resolution rates across civic sectors'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-3 space-y-3.5">
          {categories.map((cat) => {
            const name = isBn ? cat.nameBn : cat.nameEn;
            const colorClass = CATEGORY_COLOR_MAP[cat.id] || 'bg-sky-500';

            return (
              <div key={cat.id} className="space-y-1.5 group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn('w-2.5 h-2.5 rounded-xs shrink-0', colorClass)}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    <span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatNumber(cat.count)}
                      </strong>{' '}
                      ({cat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300', colorClass)}
                    style={{
                      width: `${cat.percentage}%`,
                    }}
                  />
                </div>

                {/* Mini stats row (Resolved vs Pending) */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>
                      {isBn ? 'সমাধান' : 'Resolved'}:{' '}
                      <strong className="text-slate-600 dark:text-slate-400 font-mono">
                        {formatNumber(cat.resolvedCount)}
                      </strong>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>
                      {isBn ? 'অপেক্ষমান' : 'Pending'}:{' '}
                      <strong className="text-slate-600 dark:text-slate-400 font-mono">
                        {formatNumber(cat.pendingCount)}
                      </strong>
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </div>

      {/* Category Insight Footer */}
      <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          {isBn ? 'সর্বাধিক অভিযোগ বিভাগ' : 'Highest Volume Sector'}:{' '}
          <strong className="text-slate-700 dark:text-slate-300">
            {isBn ? highestCategory?.nameBn : highestCategory?.nameEn}
          </strong>
        </span>
        <span className="font-mono text-[10px]">
          {highestCategory?.percentage.toFixed(1)}% of total
        </span>
      </div>
    </Card>
  );
};

export default CategoryOverview;
