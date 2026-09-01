/**
 * Dashboard API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import {
  DashboardStats,
  StatusSummaryItem,
  CategorySummaryItem,
  RecentComplaintItem,
  ActivityEvent,
  MapSummaryData,
} from '@/types/Dashboard';
import { dashboardFallback } from '@/services/fallback/dashboardFallback';

export class DashboardApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await this.client.get<DashboardStats>('/dashboard/stats');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return dashboardFallback.getDashboardStats();
  }

  async getStatusSummary(): Promise<StatusSummaryItem[]> {
    try {
      const response = await this.client.get<StatusSummaryItem[]>('/dashboard/status-summary');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return dashboardFallback.getStatusSummary();
  }

  async getCategorySummary(): Promise<CategorySummaryItem[]> {
    try {
      const response = await this.client.get<CategorySummaryItem[]>('/dashboard/category-summary');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return dashboardFallback.getCategorySummary();
  }

  async getRecentComplaints(limit = 5): Promise<RecentComplaintItem[]> {
    try {
      const response = await this.client.get<RecentComplaintItem[]>('/dashboard/recent-complaints', {
        params: { limit },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return dashboardFallback.getRecentComplaints(limit);
  }

  async getActivities(limit = 8): Promise<ActivityEvent[]> {
    try {
      const response = await this.client.get<ActivityEvent[]>('/dashboard/activities', {
        params: { limit },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return dashboardFallback.getActivities(limit);
  }

  async getActivityFeed(limit = 8): Promise<ActivityEvent[]> {
    return this.getActivities(limit);
  }

  async getMapSummary(): Promise<MapSummaryData> {
    try {
      const response = await this.client.get<MapSummaryData>('/dashboard/map-summary');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return dashboardFallback.getMapSummary();
  }
}

export const dashboardApi = new DashboardApi();
export default dashboardApi;

