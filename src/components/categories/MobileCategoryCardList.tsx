import React from 'react';
import { Category, Feature, CategoryStatus } from '@/types/Category';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Folder,
  Eye,
  ToggleLeft,
  ToggleRight,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils';

export interface MobileCategoryCardListProps {
  categories: Category[];
  features: Feature[];
  subcategoryCounts?: Record<string, number>;
  onViewDetails: (category: Category, parentFeature?: Feature) => void;
  onToggleStatus: (categoryId: string, newStatus: CategoryStatus) => void;
  isLoading?: boolean;
  className?: string;
}

export const MobileCategoryCardList: React.FC<MobileCategoryCardListProps> = ({
  categories,
  features,
  subcategoryCounts,
  onViewDetails,
  onToggleStatus,
  isLoading = false,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getFeature = (featureId: string) =>
    features.find((f) => f.id === featureId);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 space-y-3 animate-pulse border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
        <p>{isBn ? 'কোনো ক্যাটাগরি পাওয়া যায়নি' : 'No categories found'}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {categories.map((cat) => {
        const parentFeature = getFeature(cat.featureId);
        const subCount = subcategoryCounts ? subcategoryCounts[cat.id] ?? 0 : undefined;

        return (
          <Card
            key={cat.id}
            variant="default"
            padding="none"
            onClick={() => onViewDetails(cat, parentFeature)}
            className={cn(
              'w-full text-left transition-all overflow-hidden border border-slate-200 dark:border-slate-800',
              'hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.99] cursor-pointer'
            )}
          >
            <div className="p-4 space-y-2.5">
              {/* Top Row: Icon + Name + Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-slate-400">
                      #{cat.order} • {cat.id}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {cat.nameEn}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bengali truncate">
                      {cat.nameBn}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <Badge
                    status={cat.status === 'active' ? 'approved' : 'default'}
                    size="sm"
                  >
                    {cat.status === 'active'
                      ? isBn ? 'সক্রিয়' : 'Active'
                      : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Middle Row: Feature & Subcategories */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isBn ? 'ফিচার:' : 'Feature:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1 mt-0.5">
                    <Layers className="w-3 h-3 text-sky-500 shrink-0" />
                    <span className="truncate">{parentFeature ? (isBn ? parentFeature.nameBn : parentFeature.nameEn) : cat.featureId}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isBn ? 'সাব-ক্যাটাগরি:' : 'Subcategories:'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                    {typeof subCount === 'number' ? subCount : '—'}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Toggle status + Details Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(
                      cat.id,
                      cat.status === 'active' ? 'inactive' : 'active'
                    );
                  }}
                  className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  {cat.status === 'active' ? (
                    <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{cat.status === 'active' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}</span>
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(cat, parentFeature);
                  }}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  className="text-xs h-7 px-2 text-sky-600 dark:text-sky-400"
                >
                  {isBn ? 'বিস্তারিত' : 'Details'}
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileCategoryCardList;
