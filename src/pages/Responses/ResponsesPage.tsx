import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import {
  ResponseItem,
  ResponseFilterState,
  ResponseStatusFilter,
  ResponseTypeFilter,
} from '@/types/Response';
import { responseApi } from '@/services/api';
import { ResponseStatusTabs } from './components/ResponseStatusTabs';
import { ResponseFilters } from './components/ResponseFilters';
import { ResponseTable } from './components/ResponseTable';
import { ResponseDetailDrawer } from './components/ResponseDetailDrawer';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  MessageSquareOff,
  Inbox,
} from 'lucide-react';

const INITIAL_FILTERS: ResponseFilterState = {
  search: '',
  status: 'all',
  responseType: 'all',
  dateRange: {},
};

export const ResponsesPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<{
    all: number;
    pending_review: number;
    published: number;
    rejected: number;
    unpublished: number;
  }>({
    all: 0,
    pending_review: 0,
    published: 0,
    rejected: 0,
    unpublished: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<ResponseFilterState>(INITIAL_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 300);

  // Drawer state
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const hasActiveFilters = Boolean(
    filters.search.trim() !== '' ||
      filters.status !== 'all' ||
      filters.responseType !== 'all' ||
      filters.dateRange.startDate ||
      filters.dateRange.endDate
  );

  // Fetch responses queue from backend
  const fetchResponses = useCallback(
    async (pageToFetch = 1) => {
      setLoading(true);
      setError(null);

      try {
        const queryFilters: Partial<ResponseFilterState> = {
          search: debouncedSearch.trim(),
          status: filters.status,
          responseType: filters.responseType,
          dateRange: filters.dateRange,
        };

        const res = await responseApi.getResponses(queryFilters, pageToFetch, 20);

        setResponses(res.responses);
        setPagination({
          page: res.page,
          limit: res.limit,
          total: res.total,
          totalPages: res.totalPages,
        });
        setStatusCounts(res.statusCounts);
      } catch (err: unknown) {
        console.error('Failed to load responses:', err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, filters.status, filters.responseType, filters.dateRange]
  );

  // Re-fetch when debounced search or filters change (reset to page 1)
  useEffect(() => {
    fetchResponses(1);
  }, [fetchResponses]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && !loading) {
      fetchResponses(newPage);
    }
  };

  const handleSelectStatus = (newStatus: ResponseStatusFilter) => {
    setFilters((prev) => ({ ...prev, status: newStatus }));
  };

  const handleFilterChange = (partial: Partial<ResponseFilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleViewDetails = (item: ResponseItem) => {
    setSelectedResponse(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 min-w-0">
      {/* 1. Page Header */}
      <PageHeader
        title={isBn ? 'প্রতিক্রিয়া' : 'Responses'}
        description={
          isBn
            ? 'প্রকাশিত প্রতিবেদন সম্পর্কে জমা দেওয়া প্রতিক্রিয়া পর্যালোচনা করুন।'
            : 'Review responses submitted about published reports.'
        }
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fetchResponses(pagination.page)}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="min-h-[36px]"
          >
            <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>
        }
      />

      {/* 2. Status Filter Tabs */}
      <ResponseStatusTabs
        activeStatus={filters.status}
        counts={statusCounts}
        onSelectStatus={handleSelectStatus}
        disabled={loading}
      />

      {/* 3. Search & Filter Bar */}
      <Card variant="default">
        <CardContent className="p-4">
          <ResponseFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            isLoading={loading}
          />
        </CardContent>
      </Card>

      {/* 4. Main Content Area */}
      {error ? (
        /* Error State with Retry */
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isBn ? 'প্রতিক্রিয়া লোড করা যায়নি' : 'Failed to load responses'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            {error}
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => fetchResponses(pagination.page)}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            <span>{isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry'}</span>
          </Button>
        </div>
      ) : loading && responses.length === 0 ? (
        /* Loading Skeleton */
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 bg-slate-100/70 dark:bg-slate-800/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : responses.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
            {hasActiveFilters ? (
              <MessageSquareOff className="w-6 h-6" />
            ) : (
              <Inbox className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {hasActiveFilters
              ? isBn
                ? 'বর্তমান ফিল্টারের সঙ্গে কোনো প্রতিক্রিয়া পাওয়া যায়নি।'
                : 'No responses match the current filters.'
              : isBn
              ? 'এখনো কোনো প্রতিক্রিয়া জমা পড়েনি।'
              : 'No responses have been submitted yet.'}
          </h3>
          {hasActiveFilters && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
              >
                <span>{isBn ? 'ফিল্টার রিসেট করুন' : 'Clear filters'}</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Table & Pagination */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {isBn
                ? `মোট ${formatNumber(pagination.total)} টি প্রতিক্রিয়া পাওয়া গেছে`
                : `Showing ${responses.length} of ${pagination.total} total responses`}
            </span>
            {pagination.totalPages > 1 && (
              <span>
                {isBn
                  ? `পৃষ্ঠা ${formatNumber(pagination.page)} / ${formatNumber(pagination.totalPages)}`
                  : `Page ${pagination.page} of ${pagination.totalPages}`}
              </span>
            )}
          </div>

          <ResponseTable
            responses={responses}
            onViewDetails={handleViewDetails}
            isLoading={loading}
          />

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 px-1 w-full max-w-full">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                className="min-h-[36px]"
              >
                <span>{isBn ? 'পূর্ববর্তী' : 'Previous'}</span>
              </Button>

              <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                  const isCurrent = p === pagination.page;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      disabled={loading}
                      className={`min-w-[36px] h-9 px-2 rounded-md text-xs font-mono font-medium transition-colors ${
                        isCurrent
                          ? 'bg-sky-600 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {formatNumber(p)}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                rightIcon={<ChevronRight className="w-4 h-4" />}
                className="min-h-[36px]"
              >
                <span>{isBn ? 'পরবর্তী' : 'Next'}</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 5. Response Detail Drawer */}
      <ResponseDetailDrawer
        response={selectedResponse}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};

export default ResponsesPage;
