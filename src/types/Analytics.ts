/**
 * Analytics & Reporting Data Models
 * Aligned strictly with existing Complaint, Category, Response, Feed, and Map data.
 */

import { ComplaintLifecycleStatus } from './Complaint';

export type AnalyticsDateRange = 'today' | '7days' | '30days' | 'all';

export interface AnalyticsFilterState {
  dateRange: AnalyticsDateRange;
  categoryId?: string;
  status?: string;
}

export interface AnalyticsSummary {
  totalComplaints: number;
  published: number;
  resolved: number;
  responses: number;
  activeCategories: number;
  totalFeedPosts: number;
  mappedComplaints: number;
}

export interface StatusSummary {
  status: ComplaintLifecycleStatus;
  labelEn: string;
  labelBn: string;
  count: number;
  percentage: number;
}

export interface SubcategoryMetric {
  subcategoryId: string;
  nameEn: string;
  nameBn: string;
  count: number;
  percentage: number;
}

export interface CategorySummary {
  categoryId: string;
  featureId: string;
  nameEn: string;
  nameBn: string;
  count: number;
  percentage: number;
  resolvedCount: number;
  pendingCount: number;
  subcategories: SubcategoryMetric[];
}

export interface LocationSummary {
  location: string;
  area?: string;
  count: number;
  percentage: number;
  resolvedCount: number;
  mappedCount: number;
}

export interface TrendDataPoint {
  date: string;
  dateFormattedEn: string;
  dateFormattedBn: string;
  complaintsCount: number;
  resolvedCount: number;
  publishedCount: number;
  responsesCount: number;
}

export interface AnalyticsDataResponse {
  summary: AnalyticsSummary;
  statusDistribution: StatusSummary[];
  categoryDistribution: CategorySummary[];
  locationDistribution: LocationSummary[];
  trends: TrendDataPoint[];
}
