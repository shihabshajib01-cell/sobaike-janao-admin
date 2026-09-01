import React, { useState } from 'react';
import {
  FeatureTreeNode,
  CategoryTreeNode,
  Subcategory,
  Feature,
  Category,
  CategoryStatus,
} from '@/types/Category';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Folder,
  FileText,
  Eye,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/utils';

export interface CategoryTreeProps {
  tree: FeatureTreeNode[];
  onViewDetails: (
    type: 'feature' | 'category' | 'subcategory',
    item: Feature | Category | Subcategory,
    parentFeature?: Feature,
    parentCategory?: Category
  ) => void;
  onToggleStatus: (
    type: 'feature' | 'category' | 'subcategory',
    id: string,
    newStatus: CategoryStatus
  ) => void;
  className?: string;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  tree,
  onViewDetails,
  onToggleStatus,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Keep track of expanded features and categories
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    tree.forEach((f) => {
      initial[`feat-${f.id}`] = true;
      f.categories.forEach((c) => {
        initial[`cat-${c.id}`] = true;
      });
    });
    return initial;
  });

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    tree.forEach((f) => {
      next[`feat-${f.id}`] = true;
      f.categories.forEach((c) => {
        next[`cat-${c.id}`] = true;
      });
    });
    setExpandedNodes(next);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  return (
    <div className={cn('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs', className)}>
      {/* Tree Top Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {isBn ? 'শ্রেণিবিন্যাস হায়ারার্কি বৃক্ষ' : 'Taxonomy Hierarchy Tree'}
          </span>
          <span className="text-slate-400">
            ({tree.reduce((acc, f) => acc + f.categories.length, 0)} {isBn ? 'ক্যাটাগরি' : 'categories'})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            leftIcon={<Maximize2 className="w-3 h-3" />}
            className="h-7 px-2 text-xs"
          >
            {isBn ? 'সব প্রসারিত করুন' : 'Expand all'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            leftIcon={<Minimize2 className="w-3 h-3" />}
            className="h-7 px-2 text-xs"
          >
            {isBn ? 'সব সংকুচিত করুন' : 'Collapse all'}
          </Button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-4 space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">
        {tree.map((feature) => {
          const isFeatExpanded = expandedNodes[`feat-${feature.id}`] ?? true;

          return (
            <div key={feature.id} className="pt-3 first:pt-0 space-y-2">
              {/* Level 1: Feature Root Node */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleNode(`feat-${feature.id}`)}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    aria-label={isFeatExpanded ? 'Collapse Feature' : 'Expand Feature'}
                  >
                    {isFeatExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div className="p-1.5 rounded-md bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs">
                    <Layers className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500">
                        L1
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {isBn ? feature.nameBn : feature.nameEn}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                        ({isBn ? feature.nameEn : feature.nameBn})
                      </span>
                      <Badge variant="outline" size="sm">
                        {feature.categories.length} {isBn ? 'ক্যাটাগরি' : 'categories'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    status={feature.status === 'active' ? 'approved' : 'default'}
                    size="sm"
                  >
                    {feature.status === 'active'
                      ? isBn ? 'সক্রিয়' : 'Active'
                      : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails('feature', feature)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    className="h-7 px-2 text-xs"
                  >
                    {isBn ? 'বিবরণ' : 'Details'}
                  </Button>
                </div>
              </div>

              {/* Level 2: Categories under this Feature */}
              {isFeatExpanded && (
                <div className="pl-4 sm:pl-6 space-y-2.5 border-l-2 border-slate-200 dark:border-slate-800 ml-3.5 sm:ml-5">
                  {feature.categories.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2 italic">
                      {isBn ? 'এই ফিচারে কোনো ক্যাটাগরি নেই' : 'No categories under this feature'}
                    </div>
                  ) : (
                    feature.categories.map((category) => {
                      const isCatExpanded = expandedNodes[`cat-${category.id}`] ?? true;

                      return (
                        <div key={category.id} className="space-y-2">
                          {/* Category Header Row */}
                          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => toggleNode(`cat-${category.id}`)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                aria-label={isCatExpanded ? 'Collapse Category' : 'Expand Category'}
                              >
                                {isCatExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <div className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                <Folder className="w-3.5 h-3.5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] font-mono text-slate-400">
                                    L2 • #{category.order}
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                                    {isBn ? category.nameBn : category.nameEn}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
                                    ({isBn ? category.nameEn : category.nameBn})
                                  </span>

                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {category.subcategories.length} {isBn ? 'টি সাব-ক্যাটাগরি' : 'subcategories'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onToggleStatus(
                                    'category',
                                    category.id,
                                    category.status === 'active' ? 'inactive' : 'active'
                                  )
                                }
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title={
                                  category.status === 'active'
                                    ? isBn ? 'নিষ্ক্রিয় করুন' : 'Deactivate'
                                    : isBn ? 'সক্রিয় করুন' : 'Activate'
                                }
                              >
                                {category.status === 'active' ? (
                                  <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                                )}
                              </button>

                              <Badge
                                status={category.status === 'active' ? 'approved' : 'default'}
                                size="sm"
                              >
                                {category.status === 'active'
                                  ? isBn ? 'সক্রিয়' : 'Active'
                                  : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                              </Badge>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewDetails('category', category, feature)}
                                leftIcon={<Eye className="w-3.5 h-3.5" />}
                                className="h-7 px-2 text-xs"
                              >
                                {isBn ? 'বিবরণ' : 'Details'}
                              </Button>
                            </div>
                          </div>

                          {/* Level 3: Subcategories under this Category */}
                          {isCatExpanded && (
                            <div className="pl-4 sm:pl-6 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-800 ml-3.5 sm:ml-5">
                              {category.subcategories.length === 0 ? (
                                <div className="text-xs text-slate-400 py-1 italic">
                                  {isBn ? 'কোনো সাব-ক্যাটাগরি নেই' : 'No subcategories'}
                                </div>
                              ) : (
                                category.subcategories.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className="p-0.5 rounded text-amber-600 dark:text-amber-400">
                                        <FileText className="w-3.5 h-3.5" />
                                      </div>

                                      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-mono text-slate-400">
                                          L3 • #{sub.order}
                                        </span>
                                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                          {isBn ? sub.nameBn : sub.nameEn}
                                        </span>
                                        <span className="text-[11px] text-slate-400 hidden md:inline truncate">
                                          ({isBn ? sub.nameEn : sub.nameBn})
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onToggleStatus(
                                            'subcategory',
                                            sub.id,
                                            sub.status === 'active' ? 'inactive' : 'active'
                                          )
                                        }
                                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        title={
                                          sub.status === 'active'
                                            ? isBn ? 'নিষ্ক্রিয় করুন' : 'Deactivate'
                                            : isBn ? 'সক্রিয় করুন' : 'Activate'
                                        }
                                      >
                                        {sub.status === 'active' ? (
                                          <ToggleRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                          <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                      </button>

                                      <Badge
                                        status={sub.status === 'active' ? 'approved' : 'default'}
                                        size="sm"
                                        className="text-[10px] py-0 px-1.5"
                                      >
                                        {sub.status === 'active'
                                          ? isBn ? 'সক্রিয়' : 'Active'
                                          : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                                      </Badge>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onViewDetails('subcategory', sub, feature, category)}
                                        leftIcon={<Eye className="w-3 h-3" />}
                                        className="h-6 px-1.5 text-[11px]"
                                      >
                                        {isBn ? 'বিবরণ' : 'Details'}
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryTree;
