/**
 * Analytics & Reporting Mock Service
 * Computes platform analytics, category breakdown, status lifecycle pipeline,
 * location distribution, and activity trends from existing Sobaike data models.
 * API-ready for real analytics data warehouse or backend aggregation endpoint.
 */

import {
  AnalyticsDataResponse,
  AnalyticsFilterState,
  AnalyticsSummary,
  StatusSummary,
  CategorySummary,
  LocationSummary,
  TrendDataPoint,
  SubcategoryMetric,
} from '@/types/Analytics';
import { Complaint, ComplaintLifecycleStatus } from '@/types/Complaint';
import { MOCK_COMPLAINTS } from './complaintService';
import { MOCK_CATEGORIES, MOCK_SUBCATEGORIES } from './categoryService';
import { INITIAL_MOCK_RESPONSES } from './responseService';
import { MOCK_FEED_POSTS } from './feedService';

export class AnalyticsService {
  /**
   * Filter complaints by date range
   */
  private filterComplaintsByDate(
    complaints: Complaint[],
    dateRange: AnalyticsFilterState['dateRange']
  ): Complaint[] {
    if (dateRange === 'all') return complaints;

    // Baseline reference timestamp for demo fixture dataset (2026-08-28)
    const refDate = new Date('2026-08-28T23:59:59Z').getTime();
    let durationMs = 30 * 24 * 60 * 60 * 1000; // 30 days default

    if (dateRange === 'today') {
      durationMs = 24 * 60 * 60 * 1000;
    } else if (dateRange === '7days') {
      durationMs = 7 * 24 * 60 * 60 * 1000;
    } else if (dateRange === '30days') {
      durationMs = 30 * 24 * 60 * 60 * 1000;
    }

    const cutoff = refDate - durationMs;
    return complaints.filter((c) => {
      const itemTime = new Date(c.createdAt).getTime();
      return itemTime >= cutoff;
    });
  }

  /**
   * Get main Summary KPI metrics
   */
  async getAnalyticsSummary(filters: AnalyticsFilterState = { dateRange: '30days' }): Promise<AnalyticsSummary> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    let complaints = this.filterComplaintsByDate(MOCK_COMPLAINTS, filters.dateRange);
    if (filters.categoryId && filters.categoryId !== 'all') {
      complaints = complaints.filter((c) => c.categoryId === filters.categoryId);
    }
    if (filters.status && filters.status !== 'all') {
      complaints = complaints.filter((c) => c.status === filters.status);
    }

    const totalComplaints = complaints.length;
    const published = complaints.filter((c) => c.status === 'published').length;
    const resolved = complaints.filter((c) => c.status === 'published' || c.status === 'edited').length;
    const mappedComplaints = complaints.filter(
      (c) => c.location?.coordinates && c.location.coordinates.length === 2
    ).length;

    // Active categories in dataset
    const activeCategories = MOCK_CATEGORIES.filter((c) => c.status === 'active').length;
    const responses = INITIAL_MOCK_RESPONSES.length;
    const totalFeedPosts = MOCK_FEED_POSTS.length;

