/**
 * Analytics API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import {
  AnalyticsDataResponse,
  AnalyticsSummary,
  StatusSummary,
  CategorySummary,
  LocationSummary,
  TrendDataPoint,
  AnalyticsFilterState,
} from '@/types/Analytics';
import { analyticsFallback } from '@/services/fallback/analyticsFallback';

export class AnalyticsApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Fetch complete consolidated analytics payload
   */
  async getCompleteAnalytics(
    filters: AnalyticsFilterState = { dateRange: '30days' }
  ): Promise<AnalyticsDataResponse> {
    try {
      const response = await this.client.get<AnalyticsDataResponse>('/analytics/complete', {
        params: filters as unknown as Record<string, string | number | boolean | undefined>,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return analyticsFallback.getCompleteAnalytics(filters);
  }

  /**
   * Fetch high-level analytics summary metrics
   */
  async getAnalyticsSummary(filters?: AnalyticsFilterState): Promise<AnalyticsSummary> {
    try {
      const response = await this.client.get<AnalyticsSummary>('/analytics/summary', {
        params: filters as unknown as Record<string, string | number | boolean | undefined>,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return analyticsFallback.getAnalyticsSummary(filters);
  }

  /**
   * Fetch lifecycle status distribution
   */
  async getStatusAnalytics(filters?: AnalyticsFilterState): Promise<StatusSummary[]> {
    try {
      const response = await this.client.get<StatusSummary[]>('/analytics/status-distribution', {
        params: filters as unknown as Record<string, string | number | boolean | undefined>,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return analyticsFallback.getStatusAnalytics(filters);
  }

  /**
   * Fetch category & subcategory breakdown
   */
  async getCategoryAnalytics(filters?: AnalyticsFilterState): Promise<CategorySummary[]> {
    try {
      const response = await this.client.get<CategorySummary[]>('/analytics/category-breakdown', {
        params: filters as unknown as Record<string, string | number | boolean | undefined>,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return analyticsFallback.getCategoryAnalytics(filters);
  }

  /**
   * Fetch location/ward breakdown
   */
  async getLocationAnalytics(filters?: AnalyticsFilterState): Promise<LocationSummary[]> {
    try {
      const response = await this.client.get<LocationSummary[]>('/analytics/location-breakdown', {
        params: filters as unknown as Record<string, string | number | boolean | undefined>,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return analyticsFallback.getLocationAnalytics(filters);
  }

  /**
   * Fetch complaint volume over time trends
   */
  async getTrendAnalytics(filters?: AnalyticsFilterState): Promise<TrendDataPoint[]> {
    try {
      const response = await this.client.get<TrendDataPoint[]>('/analytics/volume-trends', {
        params: filters as unknown as Record<string, string | number | boolean | undefined>,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return analyticsFallback.getTrendAnalytics(filters);
  }

  /**
   * Trigger server-side report generation/download
   */
  async exportReport(
    format: 'csv' | 'pdf' | 'excel',
    filters?: AnalyticsFilterState
  ): Promise<{ downloadUrl: string; filename: string }> {
    try {
      const response = await this.client.post<{ downloadUrl: string; filename: string }>(
        '/analytics/export',
        { format, filters }
      );
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return analyticsFallback.exportReport(format, filters);
  }
}

export const analyticsApi = new AnalyticsApi();
export default analyticsApi;

