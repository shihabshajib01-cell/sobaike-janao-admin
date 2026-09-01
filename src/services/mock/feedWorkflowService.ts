/**
 * Feed Moderation Workflow Mock Service
 * Handles simple 2-state content moderation actions:
 * Unpublished -> Approve & Publish / Reject
 * Published -> Hide from Feed (Unpublish)
 */

import { FeedPost } from '@/types/Post';
import { MOCK_FEED_POSTS } from './feedService';
import { mockTimelineService } from './timelineService';
import { CURRENT_ADMIN_USER } from './permissionService';

export interface ModerationActionResult {
  success: boolean;
  post: FeedPost;
  messageEn: string;
  messageBn: string;
}

export class FeedWorkflowService {
  /**
   * Helper to locate post in mock store
   */
  private findPost(postId: string): FeedPost {
    const post = MOCK_FEED_POSTS.find(
      (p) =>
        p.id.toLowerCase() === postId.toLowerCase() ||
        (p.complaintId && p.complaintId.toLowerCase() === postId.toLowerCase())
    );
    if (!post) {
      throw new Error(`Feed post with ID "${postId}" was not found.`);
    }
    return post;
  }

  /**
   * 1. Approve & Publish Post to Public Feed
   * Sets status to 'published' and updates timestamp
   */
  async publishPost(
    postId: string,
    _options: { isFeaturedBroadcast?: boolean } = {},
    actor = { name: CURRENT_ADMIN_USER.name, role: 'Moderator' }
  ): Promise<ModerationActionResult> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const post = this.findPost(postId);

    post.status = 'published';
    post.publishedAt = new Date().toISOString();
    post.updatedAt = new Date().toISOString();

    if (post.complaintId) {
      await mockTimelineService.addTimelineEvent({
        complaintId: post.complaintId,
        type: 'status_change',
        actorName: actor.name,
        actorRole: actor.role,
        titleEn: 'Post Broadcasted to Public Feed',
        titleBn: 'পাবলিক ফিডে পোস্ট উন্মুক্ত করা হয়েছে',
        descriptionEn: 'The civic issue is now live on the public feed.',
        descriptionBn: 'অভিযোগটি সবার প্ল্যাটফর্মের পাবলিক ফিডে দৃশ্যমান।',
        fromStatus: 'submitted',
        toStatus: 'published',
      });
    }

    return {
      success: true,
      post: { ...post },
      messageEn: `Post ${post.id} is now live on the public feed.`,
      messageBn: `পোস্ট ${post.id} সবার পাবলিক ফিডে প্রকাশিত হয়েছে।`,
    };
  }

  /**
   * 2. Reject Post
   * Rejects submission (remains unpublished)
   */
  async rejectPost(
    postId: string,
    reason = 'Policy Violation',
    explanation = '',
    actor = { name: CURRENT_ADMIN_USER.name, role: 'Moderator' }
  ): Promise<ModerationActionResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const post = this.findPost(postId);

    post.status = 'unpublished';
    post.updatedAt = new Date().toISOString();

    if (post.complaintId) {
      await mockTimelineService.addTimelineEvent({
        complaintId: post.complaintId,
        type: 'status_change',
        actorName: actor.name,
        actorRole: actor.role,
        titleEn: `Public Post Rejected (${reason})`,
        titleBn: `পাবলিক পোস্ট বাতিল (${reason})`,
        descriptionEn: explanation.trim() || 'Content rejected from public feed publication.',
        descriptionBn: explanation.trim() || 'পাবলিক ফিডে প্রকাশ বাতিল করা হয়েছে।',
        fromStatus: 'submitted',
        toStatus: 'rejected',
      });
    }

    return {
      success: true,
      post: { ...post },
      messageEn: `Post ${post.id} was rejected from public feed.`,
      messageBn: `পোস্ট ${post.id} বাতিল করা হয়েছে।`,
    };
  }

  /**
   * 3. Unpublish / Hide from Feed
   * Sets status to 'unpublished'
   */
  async unpublishPost(
    postId: string,
    reason = 'Hidden by moderator',
    actor = { name: CURRENT_ADMIN_USER.name, role: 'Moderator' }
  ): Promise<ModerationActionResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const post = this.findPost(postId);

    post.status = 'unpublished';
    post.updatedAt = new Date().toISOString();

    if (post.complaintId) {
      await mockTimelineService.addTimelineEvent({
        complaintId: post.complaintId,
        type: 'status_change',
        actorName: actor.name,
        actorRole: actor.role,
        titleEn: 'Post Hidden from Citizen Feed',
        titleBn: 'পাবলিক ফিড থেকে পোস্ট লুকানো হয়েছে',
        descriptionEn: `Reason: "${reason.trim()}"`,
        descriptionBn: `কারণ: "${reason.trim()}"`,
        fromStatus: 'published',
        toStatus: 'submitted',
      });
    }

    return {
      success: true,
      post: { ...post },
      messageEn: `Post ${post.id} was taken down from the public feed.`,
      messageBn: `পোস্ট ${post.id} সাময়িকভাবে পাবলিক ফিড থেকে সরিয়ে নেওয়া হয়েছে।`,
    };
  }
}

export const mockFeedWorkflowService = new FeedWorkflowService();
export default mockFeedWorkflowService;

