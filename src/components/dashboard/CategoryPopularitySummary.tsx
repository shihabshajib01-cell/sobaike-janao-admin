import React, { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, RefreshCw, Share2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  ResponsiveDataView,
  ResponsiveDataTableView,
  ResponsiveDataCardView,
} from '@/components/ui/ResponsiveDataView';
import { useLanguage } from '@/context/LanguageContext';
import { categoryApi } from '@/services/api/categoryApi';
import {
  CategoryPopularityMetric,
  getCategoryPopularity,
} from '@/services/api/categoryPopularityApi';

interface SegmentLabel {
  nameEn: string;
  nameBn: string;
}

export const CategoryPopularitySummary: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [metrics, setMetrics] = useState<CategoryPopularityMetric[]>([]);
  const [labels, setLabels] = useState<Record<string, SegmentLabel>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);

    try {
      const ranking = await getCategoryPopularity();
      setMetrics(ranking);

      try {
        const segments = await categoryApi.getSegments();
        setLabels(
          Object.fromEntries(
            segments.map((segment) => [
              segment.id,
              { nameEn: segment.nameEn, nameBn: segment.nameBn },
            ])
          )
        );
      } catch (labelError) {
        console.warn('[CategoryPopularitySummary] Category labels unavailable:', labelError);
        setLabels({});
      }
    } catch (loadError) {
      console.error('[CategoryPopularitySummary] Failed to load:', loadError);
      setMetrics([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(
    () => metrics.slice().sort((a, b) => a.popularityRank - b.popularityRank),
    [metrics]
  );

  const formatNumber = (value: number) => value.toLocaleString(isBn ? 'bn-BD' : 'en-US');

  return (
    <Card variant="default">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            <span>{isBn ? 'ক্যাটাগরি জনপ্রিয়তা' : 'Category Popularity'}</span>
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBn
              ? 'প্রকাশিত পোস্ট ৩০% + ভিউ ৪৫% + শেয়ার ২৫% — একই র‍্যাঙ্কিং পাবলিক নেভিগেশনে ব্যবহৃত হয়।'
              : 'Published posts 30% + views 45% + shares 25% — the same ranking drives Public navigation.'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          leftIcon={<RefreshCw className={loading ? 'animate-spin' : undefined} />}
        >
          <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
        </Button>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <span>{isBn ? 'জনপ্রিয়তার তথ্য লোড করা যায়নি।' : 'Popularity data could not be loaded.'}</span>
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
          </div>
        ) : (
          <ResponsiveDataView>
            <ResponsiveDataTableView>
              <Table bare className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>{isBn ? 'র‍্যাঙ্ক' : 'Rank'}</TableHead>
                    <TableHead>{isBn ? 'ক্যাটাগরি' : 'Category'}</TableHead>
                    <TableHead>{isBn ? 'পোস্ট' : 'Posts'}</TableHead>
                    <TableHead>{isBn ? 'ভিউ' : 'Views'}</TableHead>
                    <TableHead>{isBn ? 'শেয়ার' : 'Shares'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-5 text-center text-slate-500 dark:text-slate-400">
                        {isBn ? 'জনপ্রিয়তার তথ্য লোড হচ্ছে...' : 'Loading category popularity...'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((item) => {
                      const label = labels[item.segmentId];

                      return (
                        <TableRow key={item.segmentId}>
                          <TableCell className="font-semibold text-slate-700 dark:text-slate-200">
                            #{formatNumber(item.popularityRank)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100 max-w-sm">
                            {label ? (isBn ? label.nameBn : label.nameEn) : item.segmentId}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatNumber(item.publishedPostCount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatNumber(item.viewCount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatNumber(item.shareCount)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ResponsiveDataTableView>

            <ResponsiveDataCardView>
              {loading && rows.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center text-sm text-slate-500 dark:text-slate-400">
                  {isBn ? 'জনপ্রিয়তার তথ্য লোড হচ্ছে...' : 'Loading category popularity...'}
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((item) => {
                    const label = labels[item.segmentId];

                    return (
                      <div
                        key={item.segmentId}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {label ? (isBn ? label.nameBn : label.nameEn) : item.segmentId}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {isBn ? 'জনপ্রিয়তার র‍্যাঙ্ক' : 'Popularity rank'}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400 shrink-0">
                            #{formatNumber(item.popularityRank)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-400">{isBn ? 'পোস্ট' : 'Posts'}</p>
                            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatNumber(item.publishedPostCount)}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-400">{isBn ? 'ভিউ' : 'Views'}</p>
                            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatNumber(item.viewCount)}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-400">{isBn ? 'শেয়ার' : 'Shares'}</p>
                            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatNumber(item.shareCount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ResponsiveDataCardView>
          </ResponsiveDataView>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryPopularitySummary;
