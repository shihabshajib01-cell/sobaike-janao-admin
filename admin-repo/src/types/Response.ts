/**
 * Response Types and Interfaces
 * UI contract retained for future real Response API integration; values are not yet backend-authoritative.
 */

import { ComplaintMedia } from './Complaint';

export type ResponseStatus = 
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'unpublished';

export type ResponseStatusFilter = 'all' | ResponseStatus;

export type ResponseRelatedType = 'complaint' | 'post';

export type ResponseAuthorRole = 
  | 'citizen' 
  | 'official' 
  | 'moderator' 
  | 'department_head';

export interface ResponseAuthor {
  id: string;
  name: string;
  nameBn?: string;
  role: ResponseAuthorRole;
  roleTitleEn: string;
  roleTitleBn: string;
  departmentEn?: string;
  departmentBn?: string;
  organizationEn?: string;
  organizationBn?: string;
  designationEn?: string;
  designationBn?: string;
  avatar?: string;
  isVerified: boolean;
  isOfficial: boolean;
}

export interface ResponseItem {
  id: string;
  relatedType: ResponseRelatedType;
  relatedId: string; // e.g. CMP-10492 or PST-101
  relatedTitleEn: string;
  relatedTitleBn: string;
  categoryId: string;
  categoryEn: string;
  categoryBn: string;
  ward?: string;
  author: ResponseAuthor;
  contentEn: string;
  contentBn: string;
  publicContentEn?: string;
  publicContentBn?: string;
  media?: ComplaintMedia[];
  status: ResponseStatus;
  isOfficial: boolean;
  isPubliclyVisible: boolean;
  rejectionReason?: string;
  rejectionExplanation?: string;
  unpublishReason?: string;
  moderatorNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseFilterState {
  search: string;
  status: ResponseStatusFilter;
  relatedType: 'all' | ResponseRelatedType;
  authorRole: 'all' | 'official' | 'citizen';
  categoryId: string;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
}

export interface ResponseTimelineEvent {
  id: string;
  responseId: string;
  action: 
    | 'submitted' 
    | 'reviewed' 
    | 'approved' 
    | 'published' 
    | 'rejected' 
    | 'unpublished' 
    | 'updated';
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  actor: {
    name: string;
    role: string;
  };
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ResponseListResponse {
  responses: ResponseItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Record<ResponseStatusFilter, number>;
}

export interface ResponseWorkflowResult {
  success: boolean;
  message: string;
  response: ResponseItem;
}

