/**
 * Map Monitoring & Location Intelligence Types
 * Reuses existing Complaint and Category data structures for location monitoring
 */

import {
  ComplaintLocation,
  ComplaintLifecycleStatus,
} from './Complaint';

export interface MapComplaint {
  id: string;
  titleEn: string;
  titleBn: string;
  descriptionEn?: string;
  descriptionBn?: string;
  categoryId: string;
  categoryEn: string;
  categoryBn: string;
  subcategoryId: string;
  subcategoryEn: string;
  subcategoryBn: string;
  status: ComplaintLifecycleStatus;
  location: ComplaintLocation;
  latitude: number;
  longitude: number;
  createdAt: string; // ISO date string
}

export interface MapFilterState {
  searchQuery: string;
  category: string;
  subcategory: string;
  status: ComplaintLifecycleStatus | 'all';
  ward: string;
  zone: string;
  dateRange: string;
}

export interface MapCategoryReportCount {
  id: string;
  nameEn: string;
  nameBn: string;
  count: number;
}

export interface MapWardCount {
  ward: string;
  zone: string;
  count: number;
}

export interface MapSummary {
  totalLocations: number;
  totalComplaints: number;
  activeComplaints: number;
  resolvedComplaints: number;
  mostReportedCategory: MapCategoryReportCount | null;
  wardBreakdown: MapWardCount[];
}

export interface MapLocationOption {
  ward: string;
  zone: string;
  label: string;
}
