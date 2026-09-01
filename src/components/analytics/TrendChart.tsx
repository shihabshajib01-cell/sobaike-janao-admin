import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { TrendDataPoint } from '@/types/Analytics';
import { TrendingUp, BarChart2, Table as TableIcon } from 'lucide-react';
import { cn } from '@/utils';

export interface TrendChartProps {
  data: TrendDataPoint[];
  loading?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, loading = false }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);

  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  if (loading || data.length === 0) {
    return (
      <Card variant="default" className="h-full">
        <CardHeader>
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-60 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent className="h-64 flex items-end gap-2 pt-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-t animate-pulse"
              style={{ height: `${20 + (i % 4) * 20}%` }}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Calculate maximum for scaling
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.complaintsCount, d.resolvedCount, d.publishedCount, 1)),
    5
  );

  return (
    <Card variant="default" className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'অভিযোগ ও সমাধান প্রবণতা' : 'Complaint & Resolution Timeline Trend'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'দৈনিক নতুন অভিযোগ, প্রকাশনা এবং সম্পন্ন সমাধানের তুলনামূলক গ্রাফ'
                : 'Comparative timeline of submitted complaints, public broadcasts, and resolutions'}
            </CardDescription>
          </div>

          {/* Chart vs Table View Mode Switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={isBn ? 'চার্ট ভিউ' : 'Chart View'}
              aria-label="Chart View"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={isBn ? 'টেবিল ভিউ' : 'Table View'}
              aria-label="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {isBn ? 'নতুন অভিযোগ' : 'Submitted'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {isBn ? 'পাবলিক প্রকাশিত' : 'Published'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {isBn ? 'সমাধানকৃত' : 'Resolved'}
              </span>
            </div>
          </div>

          {viewMode === 'chart' ? (
            <div className="space-y-2">
              {/* Responsive Bar Chart Area */}
              <div
                className="h-52 w-full pt-4 pb-1 flex items-end gap-1.5 sm:gap-3 border-b border-slate-200 dark:border-slate-800 relative"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {data.map((point) => {
                  const dateLabel = isBn ? point.dateFormattedBn : point.dateFormattedEn;
                  const isHovered = hoveredPoint?.date === point.date;

                  const cHeight = (point.complaintsCount / maxValue) * 100;
                  const pHeight = (point.publishedCount / maxValue) * 100;
                  const rHeight = (point.resolvedCount / maxValue) * 100;

                  return (
                    <div
                      key={point.date}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(point)}
                    >
                      {/* Bar Group */}
                      <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full px-0.5">
                        <div
                          style={{ height: `${Math.max(cHeight, 6)}%` }}
                          className={cn(
                            'w-full max-w-[12px] bg-sky-500 rounded-t-xs transition-all duration-300',
                            isHovered ? 'bg-sky-600 dark:bg-sky-400 scale-y-105' : 'opacity-90'
                          )}
                        />
                        <div
                          style={{ height: `${Math.max(pHeight, 4)}%` }}
                          className={cn(
                            'w-full max-w-[12px] bg-indigo-500 rounded-t-xs transition-all duration-300',
                            isHovered ? 'bg-indigo-600 dark:bg-indigo-400 scale-y-105' : 'opacity-90'
                          )}
                        />
                        <div
                          style={{ height: `${Math.max(rHeight, 4)}%` }}
                          className={cn(
                            'w-full max-w-[12px] bg-emerald-500 rounded-t-xs transition-all duration-300',
                            isHovered ? 'bg-emerald-600 dark:bg-emerald-400 scale-y-105' : 'opacity-90'
                          )}
                        />
                      </div>

                      {/* X-axis date label */}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate w-full text-center mt-2 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                        {dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hover Tooltip / Inspector */}
              <div className="min-h-[28px] px-2 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-md text-xs flex items-center justify-between text-slate-600 dark:text-slate-300">
                {hoveredPoint ? (
                  <>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      📅 {isBn ? hoveredPoint.dateFormattedBn : hoveredPoint.dateFormattedEn}
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span>
                        {isBn ? 'দাখিল' : 'Complaints'}:{' '}
                        <strong className="text-sky-600 dark:text-sky-400">
                          {formatNumber(hoveredPoint.complaintsCount)}
                        </strong>
                      </span>
                      <span>
                        {isBn ? 'প্রচার' : 'Published'}:{' '}
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {formatNumber(hoveredPoint.publishedCount)}
                        </strong>
                      </span>
                      <span>
                        {isBn ? 'সমাধান' : 'Resolved'}:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {formatNumber(hoveredPoint.resolvedCount)}
                        </strong>
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                    {isBn
                      ? 'যেকোনো তারিখের বারের উপর হোভার করে বিস্তারিত দেখুন'
                      : 'Hover over any date bar for metric inspection'}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Accessible Table View */
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-2 px-3">{isBn ? 'তারিখ' : 'Date'}</th>
                    <th className="py-2 px-3 text-right">{isBn ? 'নতুন অভিযোগ' : 'Submitted'}</th>
                    <th className="py-2 px-3 text-right">{isBn ? 'পাবলিক প্রকাশিত' : 'Published'}</th>
                    <th className="py-2 px-3 text-right">{isBn ? 'সমাধানকৃত' : 'Resolved'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {isBn ? row.dateFormattedBn : row.dateFormattedEn}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-sky-600 dark:text-sky-400">
                        {formatNumber(row.complaintsCount)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                        {formatNumber(row.publishedCount)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatNumber(row.resolvedCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </div>

      <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          {isBn ? 'রেকর্ডকৃত দিন' : 'Total Days Monitored'}:{' '}
          <strong className="font-mono text-slate-700 dark:text-slate-300">
            {formatNumber(data.length)}
          </strong>
        </span>
        <span className="text-[10px] text-slate-400">
          {isBn ? 'স্বয়ংক্রিয় সিঙ্ক' : 'Auto-synced'}
        </span>
      </div>
    </Card>
  );
};

export default TrendChart;
