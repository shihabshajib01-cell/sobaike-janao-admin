import { FeedPostStatus } from '@/types/Post';

export type FeedActionId = 'edit' | 'approve_publish' | 'reject' | 'hide_feed';

export interface FeedActionConfig {
  id: FeedActionId;
  labelEn: string;
  labelBn: string;
  variant: 'primary' | 'secondary' | 'success' | 'danger';
  iconName: 'Edit' | 'Globe' | 'XCircle' | 'EyeOff';
}

export const FEED_ACTION_DEFINITIONS: Record<FeedActionId, FeedActionConfig> = {
  edit: {
    id: 'edit',
    labelEn: 'Edit',
    labelBn: 'সম্পাদনা',
    variant: 'secondary',
    iconName: 'Edit',
  },
  approve_publish: {
    id: 'approve_publish',
    labelEn: 'Approve & Publish',
    labelBn: 'অনুমোদন ও প্রকাশ করুন',
    variant: 'primary',
    iconName: 'Globe',
  },
  reject: {
    id: 'reject',
    labelEn: 'Reject',
    labelBn: 'বাতিল',
    variant: 'danger',
    iconName: 'XCircle',
  },
  hide_feed: {
    id: 'hide_feed',
    labelEn: 'Hide from Feed',
    labelBn: 'ফিড থেকে লুকান',
    variant: 'danger',
    iconName: 'EyeOff',
  },
};

/**
 * Returns available actions strictly based on current feed status.
 *
 * Single Source of Truth for Feed Action Matrix:
 * - unpublished: [edit, approve_publish, reject]
 * - published: [edit, hide_feed]
 */
export function getAvailableFeedActions(
  status: FeedPostStatus
): FeedActionConfig[] {
  switch (status) {
    case 'unpublished':
      return [
        FEED_ACTION_DEFINITIONS.edit,
        FEED_ACTION_DEFINITIONS.approve_publish,
        FEED_ACTION_DEFINITIONS.reject,
      ];
    case 'published':
      return [
        FEED_ACTION_DEFINITIONS.edit,
        FEED_ACTION_DEFINITIONS.hide_feed,
      ];
    default:
      return [];
  }
}

