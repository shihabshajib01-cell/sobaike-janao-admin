/**
 * Dashboard Domain Types
 * API-ready data structures for the Sobaike Admin Command Center
 */

import { BadgeStatus } from '@/components/ui/Badge';

export interface DashboardStats {
  totalComplaints: number;
  submitted: number;
  published: number;
  rejected: number;
  edited: number;
  trends: {
    totalComplaintsChange: number; // percentage change, e.g., +12.5%
    submittedChange: number;
    publishedChange: number;
    rejectedChange: number;
    editedChange: number;
  };
}

export type LifecycleStatusKey =
  | 'submitted'
  | 'published'
  | 'rejected'
  | 'edited';

export interface StatusSummaryItem {
  key: LifecycleStatusKey;
  labelEn: string;
  labelBn: string;
  count: number;
  percentage: number;
  badgeStatus: BadgeStatus;
  descriptionEn: string;
  descriptionBn: string;
}

export interface CategorySummaryItem {
  id: string;
  nameEn: string;
  nameBn: string;
  count: number;
  percentage: number;
  resolvedCount: number;
  pendingCount: number;
}

export interface RecentComplaintItem {
  id: string;
  titleEn: string;
  titleBn: string;
  categoryEn: string;
  categoryBn: string;
  locationEn: string;
  locationBn: string;
  ward: string;
  date: string;
  status: LifecycleStatusKey;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  upvotesCount?: number;
}

export type ActivityEventType =
  | 'new_submission'
  | 'moved_to_review'
  | 'report_published'
  | 'admin_update'
  | 'assigned_department'
  | 'status_resolved';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  timestamp: string;
  actor: string;
  role: string;
  complaintId?: string;
}

export interface HotspotWard {
  ward: string;
  zone: string;
  count: number;
  urgencyLevel: 'high' | 'medium' | 'low';
}

export interface GeoPing {
  id: string;
  title: string;
  category: string;
  ward: string;
  time: string;
  status: LifecycleStatusKey;
  coords: [number, number]; // [lat, lng]
}

export interface MapSummaryData {
  totalComplaintLocations: number;
  activeHotspotCount: number;
  primaryZone: string;
  hotspotWards: HotspotWard[];
  recentPings: GeoPing[];
}
