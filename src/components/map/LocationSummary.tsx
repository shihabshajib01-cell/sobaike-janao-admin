import React from 'react';
import { MapSummary } from '@/types/Map';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent } from '@/components/ui/Card';
import {
  MapPin,
  Layers,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/utils';

export interface LocationSummaryProps {
  summary: MapSummary | null;
  loading?: boolean;
  className?: string;
}

export const LocationSummary: React.FC<LocationSummaryProps> = ({
  summary,
  loading = false,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (loading || !summary) {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="default" padding="none" className="animate-pulse">
            <div className="p-3.5 space-y-2">
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const mostReportedLabel = summary.mostReportedCategory
    ? isBn
      ? summary.mostReportedCategory.nameBn
      : summary.mostReportedCategory.nameEn
    : isBn
    ? '—'
    : 'None';

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {/* 1. Total Locations */}
      <Card variant="default" padding="none" className="border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        <div className="p-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {isBn ? 'মোট মানচিত্র অবস্থান' : 'Total Map Locations'}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {summary.totalLocations}
              </span>
              <span className="text-[11px] text-slate-400">
                {isBn ? 'স্থান' : 'spots'}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
        </div>
      </Card>

      {/* 2. Total Complaints on Map */}
      <Card variant="default" padding="none" className="border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        <div className="p-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {isBn ? 'ম্যাপে মোট অভিযোগ' : 'Total Complaints on Map'}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {summary.totalComplaints}
              </span>
              <span className="text-[11px] text-slate-400">
                {isBn ? 'মোট' : 'items'}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </Card>

      {/* 3. Most Reported Category */}
      <Card variant="default" padding="none" className="border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        <div className="p-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {isBn ? 'সর্বাধিক অভিযোগের খাত' : 'Top Category'}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate block max-w-[130px] sm:max-w-[160px]">
                {mostReportedLabel}
              </span>
              {summary.mostReportedCategory && (
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 shrink-0">
                  ({summary.mostReportedCategory.count})
                </span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </Card>

      {/* 4. Active Complaints */}
      <Card variant="default" padding="none" className="border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        <div className="p-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {isBn ? 'সক্রিয় প্রক্রিয়াধীন অভিযোগ' : 'Active In-Process'}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                {summary.activeComplaints}
              </span>
              <span className="text-[11px] text-slate-400">
                / {summary.totalComplaints}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LocationSummary;
