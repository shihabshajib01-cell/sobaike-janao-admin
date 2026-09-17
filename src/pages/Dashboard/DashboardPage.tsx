import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
  DashboardCardsGrid,
  StatusOverview,
  CategoryOverview,
  CategoryPopularitySummary,
  RecentComplaints,
} from '@/components/dashboard';
import {
  DashboardStats,
  StatusSummaryItem,
  CategorySummaryItem,
  RecentComplaintItem,
} from '@/types/Dashboard';
import { dashboardApi } from '@/services/api';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const { hasPermission } = useAuth();
  const canViewComplaints = hasPermission('complaints.view');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statusItems, setStatusItems] = useState<StatusSummaryItem[]>([]);
  const [categories, setCategories] = useState<CategorySummaryItem[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<RecentComplaintItem[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const aggregateFetches: [
        Promise<DashboardStats>,
        Promise<StatusSummaryItem[]>,
        Promise<CategorySummaryItem[]>
      ] = [
        dashboardApi.getDashboardStats(),
        dashboardApi.getStatusSummary(),
        dashboardApi.getCategorySummary(),
      ];

      if (canViewComplaints) {
        const [statsData, statusData, categoryData, recentData] =
          await Promise.all([
            ...aggregateFetches,
            dashboardApi.getRecentComplaints(6),
          ]);

        setStats(statsData);
        setStatusItems(statusData);
        setCategories(categoryData);
        setRecentComplaints(recentData);
      } else {
        const [statsData, statusData, categoryData] =
          await Promise.all(aggregateFetches);

        setStats(statsData);
        setStatusItems(statusData);
        setCategories(categoryData);
        setRecentComplaints([]);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError(
        isBn
          ? 'ড্যাশবোর্ডের তথ্য লোড করা যায়নি।'
          : 'Dashboard data could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, [isBn, canViewComplaints]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}
        description={
          isBn
            ? 'বর্তমান প্রতিবেদন ও মডারেশন কার্যক্রমের সারসংক্ষেপ।'
            : 'Overview of current report moderation activity.'
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadDashboardData}
            isLoading={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>
        }
      />

      {error ? (
        <Card variant="default" className="border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20">
          <CardContent className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? 'ড্যাশবোর্ডের তথ্য লোড করা যায়নি।' : 'Dashboard data could not be loaded.'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isBn
                  ? 'সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'
                  : 'Check your connection and try again.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={loadDashboardData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="mt-2"
            >
              <span>{isBn ? 'আবার চেষ্টা করুন' : 'Retry'}</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-label="Operational Key Metrics">
            <DashboardCardsGrid stats={stats} loading={loading} />
          </section>

          <section
            aria-label="Distribution Breakdown"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <StatusOverview statusItems={statusItems} loading={loading} />
            <CategoryOverview categories={categories} loading={loading} />
          </section>

          <section aria-label="Category Popularity">
            <CategoryPopularitySummary />
          </section>

          {canViewComplaints && (
            <section aria-label="Recent Citizen Reports">
              <RecentComplaints complaints={recentComplaints} loading={loading} />
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
