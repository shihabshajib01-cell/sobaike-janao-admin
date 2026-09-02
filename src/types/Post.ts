/**
 * Feed Post Domain Types
 */
import { ComplaintMedia, ComplaintLocation } from './Complaint';

export type FeedPostStatus =
  | 'published'
  | 'unpublished'
  | 'pending'
  | 'flagged'
  | 'hidden'
  | 'archived'
  | 'rejected'
  | 'approved';

export type FeedStatusFilter = 'all' | 'published' | 'unpublished' | 'pending' | 'flagged' | 'hidden' | 'archived' | string;

export interface FeedAuthor {
  id?: string;
  name: string;
  nameBn?: string;
  phone?: string;
  isAnonymous?: boolean;
  avatar?: string;
  ward?: string;
}

export interface FeedPostTimelineEvent {
  id?: string;
  date?: string;
  timestamp?: string;
  title?: string;
  titleEn?: string;
  titleBn?: string;
  description?: string;
  descriptionEn?: string;
  descriptionBn?: string;
  actor?: string;
  status?: string;
}

export interface FeedPost {
  id: string;
  complaintId?: string;
  title: string;
  titleEn?: string;
  titleBn?: string;
  content?: string;
  contentEn?: string;
  contentBn?: string;
  description?: string;
  descriptionEn?: string;
  descriptionBn?: string;
  status: FeedPostStatus;
  category?: string;
  categoryId?: string;
  categoryEn?: string;
  categoryBn?: string;
  categoryName?: string;
  categoryNameBn?: string;
  subcategory?: string;
  subcategoryId?: string;
  subcategoryEn?: string;
  subcategoryBn?: string;
  subcategoryName?: string;
  subcategoryNameBn?: string;
  location?: ComplaintLocation;
  ward?: string;
  zone?: string;
  address?: string;
  author?: FeedAuthor;
  authorDisplayEn?: string;
  authorDisplayBn?: string;
  citizenName?: string;
  citizenPhone?: string;
  isAnonymous?: boolean;
  media?: ComplaintMedia[];
  upvotesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  flagsCount?: number;
  isPinned?: boolean;
  timeline?: FeedPostTimelineEvent[];
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedFilterState {
  search?: string;
  status?: FeedStatusFilter;
  categoryId?: string;
  subcategoryId?: string;
  hasMedia?: string;
  ward?: string;
  dateRange?: string;
  sortBy?: 'newest' | 'oldest' | 'upvotes' | 'comments' | 'flags' | string;
}

export type FeedActionId =
  | 'view'
  | 'publish'
  | 'approve_publish'
  | 'reject'
  | 'hide'
  | 'hide_feed'
  | 'unhide'
  | 'flag'
  | 'pin'
  | 'unpin'
  | 'delete'
  | 'edit'
  | 'feature';
