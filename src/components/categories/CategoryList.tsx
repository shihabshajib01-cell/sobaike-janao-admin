import React from 'react';
import { Category, Feature, CategoryStatus } from '@/types/Category';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Folder,
  Eye,
  ToggleLeft,
  ToggleRight,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/utils';
import { MobileCategoryCardList } from './MobileCategoryCardList';

export interface CategoryListProps {
  categories: Category[];
  features: Feature[];
  subcategoryCounts?: Record<string, number>;
  onViewDetails: (category: Category, parentFeature?: Feature) => void;
  onToggleStatus: (categoryId: string, newStatus: CategoryStatus) => void;
  onSelectCategory?: (categoryId: string) => void;
  className?: string;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  features,
  subcategoryCounts,
  onViewDetails,
  onToggleStatus,
  onSelectCategory,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getFeature = (featureId: string) =>
    features.find((f) => f.id === featureId);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 w-16 text-center">{isBn ? 'ক্রম' : 'Order'}</th>
                <th className="py-3 px-4">{isBn ? 'ক্যাটাগরির নাম (English & বাংলা)' : 'Category Name'}</th>
                <th className="py-3 px-4">{isBn ? 'প্যারেন্ট ফিচার' : 'Parent Feature'}</th>
                <th className="py-3 px-4 text-center">{isBn ? 'সাব-ক্যাটাগরি' : 'Subcategories'}</th>
                <th className="py-3 px-4 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((cat) => {
                const parentFeature = getFeature(cat.featureId);
                const subCount = subcategoryCounts ? subcategoryCounts[cat.id] ?? 0 : undefined;

                return (
                  <tr
                    key={cat.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Order */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono font-semibold">
                        {cat.order}
                      </span>
                    </td>

                    {/* Category Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {cat.nameEn}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-bengali mt-0.5">
                            {cat.nameBn}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Parent Feature */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="font-medium">
                          {parentFeature
                            ? isBn ? parentFeature.nameBn : parentFeature.nameEn
                            : cat.featureId}
                        </span>
                      </div>
                    </td>

                    {/* Subcategories Count */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title={isBn ? 'সাব-ক্যাটাগরি ফিল্টার করুন' : 'Filter subcategories'}
                      >
                        <span>{typeof subCount === 'number' ? subCount : '—'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        status={cat.status === 'active' ? 'approved' : 'default'}
                        size="sm"
                      >
                        {cat.status === 'active'
                          ? isBn ? 'সক্রিয়' : 'Active'
                          : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onToggleStatus(
                              cat.id,
                              cat.status === 'active' ? 'inactive' : 'active'
                            )
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={
                            cat.status === 'active'
                              ? isBn ? 'নিষ্ক্রিয় করুন' : 'Deactivate'
                              : isBn ? 'সক্রিয় করুন' : 'Activate'
                          }
                        >
                          {cat.status === 'active' ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(cat, parentFeature)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          className="h-8 px-2.5 text-xs"
                        >
                          {isBn ? 'বিবরণ' : 'Details'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <MobileCategoryCardList
          categories={categories}
          features={features}
          subcategoryCounts={subcategoryCounts}
          onViewDetails={onViewDetails}
          onToggleStatus={onToggleStatus}
        />
      </div>
    </div>
  );
};

export default CategoryList;
