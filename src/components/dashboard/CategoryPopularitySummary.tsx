import React, { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, RefreshCw, Share2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
          leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-3 font-medium">{isBn ? 'র‍্যাঙ্ক' : 'Rank'}</th>
                  <th className="py-2 pr-3 font-medium">{isBn ? 'ক্যাটাগরি' : 'Category'}</th>
                  <th className="py-2 pr-3 font-medium">{isBn ? 'পোস্ট' : 'Posts'}</th>
                  <th className="py-2 pr-3 font-medium">{isBn ? 'ভিউ' : 'Views'}</th>
                  <th className="py-2 font-medium">{isBn ? 'শেয়ার' : 'Shares'}</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-slate-500 dark:text-slate-400">
                      {isBn ? 'জনপ্রিয়তার তথ্য লোড হচ্ছে...' : 'Loading category popularity...'}
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => {
                    const label = labels[item.segmentId];
                    return (
                      <tr
                        key={item.segmentId}
                        className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/70"
                      >
                        <td className="py-3 pr-3 font-semibold text-slate-700 dark:text-slate-200">
                          #{formatNumber(item.popularityRank)}
                        </td>
                        <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-100">
                          {label ? (isBn ? label.nameBn : label.nameEn) : item.segmentId}
                        </td>
                        <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatNumber(item.publishedPostCount)}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatNumber(item.viewCount)}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatNumber(item.shareCount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryPopularitySummary;
