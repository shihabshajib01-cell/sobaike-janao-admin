/**
 * Analytics Domain Types
 */
import { ComplaintLifecycleStatus } from './Complaint';

export type AnalyticsDateRange = 'today' | '7days' | '30days' | 'all' | string;

export interface AnalyticsFilterState {
  dateRange: AnalyticsDateRange;
  categoryId?: string;
  status?: string;
}

export interface TrendDataPoint {
  date: string;
  dateFormattedEn: string;
  dateFormattedBn: string;
  complaintsCount: number;
  publishedCount: number;
  resolvedCount: number;
}

export interface StatusSummary {
  status: ComplaintLifecycleStatus | string;
  labelEn: string;
  labelBn: string;
  count: number;
  percentage: number;
}

export interface CategorySummarySubcategory {
  subcategoryId: string;
  nameEn: string;
  nameBn: string;
  count: number;
  percentage: number;
}

export interface CategorySummary {
  categoryId: string;
  nameEn: string;
  nameBn: string;
  count: number;
  percentage: number;
  resolvedCount: number;
  pendingCount: number;
  subcategories: CategorySummarySubcategory[];
}

export interface LocationSummary {
  location: string;
  area?: string;
  count: number;
  percentage: number;
  resolvedCount: number;
  mappedCount: number;
}

export interface AnalyticsSummary {
  totalComplaints: number;
  published: number;
  resolved: number;
  responses: number;
  activeCategories: number;
}

export interface AnalyticsDataResponse {
  summary: AnalyticsSummary;
  trends: TrendDataPoint[];
  statusDistribution: StatusSummary[];
  categoryDistribution: CategorySummary[];
  locationDistribution: LocationSummary[];
}
