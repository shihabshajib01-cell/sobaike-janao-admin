/**
 * Feed Moderation Actions Helper
 */
import { FeedPostStatus, FeedActionId } from '@/types/Post';
import { ButtonVariant } from '@/components/ui/Button';

export type { FeedActionId };

export interface FeedActionConfig {
  id: FeedActionId;
  labelEn: string;
  labelBn: string;
  variant: ButtonVariant;
  iconName: 'Edit' | 'Globe' | 'XCircle' | 'EyeOff' | string;
  descriptionEn?: string;
  descriptionBn?: string;
}

export function getAvailableFeedActions(status: FeedPostStatus | string): FeedActionConfig[] {
  const actions: FeedActionConfig[] = [
    {
      id: 'edit',
      labelEn: 'Edit Details',
      labelBn: 'সম্পাদনা করুন',
      variant: 'secondary',
      iconName: 'Edit',
      descriptionEn: 'Edit title, description or category',
      descriptionBn: 'শিরোনাম, বিবরণ বা বিভাগ সম্পাদনা করুন',
    },
  ];

  if (status === 'published') {
    actions.push(
      {
        id: 'hide_feed',
        labelEn: 'Unpublish / Hide',
        labelBn: 'অপ্রকাশিত / লুকান',
        variant: 'secondary',
        iconName: 'EyeOff',
        descriptionEn: 'Remove from citizen public feed',
        descriptionBn: 'পাবলিক ফিড থেকে সরিয়ে ফেলুন',
      },
      {
        id: 'reject',
        labelEn: 'Reject Report',
        labelBn: 'বাতিল করুন',
        variant: 'danger',
        iconName: 'XCircle',
        descriptionEn: 'Reject this citizen post',
        descriptionBn: 'এই নাগরিক পোস্টটি বাতিল করুন',
      }
    );
  } else if (status === 'rejected') {
    actions.push({
      id: 'approve_publish',
      labelEn: 'Approve & Publish',
      labelBn: 'অনুমোদন ও প্রকাশ',
      variant: 'primary',
      iconName: 'Globe',
      descriptionEn: 'Approve and publish to public feed',
      descriptionBn: 'অনুমোদন দিয়ে ফিডে প্রকাশ করুন',
    });
  } else {
    // pending / unpublished / hidden / flagged / draft
    actions.push(
      {
        id: 'approve_publish',
        labelEn: 'Approve & Publish',
        labelBn: 'অনুমোদন ও প্রকাশ',
        variant: 'primary',
        iconName: 'Globe',
        descriptionEn: 'Publish to public citizen feed',
        descriptionBn: 'পাবলিক ফিডে প্রকাশ করুন',
      },
      {
        id: 'reject',
        labelEn: 'Reject Post',
        labelBn: 'বাতিল করুন',
        variant: 'danger',
        iconName: 'XCircle',
        descriptionEn: 'Decline and mark as rejected',
        descriptionBn: 'পোস্টটি প্রত্যাখ্যান করুন',
      }
    );
  }

  return actions;
}
