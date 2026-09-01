/**
 * Analytics Fallback Service
 */

import {
  AnalyticsDataResponse,
  AnalyticsSummary,
  StatusSummary,
  CategorySummary,
  LocationSummary,
  TrendDataPoint,
  AnalyticsFilterState,
} from '@/types/Analytics';
import { mockAnalyticsService } from '@/services/mock/analyticsService';

export const analyticsFallback = {
  getCompleteAnalytics(
    filters: AnalyticsFilterState = { dateRange: '30days' }
  ): Promise<AnalyticsDataResponse> {
    return mockAnalyticsService.getCompleteAnalytics(filters);
  },

  getAnalyticsSummary(filters?: AnalyticsFilterState): Promise<AnalyticsSummary> {
    return mockAnalyticsService.getAnalyticsSummary(filters);
  },

  getStatusAnalytics(filters?: AnalyticsFilterState): Promise<StatusSummary[]> {
    return mockAnalyticsService.getStatusAnalytics(filters);
  },

  getCategoryAnalytics(filters?: AnalyticsFilterState): Promise<CategorySummary[]> {
    return mockAnalyticsService.getCategoryAnalytics(filters);
  },

  getLocationAnalytics(filters?: AnalyticsFilterState): Promise<LocationSummary[]> {
    return mockAnalyticsService.getLocationAnalytics(filters);
  },

  getTrendAnalytics(filters?: AnalyticsFilterState): Promise<TrendDataPoint[]> {
    return mockAnalyticsService.getTrendAnalytics(filters);
  },

  async exportReport(
    format: 'csv' | 'pdf' | 'excel',
    filters?: AnalyticsFilterState
  ): Promise<{ downloadUrl: string; filename: string }> {
    return {
      downloadUrl: '#',
      filename: `sobaike_analytics_${new Date().toISOString().slice(0, 10)}.${format}`,
    };
  },
};

export default analyticsFallback;
