import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DownloadMenu } from '@/components/ui/DownloadMenu';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import {
  ResponseItem,
  ResponseFilterState,
  ResponseStatusFilter,
} from '@/types/Response';
import { responseApi } from '@/services/api';
import { exportResponsesToCsv, exportResponsesToPdf } from '@/utils';
import {
  ResponseStatusTabs,
  ResponseSearch,
  ResponseFilters,
  ResponseTable,
  MobileResponseCardList,
  ResponseDetailDrawer,
  ResponseEmptyState,
} from '@/components/responses';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

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

  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<ResponseFilterState>(INITIAL_FILTERS);
  const [statusCounts, setStatusCounts] = useState<Record<ResponseStatusFilter, number>>({
    all: 0,
    pending_review: 0,
    approved: 0,
    published: 0,
    rejected: 0,
    unpublished: 0,
  });

  // Selected response for detail drawer
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter expand toggle for mobile
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Fetch responses
  const loadResponses = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await responseApi.getResponses(filters, currentPage, pageSize);
      setResponses(res.responses);
      setTotalResponses(res.total);
      setTotalPages(res.totalPages);
      setStatusCounts(res.statusCounts);

      // Keep selected response fresh if drawer is open
      if (selectedResponse) {
        const fresh = res.responses.find((r) => r.id === selectedResponse.id);
        if (fresh) setSelectedResponse(fresh);
      }
    } catch (error) {
      console.error('Failed to load responses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize, selectedResponse]);

  useEffect(() => {
    loadResponses();
  }, [filters, currentPage]);

  const handleStatusTabChange = (status: ResponseStatusFilter) => {
    setFilters((prev) => ({ ...prev, status }));
    setCurrentPage(1);
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: ResponseFilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
  };

  const handleSelectResponse = (response: ResponseItem) => {
    setSelectedResponse(response);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  // Moderation Workflow Handlers
  const handleApprove = async (responseId: string, notes?: string) => {
    const res = await responseApi.approveResponse(responseId, notes);
    setSelectedResponse(res.response);
    await loadResponses();
  };

  const handlePublish = async (responseId: string, options?: { notes?: string }) => {
    const res = await responseApi.publishResponse(responseId, options);
    setSelectedResponse(res.response);
    await loadResponses();
  };

  const handleUnpublish = async (responseId: string, reason: string) => {
    const res = await responseApi.unpublishResponse(responseId, reason);
    setSelectedResponse(res.response);
    await loadResponses();
  };

  const handleReject = async (responseId: string, reason: string, explanation: string) => {
    const res = await responseApi.rejectResponse(responseId, reason, explanation);
    setSelectedResponse(res.response);
    await loadResponses();
  };

  const handleUpdatePublicVersion = async (
    responseId: string,
    publicContentEn: string,
    publicContentBn: string
  ) => {
    const res = await responseApi.updatePublicVersion(
      responseId,
      publicContentEn,
      publicContentBn
    );
    setSelectedResponse(res.response);
    await loadResponses();
  };

  const getFilteredDatasetForExport = async () => {
    const res = await responseApi.getResponses(filters, 1, 10000);
    return res.responses;
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'সিএসভি প্রস্তুত হচ্ছে...' : 'Generating CSV...');
      const dataToExport = await getFilteredDatasetForExport();

      if (dataToExport.length === 0) {
        setExportMessage(isBn ? 'কোনো ডাটা নেই' : 'No data');
        setTimeout(() => setExportMessage(null), 2500);
        setIsExporting(false);
        return;
      }

      const success = exportResponsesToCsv(
        dataToExport,
        `sobaike_responses_${filters.status !== 'all' ? filters.status + '_' : ''}${new Date().toISOString().slice(0, 10)}.csv`
      );

      if (success) {
        setExportMessage(isBn ? 'সিএসভি ডাউনলোড সম্পন্ন!' : 'CSV Exported!');
      } else {
        setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export responses CSV:', err);
      setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'পিডিএফ প্রস্তুত হচ্ছে...' : 'Generating PDF...');
      const dataToExport = await getFilteredDatasetForExport();

      if (dataToExport.length === 0) {
        setExportMessage(isBn ? 'কোনো ডাটা নেই' : 'No data');
        setTimeout(() => setExportMessage(null), 2500);
        setIsExporting(false);
        return;
      }

      const success = exportResponsesToPdf(
        dataToExport,
        {
          status: filters.status,
          search: filters.search,
        },
        `sobaike_responses_${filters.status !== 'all' ? filters.status + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`
      );

      if (success) {
        setExportMessage(isBn ? 'পিডিএফ ডাউনলোড সম্পন্ন!' : 'PDF Exported!');
      } else {
        setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export responses PDF:', err);
      setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title={isBn ? 'প্রতিক্রিয়া ও মন্তব্য' : 'Responses'}
        description={
          isBn
            ? 'পাবলিক প্ল্যাটফর্মে প্রকাশের পূর্বে বিভাগীয় প্রতিক্রিয়া ও নাগরিক মন্তব্য পর্যালোচনা করুন।'
            : 'Review and manage responses before publishing.'
        }
        actions={
          <div className="flex items-center gap-2">
            <DownloadMenu
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              isExporting={isExporting}
              exportMessage={exportMessage}
              label={isBn ? 'এক্সপোর্ট' : 'Export'}
              variant="secondary"
              size="sm"
            />

            {/* Refresh */}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadResponses}
              className="text-xs"
            >
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* 2. Response Status Tabs */}
      <ResponseStatusTabs
        activeTab={filters.status}
        onChange={handleStatusTabChange}
        counts={statusCounts}
      />

      {/* 3. Search + Filters Control Area */}
      <Card variant="default">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <ResponseSearch value={filters.search} onChange={handleSearchChange} />

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFiltersMobile((prev) => !prev)}
                className="sm:hidden text-xs"
                leftIcon={<Filter className="w-3.5 h-3.5" />}
              >
                {isBn ? 'ফিল্টার' : 'Filters'}
              </Button>
            </div>
          </div>

          <div className={`pt-1 ${showFiltersMobile ? 'block' : 'hidden sm:block'}`}>
            <ResponseFilters
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Response Table / Grid */}
      {responses.length > 0 ? (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <ResponseTable
              responses={responses}
              onSelectResponse={handleSelectResponse}
              isLoading={isLoading}
            />
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden">
            <MobileResponseCardList
              responses={responses}
              onSelectResponse={handleSelectResponse}
              isLoading={isLoading}
            />
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
              <div>
                <span>
                  {isBn ? 'মোট' : 'Showing'}{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {responses.length}
                  </span>{' '}
                  {isBn ? 'টি প্রতিক্রিয়া (সর্বমোট' : 'of'}{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {totalResponses}
                  </span>
                  {isBn ? 'টি)' : ' responses'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  className="text-xs h-7"
                >
                  {isBn ? 'পূর্ববর্তী' : 'Previous'}
                </Button>

                <span className="font-medium text-slate-700 dark:text-slate-300 px-2">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || isLoading}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  className="text-xs h-7"
                >
                  {isBn ? 'পরবর্তী' : 'Next'}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ResponseEmptyState onResetFilters={handleResetFilters} />
      )}

      {/* 5. Response Detail Drawer */}
      <ResponseDetailDrawer
        response={selectedResponse}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
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
