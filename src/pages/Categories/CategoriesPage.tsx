import React, { useState, useEffect, useCallback } from 'react';
import {
  Feature,
  Category,
  Subcategory,
  FeatureTreeNode,
  CategoryFilterState,
  CategoryStatus,
  CategoryDetailDrawerData,
} from '@/types/Category';
import { categoryApi } from '@/services/api';
import { useLanguage } from '@/context/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  FeatureTabs,
  CategoryFilters,
  CategoryTree,
  CategoryList,
  SubcategoryList,
  CategoryDetailDrawer,
  CategoryEmptyState,
} from '@/components/categories';
import {
  FolderTree,
  List,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Layers,
  Folder,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/utils';

type ViewMode = 'tree' | 'categories' | 'subcategories';

export const CategoriesPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Core Data States
  const [features, setFeatures] = useState<Feature[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [treeData, setTreeData] = useState<FeatureTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // View & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('all');
  const [filters, setFilters] = useState<CategoryFilterState>({
    search: '',
    status: 'all',
    featureId: 'all',
    categoryId: 'all',
  });

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerData, setDrawerData] = useState<CategoryDetailDrawerData | null>(null);

  // Schema Notice Modal State for "Add Category"
  const [isAddNoticeOpen, setIsAddNoticeOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [featList, catList, subList, tree] = await Promise.all([
        categoryApi.getFeatures(),
        categoryApi.getCategories(selectedFeatureId, filters),
        categoryApi.getSubcategories(undefined, {
          ...filters,
          featureId: selectedFeatureId !== 'all' ? selectedFeatureId : filters.featureId,
        }),
        categoryApi.getCategoryTree(
          selectedFeatureId !== 'all' ? selectedFeatureId : undefined,
          filters
        ),
      ]);

      setFeatures(featList);
      setCategories(catList);
      setSubcategories(subList);
      setTreeData(tree);
    } catch (error) {
      console.error('Failed to load category taxonomy data', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFeatureId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show brief toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Feature Tab Selection
  const handleSelectFeatureTab = (featId: string) => {
    setSelectedFeatureId(featId);
    setFilters((prev) => ({
      ...prev,
      featureId: featId,
    }));
  };

  // Handle Filter Change
  const handleFilterChange = (newFilters: CategoryFilterState) => {
    setFilters(newFilters);
    if (newFilters.featureId !== selectedFeatureId) {
      setSelectedFeatureId(newFilters.featureId);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    const resetState: CategoryFilterState = {
      search: '',
      status: 'all',
      featureId: 'all',
      categoryId: 'all',
    };
    setSelectedFeatureId('all');
    setFilters(resetState);
  };

  // Open Drawer for Feature, Category, or Subcategory
  const handleOpenDetails = (
    type: 'feature' | 'category' | 'subcategory',
    item: Feature | Category | Subcategory,
    parentFeature?: Feature,
    parentCategory?: Category
  ) => {
    let childCats: Category[] | undefined;
    let childSubs: Subcategory[] | undefined;

    if (type === 'feature') {
      childCats = categories.filter((c) => c.featureId === item.id);
    } else if (type === 'category') {
      childSubs = subcategories.filter((s) => s.categoryId === item.id);
    }

    setDrawerData({
      type,
      item,
      parentFeature,
      parentCategory,
      childCategories: childCats,
      childSubcategories: childSubs,
    });
    setDrawerOpen(true);
  };

  // Toggle Status (Active / Inactive)
  const handleToggleStatus = async (
    type: 'feature' | 'category' | 'subcategory',
    id: string,
    newStatus: CategoryStatus
  ) => {
    try {
      if (type === 'feature') {
        const updated = await categoryApi.updateFeatureStatus(id, newStatus);
        setFeatures((prev) => prev.map((f) => (f.id === id ? updated : f)));
        showToast(
          isBn
            ? `ফিচার "${updated.nameBn}" স্ট্যাটাস ${newStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`
            : `Feature "${updated.nameEn}" marked as ${newStatus}`
        );
      } else if (type === 'category') {
        const updated = await categoryApi.updateCategoryStatus(id, newStatus);
        setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
        showToast(
          isBn
            ? `ক্যাটাগরি "${updated.nameBn}" স্ট্যাটাস ${newStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`
            : `Category "${updated.nameEn}" marked as ${newStatus}`
        );
      } else if (type === 'subcategory') {
        const updated = await categoryApi.updateSubcategoryStatus(id, newStatus);
        setSubcategories((prev) => prev.map((s) => (s.id === id ? updated : s)));
        showToast(
          isBn
            ? `সাব-ক্যাটাগরি "${updated.nameBn}" স্ট্যাটাস ${newStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`
            : `Subcategory "${updated.nameEn}" marked as ${newStatus}`
        );
      }

      // Refresh tree
      const updatedTree = await categoryApi.getCategoryTree(
        selectedFeatureId !== 'all' ? selectedFeatureId : undefined,
        filters
      );
      setTreeData(updatedTree);

      // If drawer is open on this item, update it
      if (drawerData && drawerData.item.id === id) {
        setDrawerData((prev) =>
          prev
            ? {
                ...prev,
                item: { ...prev.item, status: newStatus },
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  // Stats calculation
  const totalCategoriesCount = categories.length;
  const totalSubcategoriesCount = subcategories.length;

  const categoryCounts = features.reduce<Record<string, number>>((acc, f) => {
    acc[f.id] = categories.filter((c) => c.featureId === f.id).length;
    return acc;
  }, {});

  const subcategoryCounts = categories.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = subcategories.filter((s) => s.categoryId === c.id).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl shadow-lg border border-slate-700 dark:border-slate-300 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={isBn ? 'ক্যাটাগরি ব্যবস্থাপনা' : 'Categories'}
        description={
          isBn
            ? 'নাগরিক অভিযোগ ও পাবলিক ফিডের ত্রি-স্তরীয় শ্রেণিবিন্যাস কাঠামো নিয়ন্ত্রণ।'
            : 'Manage the classification structure used across the platform.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
            >
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddNoticeOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {isBn ? 'নতুন ক্যাটাগরি' : 'Add Category'}
            </Button>
          </div>
        }
      />

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isBn ? 'লেভেল ১ (ফিচার)' : 'Level 1 Features'}
            </span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {features.length}
          </div>
          <span className="text-xs text-slate-400">
            {isBn ? 'নাগরিক সেবা ও জনপরিসর' : 'Civic modules'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isBn ? 'লেভেল ২ (ক্যাটাগরি)' : 'Level 2 Categories'}
            </span>
            <Folder className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalCategoriesCount}
          </div>
          <span className="text-xs text-slate-400">
            {isBn ? 'পৌর সেবা ক্লাসিফিকেশন' : 'Taxonomy groups'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isBn ? 'লেভেল ৩ (সাব-ক্যাটাগরি)' : 'Level 3 Subcategories'}
            </span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalSubcategoriesCount}
          </div>
          <span className="text-xs text-slate-400">
            {isBn ? 'সুনির্দিষ্ট সমস্যা ও বিষয়' : 'Specific problem types'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isBn ? 'সক্রিয় হার (Status)' : 'Active Rate'}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            100%
          </div>
          <span className="text-xs text-slate-400">
            {isBn ? 'পাবলিক প্ল্যাটফর্মে সিঙ্কড' : 'Public platform synced'}
          </span>
        </div>
      </div>

      {/* Feature Navigation Tabs */}
      <FeatureTabs
        features={features}
        selectedFeatureId={selectedFeatureId}
        onSelectFeature={handleSelectFeatureTab}
        categoryCounts={categoryCounts}
      />

      {/* Filter and Search Bar */}
      <CategoryFilters
        filters={filters}
        features={features}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        totalResultsCount={
          viewMode === 'tree'
            ? treeData.reduce((acc, f) => acc + f.categories.length, 0)
            : viewMode === 'categories'
            ? categories.length
            : subcategories.length
        }
      />

      {/* View Mode Switcher Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'ভিউ মোড:' : 'View Mode:'}
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-white dark:bg-slate-900 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'tree'
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>{isBn ? 'হায়ারার্কি ট্রি' : 'Hierarchy Tree'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('categories')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'categories'
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>{isBn ? 'ক্যাটাগরি টেবিল' : 'Category Table'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('subcategories')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'subcategories'
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isBn ? 'সাব-ক্যাটাগরি তালিকা' : 'Subcategories'}</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          {viewMode === 'tree' ? (
            <span>
              {isBn ? 'পূর্ণ শ্রেণিক্রম কাঠামো (L1 → L2 → L3)' : 'Full 3-Level Hierarchy (L1 → L2 → L3)'}
            </span>
          ) : viewMode === 'categories' ? (
            <span>
              {categories.length} {isBn ? 'টি ক্যাটাগরি প্রদর্শিত' : 'categories shown'}
            </span>
          ) : (
            <span>
              {subcategories.length} {isBn ? 'টি সাব-ক্যাটাগরি প্রদর্শিত' : 'subcategories shown'}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'tree' && (
        treeData.length === 0 ? (
          <CategoryEmptyState
            isSearchOrFiltered={Boolean(filters.search || filters.status !== 'all' || filters.featureId !== 'all')}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <CategoryTree
            tree={treeData}
            onViewDetails={handleOpenDetails}
            onToggleStatus={handleToggleStatus}
          />
        )
      )}

      {viewMode === 'categories' && (
        categories.length === 0 ? (
          <CategoryEmptyState
            isSearchOrFiltered={Boolean(filters.search || filters.status !== 'all' || filters.featureId !== 'all')}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <CategoryList
            categories={categories}
            features={features}
            subcategoryCounts={subcategoryCounts}
            onViewDetails={(cat, parentFeat) => handleOpenDetails('category', cat, parentFeat)}
            onToggleStatus={(catId, status) => handleToggleStatus('category', catId, status)}
            onSelectCategory={(catId) => {
              setFilters((prev) => ({ ...prev, categoryId: catId }));
              setViewMode('subcategories');
            }}
          />
        )
      )}

      {viewMode === 'subcategories' && (
        subcategories.length === 0 ? (
          <CategoryEmptyState
            isSearchOrFiltered={Boolean(filters.search || filters.status !== 'all' || filters.featureId !== 'all')}
            onResetFilters={handleResetFilters}
          />
        ) : (
          <SubcategoryList
            subcategories={subcategories}
            categories={categories}
            features={features}
            onViewDetails={(sub, parentCat, parentFeat) =>
              handleOpenDetails('subcategory', sub, parentFeat, parentCat)
            }
            onToggleStatus={(subId, status) => handleToggleStatus('subcategory', subId, status)}
          />
        )
      )}

      {/* Category Detail Drawer */}
      <CategoryDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        data={drawerData}
        onToggleStatus={handleToggleStatus}
        onSelectRelated={(type, item) => {
          if (type === 'subcategory') {
            const sub = item as Subcategory;
            const parentCat = categories.find((c) => c.id === sub.categoryId);
            const parentFeat = features.find((f) => f.id === sub.featureId);
            handleOpenDetails('subcategory', sub, parentFeat, parentCat);
          }
        }}
      />

      {/* Add Category Policy & Governance Notice Modal */}
      <Modal
        isOpen={isAddNoticeOpen}
        onClose={() => setIsAddNoticeOpen(false)}
        title={isBn ? 'ক্যাটাগরি সংযোজন নীতিমালা' : 'Taxonomy Governance Notice'}
        size="md"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="primary" size="sm" onClick={() => setIsAddNoticeOpen(false)}>
              {isBn ? 'আমি বুঝতে পেরেছি' : 'Understood'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80">
            <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-sky-900 dark:text-sky-200">
                {isBn ? 'পাবলিক প্ল্যাটফর্ম সমন্বয়' : 'Public Platform Alignment'}
              </p>
              <p className="text-sky-700 dark:text-sky-300">
                {isBn
                  ? 'সবাইকে জানাও প্ল্যাটফর্মের অভিযোগ ও পাবলিক ফিডের ফর্মসমূহ বর্তমান শ্রেণিবিন্যাস কাঠামোর সাথে সমন্বিত।'
                  : 'Sobai Ke Janao public complaint submission forms and feed filters are aligned with this taxonomy structure.'}
              </p>
            </div>
          </div>

          <p>
            {isBn
              ? 'নতুন কোনো ক্যাটাগরি বা সাব-ক্যাটাগরি যুক্ত করার জন্য প্ল্যাটফর্ম অ্যাডমিন ও সিস্টেম স্কিমা নীতিমালা পর্যালোচনা প্রয়োজন।'
              : 'Adding new categories or subcategories requires admin and schema policy review to ensure platform consistency.'}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBn
              ? 'বিদ্যমান ক্যাটাগরিগুলোর দৃশ্যমানতা নিয়ন্ত্রণ করতে আপনি প্রতিটি ক্যাটাগরি বা সাব-ক্যাটাগরির সক্রিয়/নিষ্ক্রিয় সুইচ ব্যবহার করতে পারেন।'
              : 'To control the visibility of existing classifications, you can enable or disable them using the Active/Inactive switches without data loss.'}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
