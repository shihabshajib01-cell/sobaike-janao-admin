import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DownloadMenu } from '@/components/ui/DownloadMenu';
import { useLanguage } from '@/context/LanguageContext';
import {
  DashboardCardsGrid,
  StatusOverview,
  CategoryOverview,
  RecentComplaints,
  ActivityTimeline,
  MapSummary,
} from '@/components/dashboard';
import { dashboardApi } from '@/services/api';
import {
  DashboardStats,
  StatusSummaryItem,
  CategorySummaryItem,
  RecentComplaintItem,
  ActivityEvent,
  MapSummaryData,
} from '@/types/Dashboard';
import { Calendar, RefreshCw } from 'lucide-react';
import { exportDashboardToCsv, exportDashboardToPdf } from '@/utils';
import { Select } from '@/components/ui/Select';

export const DashboardPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // State management for dashboard modules
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statusItems, setStatusItems] = useState<StatusSummaryItem[]>([]);
  const [categories, setCategories] = useState<CategorySummaryItem[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<RecentComplaintItem[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [mapData, setMapData] = useState<MapSummaryData | null>(null);

  const [dateRange, setDateRange] = useState<string>('30days');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Load all dashboard operational data
  const loadDashboardData = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [
        statsRes,
        statusRes,
        categoryRes,
        complaintsRes,
        activitiesRes,
        mapRes,
      ] = await Promise.all([
        dashboardApi.getDashboardStats(),
        dashboardApi.getStatusSummary(),
        dashboardApi.getCategorySummary(),
        dashboardApi.getRecentComplaints(6),
        dashboardApi.getActivities(5),
        dashboardApi.getMapSummary(),
      ]);

      setStats(statsRes);
      setStatusItems(statusRes);
      setCategories(categoryRes);
      setRecentComplaints(complaintsRes);
      setActivities(activitiesRes);
      setMapData(mapRes);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleExportCsv = () => {
    if (!stats) return;
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'সিএসভি হচ্ছে...' : 'Generating CSV...');
      const success = exportDashboardToCsv(
        stats,
        statusItems,
        recentComplaints,
        `sobaike_dashboard_summary_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      if (success) {
        setExportMessage(isBn ? 'সিএসভি সম্পন্ন!' : 'CSV Exported!');
      } else {
        setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export dashboard CSV:', err);
      setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!stats) return;
    try {
      setIsExporting(true);
      setExportMessage(isBn ? 'পিডিএফ হচ্ছে...' : 'Generating PDF...');
      const success = exportDashboardToPdf(
        stats,
        statusItems,
        recentComplaints,
        dateRange,
        `sobaike_dashboard_overview_${dateRange}_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      if (success) {
        setExportMessage(isBn ? 'পিডিএফ সম্পন্ন!' : 'PDF Exported!');
      } else {
        setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      }
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export dashboard PDF:', err);
      setExportMessage(isBn ? 'ব্যর্থ' : 'Failed');
      setTimeout(() => setExportMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const dateRangeOptions = [
    { value: 'today', label: isBn ? 'আজ' : 'Today' },
    { value: '7days', label: isBn ? 'গত ৭ দিন' : 'Last 7 Days' },
    { value: '30days', label: isBn ? 'গত ৩০ দিন' : 'Last 30 Days' },
    { value: '90days', label: isBn ? 'গত ৩ মাস' : 'Last 90 Days' },
  ];

  return (
    <div className="space-y-6">
      {/* 4.2 Page Header */}
      <PageHeader
        title={isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}
        description={
          isBn
            ? 'নাগরিক অভিযোগ, পাবলিক কার্যক্রম এবং প্ল্যাটফর্মের সার্বিক অপারেশন মনিটর করুন।'
            : 'Monitor complaints, public activity, and platform operations.'
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Date Filter Dropdown */}
            <div className="w-36">
              <Select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  loadDashboardData(true);
                }}
                options={dateRangeOptions}
                className="text-xs py-1.5"
              />
            </div>

            {/* Export Action Dropdown */}
            <DownloadMenu
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              isExporting={isExporting}
              exportMessage={exportMessage}
              label={isBn ? 'এক্সপোর্ট' : 'Export'}
              variant="secondary"
              size="sm"
              disabled={!stats}
            />

            {/* Refresh Action */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              className="text-xs"
            >
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </Button>
          </div>
        }
      />

      {/* 4.3 Overview Statistic Cards (5-Column Responsive Grid) */}
      <section aria-label={isBn ? 'পরিসংখ্যান কার্ড' : 'Overview Statistics'}>
        <DashboardCardsGrid stats={stats} loading={loading} />
      </section>

      {/* 4.4 & 4.5 Status Overview & Category Overview (Two-column layout on Desktop) */}
      <section
        aria-label={isBn ? 'স্ট্যাটাস ও ক্যাটাগরি বিশ্লেষণ' : 'Status and Category Analytics'}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <StatusOverview statusItems={statusItems} loading={loading} />
        <CategoryOverview categories={categories} loading={loading} />
      </section>

      {/* 4.6 Recent Complaints Table (Primary review section) */}
      <section aria-label={isBn ? 'সাম্প্রতিক অভিযোগ' : 'Recent Complaints'}>
        <RecentComplaints complaints={recentComplaints} loading={loading} />
      </section>

      {/* 4.7 & 4.8 Activity Timeline & Map Summary Card (Two-column layout on Desktop) */}
      <section
        aria-label={isBn ? 'অ্যাক্টিভিটি ও ভৌগোলিক নজরদারি' : 'Activity and Spatial Overview'}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <ActivityTimeline activities={activities} loading={loading} />
        <MapSummary mapData={mapData} loading={loading} />
      </section>
    </div>
  );
};

export default DashboardPage;
