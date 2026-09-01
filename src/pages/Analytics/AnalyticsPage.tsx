import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DownloadMenu } from '@/components/ui/DownloadMenu';
import { Modal } from '@/components/ui/Modal';
import { useLanguage } from '@/context/LanguageContext';
import {
  AnalyticsCard,
  AnalyticsFilters,
  TrendChart,
  StatusChart,
  CategoryChart,
  LocationInsight,
  AnalyticsEmptyState,
} from '@/components/analytics';
import { analyticsApi, complaintApi } from '@/services/api';
import {
  exportAnalyticsToCsv,
  exportAnalyticsToPdf,
  exportComplaintsToCsv,
  exportComplaintsToPdf,
} from '@/utils';
import {
  AnalyticsDataResponse,
  AnalyticsFilterState,
} from '@/types/Analytics';
import {
  FileText,
  Radio,
  CheckCircle2,
  MessageSquare,
  FolderTree,
  Download,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileText as FilePdf,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [filters, setFilters] = useState<AnalyticsFilterState>({
    dateRange: '30days',
    categoryId: undefined,
    status: undefined,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsDataResponse | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.getCompleteAnalytics(filters);
      setData(response);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleResetFilters = () => {
    setFilters({
      dateRange: '30days',
      categoryId: undefined,
      status: undefined,
    });
  };

  const handleExportSummaryCsv = () => {
    if (!data) return;
    try {
      setIsExporting(true);
      const success = exportAnalyticsToCsv(
        data,
        `sobaike_analytics_summary_${filters.dateRange}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      if (success) {
        setExportNotice(isBn ? 'সামারি সিএসভি ডাউনলোড সম্পন্ন!' : 'Summary CSV Downloaded!');
      } else {
        setExportNotice(isBn ? 'ডাউনলোড ব্যর্থ' : 'Download Failed');
      }
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Failed to export summary CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummaryPdf = () => {
    if (!data) return;
    try {
      setIsExporting(true);
      const success = exportAnalyticsToPdf(
        data,
        {
          dateRange: filters.dateRange,
          categoryId: filters.categoryId,
          status: filters.status,
        },
        `sobaike_analytics_report_${filters.dateRange}_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      if (success) {
        setExportNotice(isBn ? 'সামারি পিডিএফ ডাউনলোড সম্পন্ন!' : 'Summary PDF Downloaded!');
      } else {
        setExportNotice(isBn ? 'ডাউনলোড ব্যর্থ' : 'Download Failed');
      }
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Failed to export summary PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRawDatasetCsv = async () => {
    try {
      setIsExporting(true);
      setExportNotice(isBn ? 'সিএসভি ডাটা প্রস্তুত হচ্ছে...' : 'Preparing CSV dataset...');
      const res = await complaintApi.getComplaints(
        {
          category: filters.categoryId || 'all',
          status: (filters.status as any) || 'all',
          dateRange: filters.dateRange,
        },
        1,
        1000
      );
      const success = exportComplaintsToCsv(
        res.items,
        `sobaike_analytics_raw_${filters.dateRange}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      if (success) {
        setExportNotice(isBn ? 'র সিএসভি ডাউনলোড সম্পন্ন!' : 'Raw CSV Dataset Downloaded!');
      } else {
        setExportNotice(isBn ? 'ডাউনলোড ব্যর্থ' : 'Download Failed');
      }
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Failed to export raw dataset CSV:', err);
      setExportNotice(isBn ? 'ডাউনলোড ব্যর্থ' : 'Download Failed');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRawDatasetPdf = async () => {
    try {
      setIsExporting(true);
      setExportNotice(isBn ? 'পিডিএফ ডাটা প্রস্তুত হচ্ছে...' : 'Preparing PDF document...');
      const res = await complaintApi.getComplaints(
        {
          category: filters.categoryId || 'all',
          status: (filters.status as any) || 'all',
          dateRange: filters.dateRange,
        },
        1,
        1000
      );
      const success = exportComplaintsToPdf(
        res.items,
        {
          category: filters.categoryId,
          status: filters.status,
          dateRange: filters.dateRange,
        },
        `sobaike_analytics_complaints_${filters.dateRange}_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      if (success) {
        setExportNotice(isBn ? 'র পিডিএফ ডাউনলোড সম্পন্ন!' : 'Raw PDF Document Downloaded!');
      } else {
        setExportNotice(isBn ? 'ডাউনলোড ব্যর্থ' : 'Download Failed');
      }
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Failed to export raw dataset PDF:', err);
      setExportNotice(isBn ? 'ডাউনলোড ব্যর্থ' : 'Download Failed');
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const summary = data?.summary;
  const hasData = summary && (summary.totalComplaints > 0 || summary.responses > 0);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title={isBn ? 'অ্যানালিটিক্স ও রিপোর্ট' : 'Analytics & Reporting'}
        description={
          isBn
            ? 'প্ল্যাটফর্মের সামগ্রিক কার্যক্রম, নাগরিক অভিযোগ ও সমাধানের প্রবণতা পর্যবেক্ষণ'
            : 'Monitor platform activity, complaint trends, and civic resolution metrics'
        }
        actions={
          <div className="flex items-center gap-2">
            <DownloadMenu
              onExportCsv={handleExportSummaryCsv}
              onExportPdf={handleExportSummaryPdf}
              isExporting={isExporting}
              label={isBn ? 'এক্সপোর্ট রিপোর্ট' : 'Export Report'}
              variant="secondary"
              size="sm"
              disabled={!hasData}
            />
          </div>
        }
      />

      {/* 2. Top Summary Metrics Row (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Complaints */}
        <AnalyticsCard
          title={isBn ? 'মোট অভিযোগ' : 'TOTAL COMPLAINTS'}
          value={summary?.totalComplaints ?? 0}
          icon={FileText}
          description={isBn ? 'দাখিলকৃত মোট রিপোর্ট' : 'Submitted reports in period'}
          subtext={isBn ? 'সকল নাগরিক আবেদন' : 'All citizen reports'}
          loading={loading}
          iconBgClass="bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
          colorClass="text-slate-900 dark:text-slate-100"
        />

        {/* Published Reports */}
        <AnalyticsCard
          title={isBn ? 'পাবলিক প্রকাশিত' : 'PUBLISHED REPORTS'}
          value={summary?.published ?? 0}
          icon={Radio}
          description={isBn ? 'ফিডে দৃশ্যমান রেকর্ড' : 'Live on citizen timeline'}
          subtext={isBn ? 'নাগরিক ফিডে প্রদর্শিত' : 'Broadcast to public'}
          loading={loading}
          iconBgClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
          colorClass="text-indigo-600 dark:text-indigo-400"
        />

        {/* Resolved Complaints */}
        <AnalyticsCard
          title={isBn ? 'সমাধানকৃত' : 'RESOLVED CASES'}
          value={summary?.resolved ?? 0}
          icon={CheckCircle2}
          description={isBn ? 'সম্পূর্ণ সমাধানকৃত' : 'Remediated & verified'}
          subtext={isBn ? 'ডকুমেন্টেশন সম্পন্ন' : 'Documented & closed'}
          loading={loading}
          iconBgClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          colorClass="text-emerald-600 dark:text-emerald-400"
        />

        {/* Total Responses */}
        <AnalyticsCard
          title={isBn ? 'অফিসিয়াল অগ্রগতি' : 'TOTAL RESPONSES'}
          value={summary?.responses ?? 0}
          icon={MessageSquare}
          description={isBn ? 'কর্মকর্তাদের বার্তা' : 'Official statements issued'}
          subtext={isBn ? 'নাগরিক টাইমলাইন আপডেট' : 'Verified desk replies'}
          loading={loading}
          iconBgClass="bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
          colorClass="text-purple-600 dark:text-purple-400"
        />

        {/* Active Categories */}
        <AnalyticsCard
          title={isBn ? 'সক্রিয় ক্যাটাগরি' : 'ACTIVE CATEGORIES'}
          value={summary?.activeCategories ?? 0}
          icon={FolderTree}
          description={isBn ? 'পৌর সেবা বিভাগ' : 'Monitored taxonomy nodes'}
          subtext={isBn ? 'নাগরিক সমস্যা সেক্টর' : 'Civic domain sectors'}
          loading={loading}
          iconBgClass="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          colorClass="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* 3. Filter Controls Toolbar */}
      <AnalyticsFilters
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
        onRefresh={fetchAnalytics}
        onExportClick={() => setIsExportModalOpen(true)}
        loading={loading}
      />

      {/* 4. Analytics Visual Sections */}
      {!loading && !hasData ? (
        <AnalyticsEmptyState onResetFilters={handleResetFilters} />
      ) : (
        <div className="space-y-6">
          {/* Trend Chart (Full Width Section) */}
          <section aria-label={isBn ? 'সময়ভিত্তিক প্রবণতা গ্রাফ' : 'Timeline Trend Chart'}>
            <TrendChart data={data?.trends || []} loading={loading} />
          </section>

          {/* Status Distribution & Category Analysis (2-Column Grid) */}
          <section
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            aria-label={isBn ? 'স্ট্যাটাস ও ক্যাটাগরি বিশ্লেষণ' : 'Status and Category Breakdown'}
          >
            {/* Status Lifecycle Chart */}
            <StatusChart statusItems={data?.statusDistribution || []} loading={loading} />

            {/* Category & Subcategory Taxonomy Chart */}
            <CategoryChart categories={data?.categoryDistribution || []} loading={loading} />
          </section>

          {/* Location Insights (Full Width Section) */}
          <section aria-label={isBn ? 'ভৌগোলিক এলাকা বিশ্লেষণ' : 'Location Geographic Insights'}>
            <LocationInsight locations={data?.locationDistribution || []} loading={loading} />
          </section>
        </div>
      )}

      {/* 5. Export Report Modal Placeholder */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={isBn ? 'অ্যানালিটিক্স রিপোর্ট এক্সপোর্ট' : 'Export Analytics Report'}
        description={
          isBn
            ? 'প্ল্যাটফর্মের নির্বাচিত ডেটা রেঞ্জ অনুযায়ী রিপোর্ট ডাউনলোড করুন'
            : 'Download analytics and operational data for the selected period'
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsExportModalOpen(false)}>
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {exportNotice && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs font-medium text-sky-700 dark:text-sky-300 animate-in fade-in-50">
              ✓ {exportNotice}
            </div>
          )}

          <div className="space-y-3">
            {/* Executive PDF Summary Report */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center gap-3">
                <FilePdf className="w-5 h-5 text-rose-500" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {isBn ? 'এক্সিকিউটিভ সামারি রিপোর্ট (PDF)' : 'Executive Summary Report (PDF)'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isBn ? 'ফরম্যাটেড ভিজ্যুয়াল চার্ট ও মূল কেপিআই মেট্রিক্সের রিপোর্ট' : 'Formatted executive PDF report with KPI charts and metrics'}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={handleExportSummaryPdf}
                disabled={isExporting || !hasData}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                {isBn ? 'ডাউনলোড' : 'Download PDF'}
              </Button>
            </div>

            {/* Operational Summary CSV */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-sky-500" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {isBn ? 'অপারেশনাল সামারি ডেটাসেট (CSV)' : 'Operational Summary Dataset (CSV)'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isBn ? 'স্প্রেডশিটের জন্য সামারি এবং ডাইমেনশন মেট্রিক্স' : 'Summary KPI rows and breakdowns for spreadsheets'}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExportSummaryCsv}
                disabled={isExporting || !hasData}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                {isBn ? 'ডাউনলোড' : 'Download CSV'}
              </Button>
            </div>

            {/* Filtered Complaints Granular PDF */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center gap-3">
                <FilePdf className="w-5 h-5 text-indigo-500" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {isBn ? 'ফিল্টার করা অভিযোগ তালিকা (PDF)' : 'Filtered Complaints Document (PDF)'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isBn ? 'নাগরিক অভিযোগ ও স্ট্যাটাসের ফরম্যাটেড টেবিল' : 'Formatted tabular document with citizen records'}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExportRawDatasetPdf}
                disabled={isExporting}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                {isBn ? 'ডাউনলোড' : 'Download PDF'}
              </Button>
            </div>

            {/* Filtered Complaints Raw CSV */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {isBn ? 'র কমপ্লেইন্ট ডেটাসেট (CSV)' : 'Raw Complaint Dataset (CSV)'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isBn ? 'সকল ফিল্টার করা অভিযোগ ও লোকেশন ডাটা' : 'Granular rows with status and location metadata'}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExportRawDatasetCsv}
                disabled={isExporting}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                {isBn ? 'এক্সপোর্ট' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AnalyticsPage;
