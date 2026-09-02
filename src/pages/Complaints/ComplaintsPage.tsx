import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DownloadMenu } from '@/components/ui/DownloadMenu';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
  ComplaintStatusTabs,
  ComplaintSearch,
  ComplaintFilters,
  ComplaintTable,
  MobileComplaintCardList,
} from '@/components/complaints';
import {
  Complaint,
  ComplaintFilterState,
  ComplaintLifecycleStatus,
  ComplaintPagination,
  ComplaintStatusTabCount,
} from '@/types/Complaint';
import { complaintApi } from '@/services/api';
import { exportComplaintsToCsv, exportComplaintsToPdf } from '@/utils';
import { RefreshCw, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

export const ComplaintsPage: React.FC = () => {
  const { language } = useLanguage();
  const { hasPermission, isBootstrapMode } = useAuth();
  const isBn = language === 'bn';

  const canExport = isBootstrapMode || hasPermission('complaints.export');

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statusCounts, setStatusCounts] = useState<ComplaintStatusTabCount[]>([]);
  const [pagination, setPagination] = useState<ComplaintPagination>({
    currentPage: 1,
    pageSize: 6,
    totalItems: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<ComplaintFilterState>({
    searchQuery: '',
    status: 'all',
    category: 'all',
    subcategory: 'all',
    location: 'all',
    dateRange: 'all',
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Check if any filter is actively applied beyond defaults
  const hasActiveFilters = Boolean(
    filters.searchQuery.trim() !== '' ||
      filters.category !== 'all' ||
      filters.subcategory !== 'all' ||
      filters.location !== 'all' ||
      filters.dateRange !== 'all'
  );

  // Fetch complaints
  const fetchComplaints = useCallback(
    async (pageToLoad = pagination.currentPage) => {
      setLoading(true);
      try {
        const response = await complaintApi.getComplaints(
          filters,
          pageToLoad,
          pagination.pageSize
        );
        setComplaints(response.items);
        setPagination(response.pagination);
        setStatusCounts(response.statusCounts);
      } catch (error) {
        console.error('Failed to load complaints:', error);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.pageSize]
  );

  useEffect(() => {
    fetchComplaints(1);
  }, [filters]);

  // Handle Tab Selection
  const handleSelectStatus = (status: ComplaintLifecycleStatus | 'all') => {
    setFilters((prev) => ({ ...prev, status }));
  };

  // Handle Search
  const handleSearchChange = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  const handleSearchClear = () => {
    setFilters((prev) => ({ ...prev, searchQuery: '' }));
  };

  // Handle Specific Filter Change
  const handleFilterChange = (key: keyof ComplaintFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset all filters except current active tab
  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      status: filters.status, // preserve status tab
      category: 'all',
      subcategory: 'all',
      location: 'all',
      dateRange: 'all',
    });
  };

  // Page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchComplaints(newPage);
  };

  // Fetch current filtered dataset for export
  const getFilteredDatasetForExport = async () => {
    const res = await complaintApi.getComplaints(filters, 1, 10000);
    return res.items;
  };

  // Export CSV Action
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'সিএসভি প্রস্তুত হচ্ছে...' : 'Generating CSV...');
      
      const dataToExport = await getFilteredDatasetForExport();
      
      if (dataToExport.length === 0) {
        setExportMessage(isBn ? 'কোনো ডাটা নেই' : 'No data to export');
        setTimeout(() => setExportMessage(null), 2500);
        setIsExporting(false);
        return;
      }

      const success = exportComplaintsToCsv(
        dataToExport,
        `sobaike_complaints_${filters.status !== 'all' ? filters.status + '_' : ''}${new Date().toISOString().slice(0, 10)}.csv`
      );

      if (success) {
        setExportMessage(isBn ? 'সিএসভি ডাউনলোড সম্পন্ন!' : 'CSV Exported!');
      } else {
        setExportMessage(isBn ? 'ডাউনলোড ব্যর্থ' : 'Export failed');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export complaints CSV:', err);
      setExportMessage(isBn ? 'ডাউনলোড ব্যর্থ' : 'Export failed');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF Action
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'পিডিএফ প্রস্তুত হচ্ছে...' : 'Generating PDF...');
      
      const dataToExport = await getFilteredDatasetForExport();
      
      if (dataToExport.length === 0) {
        setExportMessage(isBn ? 'কোনো ডাটা নেই' : 'No data to export');
        setTimeout(() => setExportMessage(null), 2500);
        setIsExporting(false);
        return;
      }

      const success = exportComplaintsToPdf(
        dataToExport,
        {
          status: filters.status,
          category: filters.category,
          ward: filters.location,
          dateRange: filters.dateRange,
          search: filters.searchQuery,
        },
        `sobaike_complaints_${filters.status !== 'all' ? filters.status + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`
      );

      if (success) {
        setExportMessage(isBn ? 'পিডিএফ ডাউনলোড সম্পন্ন!' : 'PDF Exported!');
      } else {
        setExportMessage(isBn ? 'ডাউনলোড ব্যর্থ' : 'Export failed');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export complaints PDF:', err);
      setExportMessage(isBn ? 'ডাউনলোড ব্যর্থ' : 'Export failed');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
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
        title={isBn ? 'অভিযোগ ব্যবস্থাপনা' : 'Complaint Management'}
        description={
          isBn
            ? 'নাগরিকদের জমা দেওয়া অভিযোগের তালিকা অনুসন্ধান, ফিল্টারিং ও ট্রায়াজ ব্যবস্থা'
            : 'Explore, filter, search, and review all citizen-submitted civic complaints across wards'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchComplaints(pagination.currentPage)}
              disabled={loading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </Button>
            {canExport && (
              <DownloadMenu
                onExportCsv={handleExportCsv}
                onExportPdf={handleExportPdf}
                isExporting={isExporting}
                exportMessage={exportMessage}
                label={isBn ? 'এক্সপোর্ট' : 'Export'}
                variant="primary"
                size="sm"
              />
            )}
          </div>
        }
      />

      {/* 2. Status Tabs Bar */}
      <ComplaintStatusTabs
        tabs={statusCounts}
        activeStatus={filters.status}
        onSelectStatus={handleSelectStatus}
        loading={loading && statusCounts.length === 0}
      />

      {/* 3. Search & Filter Toolbar */}
      <Card variant="default">
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="w-full sm:max-w-md">
              <ComplaintSearch
                value={filters.searchQuery}
                onChange={handleSearchChange}
                onClear={handleSearchClear}
                isLoading={loading}
              />
            </div>

            {/* Toggle Advanced Filters Button */}
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

          {/* Collapsible Filter Panel */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in-50 duration-200">
              <ComplaintFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
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
              ? `মোট ${formatNumber(pagination.totalItems)} টি অভিযোগ পাওয়া গেছে`
              : `Showing ${complaints.length} of ${pagination.totalItems} total complaints`}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              {isBn
                ? `পৃষ্ঠা ${formatNumber(pagination.currentPage)} / ${formatNumber(pagination.totalPages)}`
                : `Page ${pagination.currentPage} of ${pagination.totalPages}`}
            </span>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <ComplaintTable
            complaints={complaints}
            loading={loading}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
            onRetry={() => fetchComplaints(pagination.currentPage)}
          />
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden">
          <MobileComplaintCardList
            complaints={complaints}
            loading={loading}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
            onRetry={() => fetchComplaints(pagination.currentPage)}
          />
        </div>

        {/* 5. Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 px-1 w-full max-w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1 || loading}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              <span>{isBn ? 'পূর্ববর্তী' : 'Previous'}</span>
            </Button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                const isCurrent = p === pagination.currentPage;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    disabled={loading}
                    className={`w-8 h-8 rounded-md text-xs font-mono font-medium transition-colors ${
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
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              <span>{isBn ? 'পরবর্তী' : 'Next'}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintsPage;
