/**
 * Dashboard Fallback Service
 */

import {
  DashboardStats,
  StatusSummaryItem,
  CategorySummaryItem,
  RecentComplaintItem,
  ActivityEvent,
  MapSummaryData,
} from '@/types/Dashboard';
import { mockDashboardService } from '@/services/mock/dashboardService';

export const dashboardFallback = {
  getDashboardStats(): Promise<DashboardStats> {
    return mockDashboardService.getDashboardStats();
  },

  getStatusSummary(): Promise<StatusSummaryItem[]> {
    return mockDashboardService.getStatusSummary();
  },

  getCategorySummary(): Promise<CategorySummaryItem[]> {
    return mockDashboardService.getCategorySummary();
  },

  getRecentComplaints(limit = 5): Promise<RecentComplaintItem[]> {
    return mockDashboardService.getRecentComplaints(limit);
  },

  getActivities(limit = 8): Promise<ActivityEvent[]> {
    return mockDashboardService.getActivities(limit);
  },

  getActivityFeed(limit = 8): Promise<ActivityEvent[]> {
    return mockDashboardService.getActivities(limit);
  },

  getMapSummary(): Promise<MapSummaryData> {
    return mockDashboardService.getMapSummary();
  },
};

export default dashboardFallback;
export type DashboardStatusSummary = StatusSummaryItem;
export type DashboardCategorySummary = CategorySummaryItem;
export type DashboardRecentComplaint = RecentComplaintItem;
export type DashboardActivity = ActivityEvent;
export type DashboardMapSummary = MapSummaryData;


