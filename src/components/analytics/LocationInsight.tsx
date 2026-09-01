import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { LocationSummary } from '@/types/Analytics';
import { MapPin, Navigation, CheckCircle2 } from 'lucide-react';

export interface LocationInsightProps {
  locations: LocationSummary[];
  loading?: boolean;
}

export const LocationInsight: React.FC<LocationInsightProps> = ({ locations, loading = false }) => {
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

  if (loading || locations.length === 0) {
    return (
      <Card variant="default" className="h-full">
        <CardHeader>
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-60 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
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

  const totalMapped = locations.reduce((sum, item) => sum + item.mappedCount, 0);
  const totalCount = locations.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card variant="default" className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'ভৌগোলিক এলাকাভিত্তিক বণ্টন' : 'Geographic & Location Distribution'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'এলাকা অনুযায়ী অভিযোগের ঘনত্ব এবং জিও-ট্যাগিং পরিসংখ্যান'
                : 'Complaint distribution and geospatial coordinate coverage by verified civic locations'}
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">
              {isBn ? 'ম্যাপযুক্ত অভিযোগ' : 'Geocoded'}
            </span>
            <span className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono">
              {formatNumber(totalMapped)} / {formatNumber(totalCount)}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-3 space-y-3.5">
          {locations.map((loc, idx) => (
            <div key={`${loc.location}-${idx}`} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Navigation className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {loc.location}
                  </span>
                  {loc.area && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                      ({loc.area})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px] shrink-0">
                  <span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatNumber(loc.count)}
                    </strong>{' '}
                    ({loc.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.max(loc.percentage, 4)}%` }}
                />
              </div>

              {/* Resolution & Mapped details */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>
                    {isBn ? 'সমাধান' : 'Resolved'}:{' '}
                    <strong className="text-slate-600 dark:text-slate-400 font-mono">
                      {formatNumber(loc.resolvedCount)}
                    </strong>
                  </span>
                </span>
                <span>
                  {isBn ? 'ম্যাপে চিহ্নিত' : 'GPS Tagged'}:{' '}
                  <strong className="text-slate-600 dark:text-slate-400 font-mono">
                    {formatNumber(loc.mappedCount)}
                  </strong>
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </div>

      <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          {isBn ? 'মোট সক্রিয় ভৌগোলিক ক্লাস্টার' : 'Active Location Clusters'}:{' '}
          <strong className="text-slate-700 dark:text-slate-300 font-mono">
            {formatNumber(locations.length)}
          </strong>
        </span>
        <span className="text-[10px] text-slate-400">
          {totalCount > 0 ? ((totalMapped / totalCount) * 100).toFixed(0) : 0}%{' '}
          {isBn ? 'জিওলোকেশন সক্রিয়' : 'geolocated'}
        </span>
      </div>
    </Card>
  );
};

export default LocationInsight;
