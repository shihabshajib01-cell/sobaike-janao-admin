/**
 * Public Feed API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import {
  FeedPost,
  FeedFilterState,
  FeedListResponse,
  FeedStatusTabCount,
} from '@/types/Post';
import { feedFallback, ModerationActionResult } from '@/services/fallback/feedFallback';

export class FeedApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get filtered and paginated feed posts
   */
  async getPosts(
    filters: Partial<FeedFilterState> = {},
    page = 1,
    limit = 10
  ): Promise<FeedListResponse> {
    try {
      const response = await this.client.get<FeedListResponse>('/feed/posts', {
        params: {
          page,
          limit,
          status: filters.status,
          search: filters.search,
          categoryId: filters.categoryId,
          subcategoryId: filters.subcategoryId,
          hasMedia: filters.hasMedia,
          ward: filters.ward,
        },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return feedFallback.getPosts(filters, page, limit);
  }

  /**
   * Get single feed post by ID
   */
  async getPostById(id: string): Promise<FeedPost | null> {
    try {
      const response = await this.client.get<FeedPost>(`/feed/posts/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return feedFallback.getPostById(id);
  }

  /**
   * Update feed post content (preserves status)
   */
  async updatePost(id: string, updates: Partial<FeedPost>): Promise<FeedPost> {
    try {
      const response = await this.client.put<FeedPost>(`/feed/posts/${id}`, updates);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return feedFallback.updatePost(id, updates);
  }

  /**
   * Get status tab counts for feed moderation
   */
  async getStatusCounts(): Promise<FeedStatusTabCount[]> {
    try {
      const response = await this.client.get<FeedStatusTabCount[]>('/feed/stats');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return feedFallback.getStatusCounts();
  }

  /**
   * Publish post to public feed
   */
  async publishPost(
    postId: string,
    options: {
      isFeaturedBroadcast?: boolean;
    } = {}
  ): Promise<ModerationActionResult> {
    try {
      const response = await this.client.post<ModerationActionResult>(`/feed/posts/${postId}/publish`, options);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return feedFallback.publishPost(postId, options);
  }

  /**
   * Unpublish post
   */
  async unpublishPost(postId: string, reason?: string): Promise<ModerationActionResult> {
    try {
      const response = await this.client.post<ModerationActionResult>(`/feed/posts/${postId}/unpublish`, {
        reason,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return feedFallback.unpublishPost(postId, reason);
  }

  /**
   * Reject post
   */
  async rejectPost(postId: string, reason: string, explanation?: string): Promise<ModerationActionResult> {
    try {
      const response = await this.client.post<ModerationActionResult>(`/feed/posts/${postId}/reject`, {
        reason,
        explanation,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return feedFallback.rejectPost(postId, reason, explanation);
  }
}

export const feedApi = new FeedApi();
export default feedApi;
export { type ModerationActionResult };
