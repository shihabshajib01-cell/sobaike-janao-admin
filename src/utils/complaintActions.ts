import { ComplaintLifecycleStatus } from '@/types/Complaint';

export type ComplaintActionId =
  | 'edit'
  | 'publish'
  | 'reject';

export interface ComplaintActionConfig {
  id: ComplaintActionId;
  labelEn: string;
  labelBn: string;
  variant: 'primary' | 'secondary' | 'success' | 'danger';
  iconName: 'Edit' | 'Share2' | 'XCircle';
}

export const COMPLAINT_ACTION_DEFINITIONS: Record<ComplaintActionId, ComplaintActionConfig> = {
  edit: {
    id: 'edit',
    labelEn: 'Edit Complaint',
    labelBn: 'অভিযোগ সম্পাদনা',
    variant: 'primary',
    iconName: 'Edit',
  },
  publish: {
    id: 'publish',
    labelEn: 'Publish to Feed',
    labelBn: 'পাবলিক ফিডে প্রকাশ',
    variant: 'success',
    iconName: 'Share2',
  },
  reject: {
    id: 'reject',
    labelEn: 'Reject Complaint',
    labelBn: 'বাতিল করুন',
    variant: 'danger',
    iconName: 'XCircle',
  },
};

/**
 * Returns available actions strictly based on current complaint status.
 *
 * Status Matrix:
 * - submitted: [publish, reject]
 * - edited: []
 * - published: []
 * - rejected: []
 */
export function getAvailableComplaintActions(
  status: ComplaintLifecycleStatus
): ComplaintActionConfig[] {
  switch (status) {
    case 'submitted':
      return [
        COMPLAINT_ACTION_DEFINITIONS.publish,
        COMPLAINT_ACTION_DEFINITIONS.reject,
      ];

    case 'edited':
      return [];

    case 'published':
      return [];

    case 'rejected':
      return [];

    default:
      return [];
  }
}

/**
 * Status Transition Guidance Text
 */
export function getComplaintStatusGuidance(
  status: ComplaintLifecycleStatus,
  language: 'en' | 'bn' = 'en'
): string {
  const isBn = language === 'bn';
  switch (status) {
    case 'submitted':
      return isBn
        ? 'নতুন দাখিলকৃত অভিযোগ। পর্যালোচনা করে প্রকাশ করুন অথবা বাতিল করুন।'
        : 'Newly submitted complaint. Review it, then publish or reject.';
    case 'edited':
      return isBn
        ? 'অভিযোগটি সম্পাদিত অবস্থায় রয়েছে। বর্তমানে কোনো মডারেশন অ্যাকশন সক্রিয় নেই।'
        : 'This complaint is in Edited status. No moderation action is currently enabled.';
    case 'published':
      return isBn
        ? 'অভিযোগটি অনুমোদিত এবং প্রকাশিত হিসেবে চিহ্নিত হয়েছে।'
        : 'This complaint has been approved and marked as Published.';
    case 'rejected':
      return isBn
        ? 'অভিযোগটি বাতিল করা হয়েছে।'
        : 'This complaint has been rejected.';
    default:
      return '';
  }
}
