/**
 * Complaint Domain Types
 * Precise data structures matching the Sobaike public civic platform
 */

import { BadgeStatus } from '@/components/ui/Badge';

export type ComplaintLifecycleStatus =
  | 'submitted'
  | 'published'
  | 'unpublished'
  | 'rejected'
  | 'edited';

export type ComplaintUrgency = 'low' | 'medium' | 'high' | 'urgent';

export interface ComplaintLocation {
  addressEn: string;
  addressBn: string;
  ward: string;
  zone: string;
  coordinates?: [number, number]; // [latitude, longitude]
}

export interface ComplaintMedia {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
}

export interface ComplaintVersion {
  versionNumber: number;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  categoryId: string;
  categoryEn: string;
  categoryBn: string;
  subcategoryId?: string;
  subcategoryEn?: string;
  subcategoryBn?: string;
  location: ComplaintLocation;
  media: ComplaintMedia[];
  urgency: ComplaintUrgency;
  editedAt: string; // ISO date string
  editedBy: {
    name: string;
    role: string;
  };
  editNotes?: string;
}

export interface Complaint {
  id: string;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  categoryId: string;
  categoryEn: string;
  categoryBn: string;
  subcategoryId: string;
  subcategoryEn: string;
  subcategoryBn: string;
  location: ComplaintLocation;
  media: ComplaintMedia[];
  status: ComplaintLifecycleStatus;
  urgency: ComplaintUrgency;
  citizenName?: string;
  citizenPhone?: string;
  isAnonymous?: boolean;
  assignedDepartment?: string;
  upvotesCount: number;
  commentsCount: number;
  hasSupportingInfo?: boolean;
  evidenceTypes?: string[];
  evidenceDescription?: string;
  versions?: ComplaintVersion[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface ComplaintStatusTabCount {
  status: ComplaintLifecycleStatus | 'all';
  labelEn: string;
  labelBn: string;
  count: number;
  badgeStatus: BadgeStatus;
}

export interface ComplaintFilterState {
  searchQuery: string;
  status: ComplaintLifecycleStatus | 'all';
  category: string;
  subcategory: string;
  location: string;
  dateRange: string;
}

export interface ComplaintPagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type TimelineEventType =
  | 'submitted'
  | 'status_change'
  | 'assigned'
  | 'info_requested'
  | 'official_update'
  | 'comment'
  | 'resolved';

export interface ComplaintTimelineEvent {
  id: string;
  complaintId: string;
  type: TimelineEventType;
  actorName: string;
  actorRole: string;
  actorAvatar?: string;
  timestamp: string; // ISO date string
  titleEn: string;
  titleBn: string;
  descriptionEn?: string;
  descriptionBn?: string;
  fromStatus?: ComplaintLifecycleStatus;
  toStatus?: ComplaintLifecycleStatus;
  metadata?: Record<string, unknown>;
}

export interface ComplaintListResponse {
  items: Complaint[];
  pagination: ComplaintPagination;
  statusCounts: ComplaintStatusTabCount[];
}
