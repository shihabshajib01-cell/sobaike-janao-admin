import React, { useState, useEffect } from 'react';
import {
  Feature,
  Category,
  Subcategory,
  CategoryStatus,
  CategoryDetailDrawerData,
} from '@/types/Category';
import { useLanguage } from '@/context/LanguageContext';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import {
  Folder,
  FileText,
  CheckCircle2,
  Layers,
  ArrowRight,
  Hash,
  GitFork,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/utils';

export interface CategoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: CategoryDetailDrawerData | null;
  onToggleStatus: (
    type: 'feature' | 'category' | 'subcategory',
    id: string,
    newStatus: CategoryStatus
  ) => void;
  onSelectRelated?: (type: 'feature' | 'category' | 'subcategory', item: Feature | Category | Subcategory) => void;
}

export const CategoryDetailDrawer: React.FC<CategoryDetailDrawerProps> = ({
  isOpen,
  onClose,
  data,
  onToggleStatus,
  onSelectRelated,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [mobileTab, setMobileTab] = useState<'overview' | 'hierarchy' | 'children'>('overview');

  useEffect(() => {
    if (isOpen) {
      setMobileTab('overview');
    }
  }, [isOpen, data?.item?.id]);

  if (!data || !data.item) return null;

  const { type, item, parentFeature, parentCategory, childCategories, childSubcategories } = data;
  const isFeature = type === 'feature';
  const isCategory = type === 'category';
  const isSubcategory = type === 'subcategory';

  const currentStatus = item.status;
  const isActive = currentStatus === 'active';

  const hasChildren = Boolean(
    (isCategory && childSubcategories && childSubcategories.length > 0) ||
    (isFeature && childCategories && childCategories.length > 0)
  );

  const handleStatusSwitch = (checked: boolean) => {
    const newStatus: CategoryStatus = checked ? 'active' : 'inactive';
    onToggleStatus(type, item.id, newStatus);
  };

  const headerCard = (
    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
            {isFeature ? (
              <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            ) : isCategory ? (
              <Folder className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
          </span>
          <div>
            <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {type.toUpperCase()} ID: {item.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge status={isActive ? 'approved' : 'default'} size="sm">
            {isActive ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                {isBn ? 'সক্রিয়' : 'Active'}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
              </span>
            )}
          </Badge>

          <Badge variant="outline" size="sm">
            {isBn ? `ক্রম #${item.order}` : `Order #${item.order}`}
          </Badge>
        </div>
      </div>

      {/* Names */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {item.nameEn}
        </h3>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 font-bengali mt-0.5">
          {item.nameBn}
        </p>
      </div>
    </div>
  );

  const hierarchyCard = (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {isBn ? 'হায়ারার্কি ও সম্পর্ক' : 'Hierarchy & Relationships'}
      </h4>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
        {/* Feature (Level 1) */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            {isBn ? 'লেভেল ১ (ফিচার):' : 'Level 1 (Feature):'}
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {isFeature
              ? isBn ? item.nameBn : item.nameEn
              : parentFeature
              ? isBn ? parentFeature.nameBn : parentFeature.nameEn
              : isBn ? 'অভিযোগ প্রতিকার' : 'Citizen Complaints'}
          </span>
        </div>

        {/* Category (Level 2) */}
        {(isCategory || isSubcategory) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-emerald-500" />
              {isBn ? 'লেভেল ২ (ক্যাটাগরি):' : 'Level 2 (Category):'}
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {isCategory
                ? isBn ? item.nameBn : item.nameEn
                : parentCategory
                ? isBn ? parentCategory.nameBn : parentCategory.nameEn
                : '-'}
            </span>
          </div>
        )}

        {/* Subcategory (Level 3) */}
        {isSubcategory && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              {isBn ? 'লেভেল ৩ (সাব-ক্যাটাগরি):' : 'Level 3 (Subcategory):'}
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {isBn ? item.nameBn : item.nameEn}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const metricsCard = (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {isBn ? 'কাঠামোগত তথ্য' : 'Structural Information'}
      </h4>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            {isBn ? 'ক্রমিক অবস্থান' : 'Sequence Order'}
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <Hash className="w-4 h-4 text-slate-400" />
            {item.order}
          </span>
        </div>

        {isCategory && (
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {isBn ? 'মোট সাব-ক্যাটাগরি' : 'Subcategories'}
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {childSubcategories ? childSubcategories.length : 0}
            </span>
          </div>
        )}

        {isFeature && (
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {isBn ? 'মোট ক্যাটাগরি' : 'Categories'}
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {childCategories ? childCategories.length : 0}
            </span>
          </div>
        )}

        {isSubcategory && (
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {isBn ? 'হায়ারার্কি স্তর' : 'Hierarchy Level'}
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              L3 (Subcategory)
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const childrenSection = (
    <>
      {/* Child Subcategories List */}
      {isCategory && childSubcategories && childSubcategories.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{isBn ? `সাব-ক্যাটাগরি তালিকা (${childSubcategories.length})` : `Subcategories (${childSubcategories.length})`}</span>
          </h4>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            {childSubcategories.map((sub) => (
              <div
                key={sub.id}
                className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {sub.nameEn}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bengali truncate">
                    {sub.nameBn}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge status={sub.status === 'active' ? 'approved' : 'default'} size="sm">
                    {sub.status === 'active' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                  </Badge>
                  {onSelectRelated && (
                    <button
                      type="button"
                      onClick={() => onSelectRelated('subcategory', sub)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={isBn ? 'বিস্তারিত দেখুন' : 'View details'}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Child Categories List for Feature */}
      {isFeature && childCategories && childCategories.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{isBn ? `ক্যাটাগরি তালিকা (${childCategories.length})` : `Categories (${childCategories.length})`}</span>
          </h4>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            {childCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {cat.nameEn}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bengali truncate">
                    {cat.nameBn}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge status={cat.status === 'active' ? 'approved' : 'default'} size="sm">
                    {cat.status === 'active' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const tierInfo = (
    <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <span>{isBn ? 'শ্রেণিক্রম স্তর:' : 'Taxonomy Tier:'} {type.toUpperCase()}</span>
      <span>{isBn ? 'আইডি:' : 'ID:'} {item.id}</span>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      size="lg"
      mobileSheet={true}
      title={
        isFeature
          ? isBn ? 'ফিচার বিবরণী' : 'Feature Information'
          : isCategory
          ? isBn ? 'ক্যাটাগরি বিবরণী' : 'Category Information'
          : isBn ? 'সাব-ক্যাটাগরি বিবরণী' : 'Subcategory Information'
      }
      description={
        isBn
          ? 'শ্রেণিবিন্যাস শ্রেণিক্রম ও স্ট্যাটাস নিয়ন্ত্রণ'
          : 'Taxonomy hierarchy details and visibility controls'
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Switch
              id="drawer-status-toggle"
              checked={isActive}
              onChange={handleStatusSwitch}
              size="sm"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isActive
                ? isBn ? 'সক্রিয় (পাবলিক প্ল্যাটফর্মে দৃশ্যমান)' : 'Active (Publicly Enabled)'
                : isBn ? 'নিষ্ক্রিয় (লুকানো)' : 'Inactive (Hidden)'}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </Button>
        </div>
      }
    >
      {/* Mobile Tab Header (<sm) */}
      <div className="sm:hidden -mt-1 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => setMobileTab('overview')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
              mobileTab === 'overview'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{isBn ? 'সারসংক্ষেপ' : 'Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('hierarchy')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
              mobileTab === 'hierarchy'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isBn ? 'হায়ারার্কি' : 'Hierarchy'}</span>
          </button>

          {hasChildren && (
            <button
              type="button"
              onClick={() => setMobileTab('children')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
                mobileTab === 'children'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>
                {isCategory
                  ? isBn ? `সাব-ক্যাটাগরি (${childSubcategories?.length || 0})` : `Subcategories (${childSubcategories?.length || 0})`
                  : isBn ? `ক্যাটাগরি (${childCategories?.length || 0})` : `Categories (${childCategories?.length || 0})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Content (<sm) */}
      <div className="sm:hidden space-y-4">
        {mobileTab === 'overview' && (
          <div className="space-y-4">
            {headerCard}
            {metricsCard}
            {tierInfo}
          </div>
        )}

        {mobileTab === 'hierarchy' && (
          <div className="space-y-4">
            {hierarchyCard}
          </div>
        )}

        {mobileTab === 'children' && hasChildren && (
          <div className="space-y-4">
            {childrenSection}
          </div>
        )}
      </div>

      {/* Desktop Stack (sm+) - Unchanged */}
      <div className="hidden sm:block space-y-6 text-sm">
        {headerCard}
        {hierarchyCard}
        {metricsCard}
        {childrenSection}
        {tierInfo}
      </div>
    </Drawer>
  );
};

export default CategoryDetailDrawer;
