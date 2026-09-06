import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
  ResponseStatusTabs,
  ResponseSearch,
  ResponseFilters,
  ResponseTable,
  MobileResponseCardList,
  ResponseEmptyState,
  ResponseDetailDrawer,
} from '@/components/responses';
import {
  ResponseItem,
  ResponseFilterState,
  ResponseStatusFilter,
  ResponseListResponse,
} from '@/types/Response';
import { responseApi } from '@/services/api';
import { RefreshCw, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { formatNumber } from '@/utils/notificationUtils';

const INITIAL_FILTERS: ResponseFilterState = {
  search: '',
  status: 'all',
  relatedType: 'all',
  authorRole: 'all',
  categoryId: 'all',
  dateRange: {},
};

export const ResponsesPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<ResponseStatusFilter, number>>({
    all: 0,
    pending_review: 0,
    approved: 0,
    published: 0,
    rejected: 0,
    unpublished: 0,
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 8,
    totalItems: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<ResponseFilterState>(INITIAL_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Drawer detail state
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Active filters check
  const hasActiveFilters = Boolean(
    filters.search.trim() !== '' ||
      filters.relatedType !== 'all' ||
      filters.authorRole !== 'all' ||
      filters.categoryId !== 'all'
  );

  // Fetch responses
  const fetchResponses = useCallback(
    async (pageToLoad = pagination.currentPage) => {
      setLoading(true);
      try {
        const res: ResponseListResponse = await responseApi.getResponses(
          filters,
          pageToLoad,
          pagination.pageSize
        );
        setResponses(res.responses);
        setStatusCounts(res.statusCounts);
        setPagination({
          currentPage: res.page,
          pageSize: res.limit,
          totalItems: res.total,
          totalPages: res.totalPages,
        });
      } catch (err) {
        console.error('Failed to load responses:', err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.pageSize]
  );

  useEffect(() => {
    fetchResponses(1);
  }, [filters]);

  // Tab Selection
  const handleSelectStatus = (status: ResponseStatusFilter) => {
    setFilters((prev) => ({ ...prev, status }));
  };

  // Search input
  const handleSearchChange = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
  };

  // Filter change
  const handleFiltersChange = (newFilters: ResponseFilterState) => {
    setFilters(newFilters);
  };

  // Reset all filters except current status tab
  const handleResetFilters = () => {
    setFilters({
      ...INITIAL_FILTERS,
      status: filters.status,
    });
  };

  // Response row click
  const handleSelectResponse = (item: ResponseItem) => {
    setSelectedResponse(item);
    setIsDrawerOpen(true);
  };

  // Workflow Handlers
  const handleApprove = async (responseId: string, notes?: string) => {
    const result = await responseApi.approveResponse(responseId, notes);
    if (result.success) {
      setSelectedResponse(result.response);
      await fetchResponses(pagination.currentPage);
    }
  };

  const handlePublish = async (responseId: string, options?: { notes?: string }) => {
    const result = await responseApi.publishResponse(responseId, options);
    if (result.success) {
      setSelectedResponse(result.response);
      await fetchResponses(pagination.currentPage);
    }
  };

  const handleUnpublish = async (responseId: string, reason: string) => {
    const result = await responseApi.unpublishResponse(responseId, reason);
    if (result.success) {
      setSelectedResponse(result.response);
      await fetchResponses(pagination.currentPage);
    }
  };

  const handleReject = async (responseId: string, reason: string, explanation: string) => {
    const result = await responseApi.rejectResponse(responseId, reason, explanation);
    if (result.success) {
      setSelectedResponse(result.response);
      await fetchResponses(pagination.currentPage);
    }
  };

  const handleUpdatePublicVersion = async (
    responseId: string,
    publicContentEn: string,
    publicContentBn: string
  ) => {
    const result = await responseApi.updatePublicVersion(
      responseId,
      publicContentEn,
      publicContentBn
    );
    if (result.success) {
      setSelectedResponse(result.response);
      await fetchResponses(pagination.currentPage);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header */}
      <PageHeader
        title={isBn ? 'প্রতিক্রিয়া ব্যবস্থাপনা' : 'Responses Moderation'}
        description={
          isBn
            ? 'নাগরিক ও অফিশিয়াল কর্তৃপক্ষের জমা দেওয়া প্রতিক্রিয়া যাচাই, অনুমোদন এবং প্রকাশনা পরিচালনা করুন।'
            : 'Review, approve, and moderate official and citizen responses linked to complaints and posts.'
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchResponses(pagination.currentPage)}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>
        }
      />

      {/* 2. Status Tabs Bar */}
      <ResponseStatusTabs
        activeTab={filters.status}
        onChange={handleSelectStatus}
        counts={statusCounts}
      />

      {/* 3. Search & Filter Toolbar */}
      <Card variant="default">
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search input */}
            <div className="w-full sm:max-w-md">
              <ResponseSearch
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>

            {/* Advanced Filters Toggle */}
            <div className="w-full sm:w-auto flex items-center justify-end gap-2">
              <Button
                variant={showAdvancedFilters || hasActiveFilters ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                <span>
                  {showAdvancedFilters
                    ? isBn
                      ? 'ফিল্টার লুকান'
                      : 'Hide Filters'
                    : isBn
                    ? 'ফিল্টার বিকল্প'
                    : 'Filter Options'}
                </span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-sky-500 ml-1 inline-block" />
                )}
              </Button>
            </div>
          </div>

          {/* Collapsible Advanced Filters */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in-50 duration-200">
              <ResponseFilters
                filters={filters}
                onChange={handleFiltersChange}
                onReset={handleResetFilters}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Results Stats & Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {isBn
              ? `মোট ${formatNumber(pagination.totalItems, 'bn')} টি প্রতিক্রিয়া পাওয়া গেছে`
              : `Showing ${responses.length} of ${pagination.totalItems} total responses`}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              {isBn
                ? `পৃষ্ঠা ${formatNumber(pagination.currentPage, 'bn')} / ${formatNumber(pagination.totalPages, 'bn')}`
                : `Page ${pagination.currentPage} of ${pagination.totalPages}`}
            </span>
          )}
        </div>

        {/* Content View: Empty or Data */}
        {!loading && responses.length === 0 ? (
          <ResponseEmptyState
            onResetFilters={hasActiveFilters ? handleResetFilters : undefined}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <ResponseTable
                responses={responses}
                onSelectResponse={handleSelectResponse}
                isLoading={loading}
              />
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden">
              <MobileResponseCardList
                responses={responses}
                onSelectResponse={handleSelectResponse}
              />
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.currentPage <= 1 || loading}
              onClick={() => fetchResponses(pagination.currentPage - 1)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              {isBn ? 'পূর্ববর্তী' : 'Previous'}
            </Button>

            <span className="text-xs text-slate-600 dark:text-slate-400">
              {isBn
                ? `পৃষ্ঠা ${formatNumber(pagination.currentPage, 'bn')} / ${formatNumber(pagination.totalPages, 'bn')}`
                : `Page ${pagination.currentPage} of ${pagination.totalPages}`}
            </span>

            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              onClick={() => fetchResponses(pagination.currentPage + 1)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              {isBn ? 'পরবর্তী' : 'Next'}
            </Button>
          </div>
        )}
      </div>

      {/* 5. Detail & Moderation Drawer */}
      <ResponseDetailDrawer
        response={selectedResponse}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onApprove={handleApprove}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onReject={handleReject}
        onUpdatePublicVersion={handleUpdatePublicVersion}
      />
    </div>
  );
};

export default ResponsesPage;
