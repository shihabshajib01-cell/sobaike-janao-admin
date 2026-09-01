import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { CategorySummary } from '@/types/Analytics';
import { FolderTree, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';

export interface CategoryChartProps {
  categories: CategorySummary[];
  loading?: boolean;
}

const CATEGORY_UI_COLORS: Record<string, string> = {
  roads_traffic: '#f59e0b',
  waste_management: '#10b981',
  water_drainage: '#0284c7',
  public_lighting: '#8b5cf6',
  civic_issues: '#0ea5e9',
  illegal_construction: '#ef4444',
  noise_pollution: '#ec4899',
  parks_environment: '#22c55e',
};

export const CategoryChart: React.FC<CategoryChartProps> = ({ categories, loading = false }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  const toggleExpand = (id: string) => {
    setExpandedCategoryId((prev) => (prev === id ? null : id));
  };

  if (loading || categories.length === 0) {
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
                {isBn ? 'ক্যাটাগরি ও সাব-ক্যাটাগরি বিশ্লেষণ' : 'Category & Subcategory Taxonomy'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'নাগরিক সেবা বিভাগ ও উপ-বিভাগ ভিত্তিক অভিযোগের আনুপাতিক বণ্টন'
                : 'Proportional volume and resolution rates across civic taxonomy'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-3 space-y-4">
          {categories.map((cat) => {
            const name = isBn ? cat.nameBn : cat.nameEn;
            const isExpanded = expandedCategoryId === cat.categoryId;
            const catColor = CATEGORY_UI_COLORS[cat.categoryId] || '#64748b';

            return (
              <div
                key={cat.categoryId}
                className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              >
                {/* Category Header Row */}
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => toggleExpand(cat.categoryId)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(cat.categoryId);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {name}
                    </span>
                    {cat.subcategories.length > 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        ({formatNumber(cat.subcategories.length)} {isBn ? 'উপ-বিভাগ' : 'subs'})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {formatNumber(cat.count)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      ({cat.percentage.toFixed(1)}%)
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(cat.percentage, cat.count > 0 ? 2 : 0)}%`,
                      backgroundColor: catColor,
                    }}
                  />
                </div>

                {/* Resolution vs Pending sub-stats */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>
                      {isBn ? 'সমাধান' : 'Resolved'}:{' '}
                      <strong className="text-slate-700 dark:text-slate-300 font-mono">
                        {formatNumber(cat.resolvedCount)}
                      </strong>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>
                      {isBn ? 'অপেক্ষমান' : 'Pending'}:{' '}
                      <strong className="text-slate-700 dark:text-slate-300 font-mono">
                        {formatNumber(cat.pendingCount)}
                      </strong>
                    </span>
                  </span>
                </div>

                {/* Subcategories Breakdown Accordion */}
                {isExpanded && cat.subcategories.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5 pl-3">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 block">
                      {isBn ? 'উপ-বিভাগ বণ্টন' : 'Subcategory Breakdown'}
                    </span>
                    {cat.subcategories.map((sub) => {
                      const subName = isBn ? sub.nameBn : sub.nameEn;
                      return (
                        <div
                          key={sub.subcategoryId}
                          className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 py-0.5"
                        >
                          <span className="truncate pr-2">• {subName}</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200 shrink-0 font-medium">
                            {formatNumber(sub.count)} ({sub.percentage.toFixed(0)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </div>

      {/* Category Insight Footer */}
      <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          {isBn ? 'সর্বাধিক অভিযোগ বিভাগ' : 'Highest Volume Category'}:{' '}
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

export default CategoryChart;
