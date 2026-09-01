import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Calendar,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DownloadMenu } from '@/components/ui/DownloadMenu';
import { Card, CardContent } from '@/components/ui/Card';
import {
  AuditFilters,
  AuditTable,
  MobileAuditCardList,
  AuditDetailDrawer,
} from '@/components/audit';
import { AuditLog, AuditLogFilters, AuditStats } from '@/types/AuditLog';
import { auditLogApi } from '@/services/api';
import { useLanguage } from '@/context/LanguageContext';
import { exportAuditLogsToCsv, exportAuditLogsToPdf } from '@/utils';

export const AuditLogsPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<AuditLogFilters>({
    search: '',
    module: 'all',
    action: 'all',
    dateRange: 'all',
  });

  const loadData = useCallback(async (currentFilters: AuditLogFilters, isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [fetchedLogs, fetchedStats] = await Promise.all([
        auditLogApi.getAuditLogs(currentFilters),
        auditLogApi.getAuditStats(),
      ]);

      setLogs(fetchedLogs);
      setStats(fetchedStats);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(filters);
  }, [filters, loadData]);

  const handleFilterChange = (newFilters: AuditLogFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    const resetState: AuditLogFilters = {
      search: '',
      module: 'all',
      action: 'all',
      dateRange: 'all',
    };
    setFilters(resetState);
  };

  const handleSelectLog = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'সিএসভি হচ্ছে...' : 'Generating CSV...');
      const fullLogs = await auditLogApi.getAuditLogs(filters);
      if (fullLogs.length === 0) {
        setExportMessage(isBn ? 'কোনো ডাটা নেই' : 'No data to export');
        setTimeout(() => setExportMessage(null), 2500);
        return;
      }
      const success = exportAuditLogsToCsv(
        fullLogs,
        `sobaike_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
      );
      if (success) {
        setExportMessage(isBn ? 'সিএসভি সম্পন্ন!' : 'CSV Exported!');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'পিডিএফ হচ্ছে...' : 'Generating PDF...');
      const fullLogs = await auditLogApi.getAuditLogs(filters);
      if (fullLogs.length === 0) {
        setExportMessage(isBn ? 'কোনো ডাটা নেই' : 'No data to export');
        setTimeout(() => setExportMessage(null), 2500);
        return;
      }
      const success = exportAuditLogsToPdf(
        fullLogs,
        {
          module: filters.module,
          action: filters.action,
          search: filters.search,
        },
        `sobaike_audit_logs_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      if (success) {
        setExportMessage(isBn ? 'পিডিএফ সম্পন্ন!' : 'PDF Exported!');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim().length > 0) ||
      (filters.module && filters.module !== 'all') ||
      (filters.action && filters.action !== 'all') ||
      (filters.dateRange && filters.dateRange !== 'all')
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <PageHeader
        title={isBn ? 'প্রশাসনিক অডিট লগ' : 'Administrative Audit Logs'}
        description={
          isBn
            ? 'সকল প্রশাসনিক ক্রিয়া, ওয়ার্কফ্লো অনুমোদন এবং অপারেটর সিদ্ধান্তের ইতিহাস'
            : 'Operational audit trail capturing workflow reviews, moderation actions, and administrative decisions'
        }
        actions={
          <div className="flex items-center gap-2">
            <DownloadMenu
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              isExporting={isExporting}
              exportMessage={exportMessage}
              label={isBn ? 'এক্সপোর্ট' : 'Export Logs'}
              variant="secondary"
              size="sm"
              disabled={logs.length === 0}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => loadData(filters, true)}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              disabled={refreshing}
            >
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* 2. Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card variant="default" className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isBn ? 'সর্বমোট অডিট রেকর্ড' : 'Total Audit Logs'}
            </span>
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats ? stats.totalLogs : logs.length}
          </p>
        </Card>

        <Card variant="default" className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isBn ? 'আজকের কার্যক্রম' : "Today's Events"}
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats ? stats.todayLogs : 0}
          </p>
        </Card>

        <Card variant="default" className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isBn ? 'সক্রিয় মডিউল' : 'Active Modules'}
            </span>
            <div className="w-6 h-6 rounded-md bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats ? stats.activeModules : 5}
          </p>
        </Card>

        <Card variant="default" className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isBn ? 'প্রধান অ্যাকশন' : 'Most Common Action'}
            </span>
            <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 capitalize truncate">
            {stats ? stats.topAction.replace(/_/g, ' ') : 'Publish'}
          </p>
        </Card>
      </div>

      {/* 3. Filter Bar */}
      <AuditFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        totalResults={logs.length}
      />

      {/* 4. Main Activity Table & Card Views */}
      <div className="hidden md:block">
        <Card variant="default" className="overflow-hidden">
          <CardContent className="p-0 sm:p-0">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBn ? 'অডিট লগ লোড হচ্ছে...' : 'Loading audit trail logs...'}
                </p>
              </div>
            ) : (
              <AuditTable
                logs={logs}
                selectedLog={selectedLog}
                onSelectLog={handleSelectLog}
                hasFilters={hasActiveFilters}
                onResetFilters={handleResetFilters}
                isLoading={loading}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden">
        <MobileAuditCardList
          logs={logs}
          selectedLog={selectedLog}
          onSelectLog={handleSelectLog}
          isLoading={loading}
        />
      </div>

      {/* 5. Detail Drawer */}
      <AuditDetailDrawer
        log={selectedLog}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};

export default AuditLogsPage;
