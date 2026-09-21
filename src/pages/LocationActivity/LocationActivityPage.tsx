import { ButtonBase } from '@/components/ui/Button';
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ResponsiveDataView, ResponsiveDataTableView, ResponsiveDataCardView } from '@/components/ui/ResponsiveDataView';
import { TablePageSizeSelect } from '@/components/ui/TablePageSizeSelect';
import {
  LocationActivityStatsCards,
  LocationActivityFilters as FiltersComponent,
  LocationActivityTable,
  MobileLocationActivityCardList,
  LocationActivityDetailDrawer,
} from '@/components/locationActivity';
import {
  PublicVisitSession,
  LocationActivityFilters,
  LocationActivityStats,
} from '@/types/LocationActivity';
import { locationActivityService } from '@/services/api';
import { useLanguage } from '@/context/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';

export const LocationActivityPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Data states
  const [sessions, setSessions] = useState<PublicVisitSession[]>([]);
  const [stats, setStats] = useState<LocationActivityStats | null>(null);
  const [browserOptions, setBrowserOptions] = useState<string[]>([]);

  // UI & Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Drawer state
  const [selectedSession, setSelectedSession] = useState<PublicVisitSession | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Filter state
  const [filters, setFilters] = useState<LocationActivityFilters>({
    search: '',
    permission: 'all',
    device: 'all',
    browser: 'all',
    timeRange: 'all',
  });

  const debouncedSearch = useDebounce(filters.search || '', 350);
  const effectiveFilters: LocationActivityFilters = {
    ...filters,
    search: debouncedSearch,
  };

  // Load distinct browsers on mount
  useEffect(() => {
    locationActivityService.getDistinctBrowsers().then((browsers) => {
      if (browsers.length > 0) {
        setBrowserOptions(browsers);
      }
    }).catch(() => {
      // Ignore non-fatal browser option fetch
    });
  }, []);

  // Main data loader
  const loadData = useCallback(
    async (currentFilters: LocationActivityFilters, currentPage: number, isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [sessionRes, statsRes] = await Promise.all([
          locationActivityService.getLocationActivity(currentFilters, currentPage, pageSize),
          locationActivityService.getLocationActivityStats(),
        ]);

        setSessions(sessionRes.sessions);
        setTotalItems(sessionRes.total);
        setTotalPages(sessionRes.totalPages);
        setStats(statsRes);
      } catch (err: any) {
        console.error('Failed to load location activity:', err);
        setError(err?.message || (isBn ? 'ডাটা লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load location activity.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isBn, pageSize]
  );

  // Trigger data load when filters or page change
  useEffect(() => {
    loadData(effectiveFilters, page);
  }, [
    debouncedSearch,
    filters.permission,
    filters.device,
    filters.browser,
    filters.timeRange,
    page,
    loadData,
  ]);

  // Handle filter changes (resets page to 1)
  const handleFilterChange = (newFilters: LocationActivityFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    const resetState: LocationActivityFilters = {
      search: '',
      permission: 'all',
      device: 'all',
      browser: 'all',
      timeRange: 'all',
    };
    setFilters(resetState);
    setPage(1);
  };

  // Drawer handlers
  const handleSelectSession = (session: PublicVisitSession) => {
    setSelectedSession(session);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  // Page change handler
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPage(1);
    setPageSize(newPageSize);
  };

  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim().length > 0) ||
      (filters.permission && filters.permission !== 'all') ||
      (filters.device && filters.device !== 'all') ||
      (filters.browser && filters.browser !== 'all') ||
      (filters.timeRange && filters.timeRange !== 'all')
  );

  const formatNumber = (n: number) => {
    return isBn ? n.toLocaleString('bn-BD') : n.toLocaleString('en-US');
  };

  const getVisiblePages = (): Array<number | 'ellipsis-start' | 'ellipsis-end'> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items: Array<number | 'ellipsis-start' | 'ellipsis-end'> = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) items.push('ellipsis-start');
    for (let value = start; value <= end; value += 1) items.push(value);
    if (end < totalPages - 1) items.push('ellipsis-end');
    items.push(totalPages);

    return items;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <PageHeader
        title={isBn ? 'লোকেশন অ্যাক্টিভিটি' : 'Location Activity'}
        description={
          isBn
            ? 'ভিজিটরের লোকেশন অনুমতির অবস্থা ও ব্রাউজার/ডিভাইস তথ্য পর্যালোচনা করুন। গোপনীয়তার জন্য ব্রাউজিং GPS স্থানাঙ্ক সংরক্ষণ করা হয় না।'
            : 'Review visitor location-permission status and browser/device context. Precise browse GPS coordinates are not retained for privacy.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => loadData(filters, page, true)}
              leftIcon={<RefreshCw className={`${refreshing ? 'animate-spin' : ''}`} />}
              disabled={refreshing || loading}
            >
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* 2. Summary KPI Metric Cards */}
      <LocationActivityStatsCards stats={stats} isLoading={loading && !sessions.length} />

      {/* 3. Search and Filters Card */}
      <FiltersComponent
        filters={filters}
        browserOptions={browserOptions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* 4. Error banner if fetch failed */}
      {error && (
        <Card variant="default" className="border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
          <CardContent className="p-4 flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadData(filters, page, true)}
              className="shrink-0"
            >
              <span>{isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry'}</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 5. Main Content Area */}
      <div className="space-y-3">
        {/* Results count & Pagination stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {isBn
              ? `মোট ${formatNumber(totalItems)} টি সেশন রেকর্ড পাওয়া গেছে`
              : `Showing ${sessions.length} of ${formatNumber(totalItems)} total sessions`}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <TablePageSizeSelect
              id="location-activity-page-size"
              value={pageSize}
              onChange={handlePageSizeChange}
              disabled={loading || refreshing}
            />
            {totalPages > 1 && (
              <span>
                {isBn
                  ? `পৃষ্ঠা ${formatNumber(page)} / ${formatNumber(totalPages)}`
                  : `Page ${page} of ${totalPages}`}
              </span>
            )}
          </div>
        </div>

        <ResponsiveDataView>
          <ResponsiveDataTableView>
            {loading && !refreshing ? (
              <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBn ? 'সেশন ডাটা লোড হচ্ছে...' : 'Loading location sessions...'}
                </p>
              </div>
            ) : (
              <LocationActivityTable
                sessions={sessions}
                selectedSession={selectedSession}
                onSelectSession={handleSelectSession}
                hasFilters={hasActiveFilters}
                onResetFilters={handleResetFilters}
                isLoading={loading}
              />
            )}
          </ResponsiveDataTableView>

          <ResponsiveDataCardView>
            {loading && !refreshing ? (
              <div className="p-8 text-center space-y-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBn ? 'সেশন ডাটা লোড হচ্ছে...' : 'Loading location sessions...'}
                </p>
              </div>
            ) : (
              <MobileLocationActivityCardList
                sessions={sessions}
                selectedSession={selectedSession}
                onSelectSession={handleSelectSession}
                hasFilters={hasActiveFilters}
                onResetFilters={handleResetFilters}
                isLoading={loading}
              />
            )}
          </ResponsiveDataCardView>
        </ResponsiveDataView>

        {/* 6. Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 px-1 w-full max-w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              leftIcon={<ChevronLeft />}
            >
              <span>{isBn ? 'পূর্ববর্তী' : 'Previous'}</span>
            </Button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
              {getVisiblePages().map((item) => {
                if (typeof item !== 'number') {
                  return (
                    <span
                      key={item}
                      className="w-8 h-8 inline-flex items-center justify-center text-xs text-slate-400"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  );
                }

                const isCurrent = item === page;
                return (
                  <ButtonBase
                    key={item}
                    onClick={() => handlePageChange(item)}
                    disabled={loading}
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-label={isBn ? `পৃষ্ঠা ${formatNumber(item)}` : `Go to page ${item}`}
                    className={`w-8 h-8 rounded-md text-xs font-mono font-medium transition-colors ${
                      isCurrent
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {formatNumber(item)}
                  </ButtonBase>
                );
              })}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              rightIcon={<ChevronRight />}
            >
              <span>{isBn ? 'পরবর্তী' : 'Next'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* 7. Session Detail Drawer */}
      <LocationActivityDetailDrawer
        session={selectedSession}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};

export default LocationActivityPage;
