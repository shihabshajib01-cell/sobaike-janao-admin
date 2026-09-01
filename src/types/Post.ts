/**
 * Post / Public Feed Domain Types
 * Simplified 2-state civic feed data structures
 */

import { ComplaintLocation, ComplaintMedia, ComplaintTimelineEvent } from './Complaint';

export type FeedPostStatus = 'unpublished' | 'published';

export type FeedStatusFilter = 'all' | FeedPostStatus;

export interface FeedPost {
  id: string;
  complaintId?: string; // Associated complaint reference ID
  titleEn: string;
  titleBn: string;
  contentEn: string;
  contentBn: string;
  categoryId?: string;
  categoryEn?: string;
  categoryBn?: string;
  subcategoryId?: string;
  subcategoryEn?: string;
  subcategoryBn?: string;
  location: ComplaintLocation;
  media: ComplaintMedia[];
  status: FeedPostStatus;
  upvotesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  authorDisplayEn?: string;
  authorDisplayBn?: string;
  publishedAt?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  timeline?: ComplaintTimelineEvent[];
}

export interface FeedFilterState {
  search: string;
  status: FeedStatusFilter;
  categoryId: string;
  subcategoryId: string;
  hasMedia: string; // 'all' | 'text_only' | 'single_image' | 'multiple_images'
  ward: string;
  dateRange: {
    from?: string;
    to?: string;
  };
}

export interface FeedStatusTabCount {
  status: FeedStatusFilter;
  count: number;
  labelEn: string;
  labelBn: string;
}

export interface FeedListResponse {
  posts: FeedPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Record<FeedStatusFilter, number>;
}