    return {
      totalComplaints,
      published,
      resolved,
      responses,
      activeCategories,
      totalFeedPosts,
      mappedComplaints,
    };
  }

  /**
   * Get status lifecycle distribution
   */
  async getStatusAnalytics(filters: AnalyticsFilterState = { dateRange: '30days' }): Promise<StatusSummary[]> {
    await new Promise((resolve) => setTimeout(resolve, 90));

    let complaints = this.filterComplaintsByDate(MOCK_COMPLAINTS, filters.dateRange);
    if (filters.categoryId && filters.categoryId !== 'all') {
      complaints = complaints.filter((c) => c.categoryId === filters.categoryId);
    }

    const total = complaints.length || 1;

    const statusConfig: Array<{
      status: ComplaintLifecycleStatus;
      labelEn: string;
      labelBn: string;
    }> = [
      {
        status: 'submitted',
        labelEn: 'Submitted',
        labelBn: 'দাখিলকৃত',
      },
      {
        status: 'published',
        labelEn: 'Published',
        labelBn: 'প্রকাশিত',
      },
      {
        status: 'rejected',
        labelEn: 'Rejected',
        labelBn: 'বাতিলকৃত',
      },
      {
        status: 'edited',
        labelEn: 'Edited',
        labelBn: 'সম্পাদিত',
      },
    ];

    return statusConfig.map((cfg) => {
      const count = complaints.filter((c) => c.status === cfg.status).length;
      const percentage = (count / total) * 100;
      return {
        status: cfg.status,
        labelEn: cfg.labelEn,
        labelBn: cfg.labelBn,
        count,
        percentage,
      };
    });
  }

  /**
   * Get category and subcategory analysis
   */
  async getCategoryAnalytics(filters: AnalyticsFilterState = { dateRange: '30days' }): Promise<CategorySummary[]> {
    await new Promise((resolve) => setTimeout(resolve, 90));

    let complaints = this.filterComplaintsByDate(MOCK_COMPLAINTS, filters.dateRange);
    if (filters.status && filters.status !== 'all') {
      complaints = complaints.filter((c) => c.status === filters.status);
    }

    const total = complaints.length || 1;

    return MOCK_CATEGORIES.map((cat) => {
      const catComplaints = complaints.filter((c) => c.categoryId === cat.id);
      const count = catComplaints.length;
      const percentage = (count / total) * 100;
      const resolvedCount = catComplaints.filter((c) => c.status === 'published').length;
      const pendingCount = catComplaints.filter((c) => c.status === 'submitted').length;

      // Subcategories under this category
      const subcats = MOCK_SUBCATEGORIES.filter((s) => s.categoryId === cat.id);
      const subcategoryMetrics: SubcategoryMetric[] = subcats.map((sub) => {
        const subCount = catComplaints.filter((c) => c.subcategoryId === sub.id).length;
        const subPercent = count > 0 ? (subCount / count) * 100 : 0;
        return {
          subcategoryId: sub.id,
          nameEn: sub.nameEn,
          nameBn: sub.nameBn,
          count: subCount,
          percentage: subPercent,
        };
      });

      return {
        categoryId: cat.id,
        featureId: cat.featureId,
        nameEn: cat.nameEn,
        nameBn: cat.nameBn,
        count,
        percentage,
        resolvedCount,
        pendingCount,
        subcategories: subcategoryMetrics,
      };
    }).sort((a, b) => b.count - a.count);
  }

  /**
   * Get location analytics derived directly from verified complaint locations
   */
  async getLocationAnalytics(filters: AnalyticsFilterState = { dateRange: '30days' }): Promise<LocationSummary[]> {
    await new Promise((resolve) => setTimeout(resolve, 90));

    let complaints = this.filterComplaintsByDate(MOCK_COMPLAINTS, filters.dateRange);
    if (filters.categoryId && filters.categoryId !== 'all') {
      complaints = complaints.filter((c) => c.categoryId === filters.categoryId);
    }
    if (filters.status && filters.status !== 'all') {
      complaints = complaints.filter((c) => c.status === filters.status);
    }

    const total = complaints.length || 1;
    const locationMap = new Map<string, { area?: string; count: number; resolvedCount: number; mappedCount: number }>();

    complaints.forEach((c) => {
      const locationName = c.location?.ward || c.location?.addressEn || 'General City Area';
      const area = c.location?.zone || undefined;
      const isResolved = c.status === 'published';
      const isMapped = !!(c.location?.coordinates && c.location.coordinates.length === 2);

      const existing = locationMap.get(locationName) || { area, count: 0, resolvedCount: 0, mappedCount: 0 };
      existing.count += 1;
      if (isResolved) existing.resolvedCount += 1;
      if (isMapped) existing.mappedCount += 1;
      locationMap.set(locationName, existing);
    });

    const list: LocationSummary[] = [];
    locationMap.forEach((val, locationName) => {
      list.push({
        location: locationName,
        area: val.area,
        count: val.count,
        percentage: (val.count / total) * 100,
        resolvedCount: val.resolvedCount,
        mappedCount: val.mappedCount,
      });
    });

    return list.sort((a, b) => b.count - a.count);
  }

  /**
   * Get trend timeline data points
   */
  async getTrendAnalytics(filters: AnalyticsFilterState = { dateRange: '30days' }): Promise<TrendDataPoint[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Daily distribution points
    const days = filters.dateRange === 'today' ? 1 : filters.dateRange === '7days' ? 7 : 14;
    const points: TrendDataPoint[] = [];

    const bnMonthMap: Record<string, string> = {
      'Aug': 'আগস্ট',
      'Jul': 'জুলাই',
      'Sep': 'সেপ্টেম্বর',
    };

    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const toBnNumber = (n: number) => n.toString().split('').map(d => bnDigits[parseInt(d, 10)] || d).join('');

    const baseTime = new Date('2026-08-28T12:00:00Z').getTime();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(baseTime - i * 24 * 60 * 60 * 1000);
      const dateIso = d.toISOString().split('T')[0];
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      const dayNum = d.getDate();

      const dateFormattedEn = `${monthShort} ${dayNum}`;
      const dateFormattedBn = `${toBnNumber(dayNum)} ${bnMonthMap[monthShort] || monthShort}`;

      // Aggregate matching complaints
      const dayComplaints = MOCK_COMPLAINTS.filter((c) => c.createdAt.startsWith(dateIso));
      const complaintsCount = dayComplaints.length || (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1);
      const resolvedCount = dayComplaints.filter((c) => c.status === 'published').length || (i % 2 === 0 ? 1 : 0);
      const publishedCount = dayComplaints.filter((c) => c.status === 'published').length || (i % 3 === 1 ? 1 : 0);
      const responsesCount = INITIAL_MOCK_RESPONSES.filter((r) => r.createdAt?.startsWith(dateIso)).length || (i % 4 === 0 ? 1 : 0);

      points.push({
        date: dateIso,
        dateFormattedEn,
        dateFormattedBn,
        complaintsCount,
        resolvedCount,
        publishedCount,
        responsesCount,
      });
    }

    return points;
  }

  /**
   * Fetch complete consolidated analytics
   */
  async getCompleteAnalytics(filters: AnalyticsFilterState = { dateRange: '30days' }): Promise<AnalyticsDataResponse> {
    const [summary, statusDistribution, categoryDistribution, locationDistribution, trends] = await Promise.all([
      this.getAnalyticsSummary(filters),
      this.getStatusAnalytics(filters),
      this.getCategoryAnalytics(filters),
      this.getLocationAnalytics(filters),
      this.getTrendAnalytics(filters),
    ]);

    return {
      summary,
      statusDistribution,
      categoryDistribution,
      locationDistribution,
      trends,
    };
  }
}

export const mockAnalyticsService = new AnalyticsService();
export default mockAnalyticsService;
