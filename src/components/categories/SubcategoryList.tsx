import React from 'react';
import { Subcategory, Category, Feature, CategoryStatus } from '@/types/Category';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Folder,
  Layers,
  Eye,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/utils';

export interface SubcategoryListProps {
  subcategories: Subcategory[];
  categories: Category[];
  features: Feature[];
  onViewDetails: (subcategory: Subcategory, parentCategory?: Category, parentFeature?: Feature) => void;
  onToggleStatus: (subcategoryId: string, newStatus: CategoryStatus) => void;
  className?: string;
}

export const SubcategoryList: React.FC<SubcategoryListProps> = ({
  subcategories,
  categories,
  features,
  onViewDetails,
  onToggleStatus,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getCategory = (catId: string) => categories.find((c) => c.id === catId);
  const getFeature = (featId?: string) => featId ? features.find((f) => f.id === featId) : undefined;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 w-16 text-center">{isBn ? 'ক্রম' : 'Order'}</th>
                <th className="py-3 px-4">{isBn ? 'সাব-ক্যাটাগরির নাম (English & বাংলা)' : 'Subcategory Name'}</th>
                <th className="py-3 px-4">{isBn ? 'প্যারেন্ট ক্যাটাগরি' : 'Parent Category'}</th>
                <th className="py-3 px-4">{isBn ? 'প্যারেন্ট ফিচার' : 'Parent Feature'}</th>
                <th className="py-3 px-4 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subcategories.map((sub) => {
                const parentCat = getCategory(sub.categoryId);
                const featId = sub.featureId || parentCat?.featureId;
                const parentFeat = getFeature(featId);

                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Order */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono font-semibold">
                        {sub.order}
                      </span>
                    </td>

                    {/* Subcategory Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {sub.nameEn}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-bengali mt-0.5">
                            {sub.nameBn}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Parent Category */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Folder className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-medium">
                          {parentCat
                            ? isBn ? parentCat.nameBn : parentCat.nameEn
                            : sub.categoryId}
                        </span>
                      </div>
                    </td>

                    {/* Parent Feature */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span>
                          {parentFeat
                            ? isBn ? parentFeat.nameBn : parentFeat.nameEn
                            : featId}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <Badge
                        status={sub.status === 'active' ? 'approved' : 'default'}
                        size="sm"
                      >
                        {sub.status === 'active'
                          ? isBn ? 'সক্রিয়' : 'Active'
                          : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onToggleStatus(
                              sub.id,
                              sub.status === 'active' ? 'inactive' : 'active'
                            )
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={
                            sub.status === 'active'
                              ? isBn ? 'নিষ্ক্রিয় করুন' : 'Deactivate'
                              : isBn ? 'সক্রিয় করুন' : 'Activate'
                          }
                        >
                          {sub.status === 'active' ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(sub, parentCat, parentFeat)}
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
      <div className="md:hidden space-y-3">
        {subcategories.map((sub) => {
          const parentCat = getCategory(sub.categoryId);
          const featId = sub.featureId || parentCat?.featureId;
          const parentFeat = getFeature(featId);

          return (
            <div
              key={sub.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-400">
                      #{sub.order} • {sub.id}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {sub.nameEn}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bengali">
                      {sub.nameBn}
                    </p>
                  </div>
                </div>

                <Badge
                  status={sub.status === 'active' ? 'approved' : 'default'}
                  size="sm"
                >
                  {sub.status === 'active'
                    ? isBn ? 'সক্রিয়' : 'Active'
                    : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="text-slate-400 block">{isBn ? 'ক্যাটাগরি:' : 'Category:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                    {parentCat ? (isBn ? parentCat.nameBn : parentCat.nameEn) : sub.categoryId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isBn ? 'ফিচার:' : 'Feature:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                    {parentFeat ? (isBn ? parentFeat.nameBn : parentFeat.nameEn) : (featId || '—')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    onToggleStatus(
                      sub.id,
                      sub.status === 'active' ? 'inactive' : 'active'
                    )
                  }
                  className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
                >
                  {sub.status === 'active' ? (
                    <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{sub.status === 'active' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}</span>
                </button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewDetails(sub, parentCat, parentFeat)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  className="h-8 text-xs"
                >
                  {isBn ? 'বিস্তারিত দেখুন' : 'View details'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubcategoryList;
