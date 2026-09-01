/**
 * Public Feed Fallback Service
 */

import {
  FeedPost,
  FeedFilterState,
  FeedListResponse,
  FeedStatusTabCount,
} from '@/types/Post';
import { mockFeedService } from '@/services/mock/feedService';
import {
  mockFeedWorkflowService,
  ModerationActionResult,
} from '@/services/mock/feedWorkflowService';

export const feedFallback = {
  getPosts(
    filters: Partial<FeedFilterState> = {},
    page = 1,
    limit = 10
  ): Promise<FeedListResponse> {
    return mockFeedService.getPosts(filters, page, limit);
  },

  getFeedPosts(
    filters: Partial<FeedFilterState> = {},
    page = 1,
    limit = 10
  ): Promise<FeedListResponse> {
    return mockFeedService.getPosts(filters, page, limit);
  },

  getPostById(id: string): Promise<FeedPost | null> {
    return mockFeedService.getPostById(id);
  },

  updatePost(id: string, updates: Partial<FeedPost>): Promise<FeedPost> {
    return mockFeedService.updatePost(id, updates);
  },

  getFeedPostById(id: string): Promise<FeedPost | null> {
    return mockFeedService.getPostById(id);
  },

  getStatusCounts(): Promise<FeedStatusTabCount[]> {
    return mockFeedService.getStatusCounts();
  },

  publishPost(
    postId: string,
    options: {
      isFeaturedBroadcast?: boolean;
    } = {}
  ): Promise<ModerationActionResult> {
    return mockFeedWorkflowService.publishPost(postId, options);
  },

  unpublishPost(postId: string, reason?: string): Promise<ModerationActionResult> {
    return mockFeedWorkflowService.unpublishPost(postId, reason || 'Unpublished by moderator');
  },

  rejectPost(postId: string, reason: string, explanation?: string): Promise<ModerationActionResult> {
    return mockFeedWorkflowService.rejectPost(postId, reason, explanation || '');
  },
};

export default feedFallback;
export { type ModerationActionResult };
export type FeedWorkflowResult = ModerationActionResult;
