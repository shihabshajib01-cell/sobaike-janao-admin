import { ComplaintLifecycleStatus } from '@/types/Complaint';

export type ComplaintActionId =
  | 'edit'
  | 'publish'
  | 'unpublish'
  | 'reject';

export interface ComplaintActionConfig {
  id: ComplaintActionId;
  labelEn: string;
  labelBn: string;
  variant: 'primary' | 'secondary' | 'success' | 'danger';
  iconName: 'Edit' | 'Share2' | 'EyeOff' | 'XCircle';
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
  unpublish: {
    id: 'unpublish',
    labelEn: 'Unpublish',
    labelBn: 'প্রকাশনা বন্ধ করুন',
    variant: 'secondary',
    iconName: 'EyeOff',
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
 * Returns available direct moderation actions strictly based on current status.
 * Publishing is intentionally excluded here and is handled by the dedicated
 * Prepare for Publication workflow so raw citizen content cannot be published
 * without reviewing the public headline/summary preview first.
 *
 * Status Matrix:
 * - submitted: [reject] + dedicated publication workflow
 * - published: [unpublish]
 * - unpublished: dedicated publication workflow
 * - rejected: []
 * - edited: []
 */
export function getAvailableComplaintActions(
  status: ComplaintLifecycleStatus
): ComplaintActionConfig[] {
  switch (status) {
    case 'submitted':
      return [COMPLAINT_ACTION_DEFINITIONS.reject];

    case 'published':
      return [COMPLAINT_ACTION_DEFINITIONS.unpublish];

    case 'unpublished':
      return [];

    case 'edited':
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
        ? 'নতুন দাখিলকৃত অভিযোগ। তথ্য যাচাই করুন, পাবলিক পোস্ট প্রস্তুত করে প্রকাশ করুন অথবা প্রয়োজন হলে বাতিল করুন।'
        : 'Newly submitted complaint. Review the facts, prepare the public post for publication, or reject when appropriate.';
    case 'published':
      return isBn
        ? 'অভিযোগটি বর্তমানে পাবলিক ফিডে প্রকাশিত আছে। জনসমক্ষে আর দেখানো না হলে প্রকাশনা বন্ধ করতে পারেন।'
        : 'This complaint is currently live on the public feed. You can unpublish it if it should no longer be publicly visible.';
    case 'unpublished':
      return isBn
        ? 'অভিযোগটি বর্তমানে পাবলিক ফিডে দৃশ্যমান নয়। পাবলিক পোস্টটি পর্যালোচনা করে প্রস্তুত হলে আবার প্রকাশ করুন।'
        : 'This complaint is not visible on the public feed. Review its public presentation and republish when ready.';
    case 'rejected':
      return isBn
        ? 'অভিযোগটি বাতিল করা হয়েছে।'
        : 'This complaint has been rejected.';
    case 'edited':
      return isBn
        ? 'অভিযোগটি সম্পাদিত অবস্থায় রয়েছে। বর্তমানে কোনো মডারেশন অ্যাকশন সক্রিয় নেই।'
        : 'This complaint is in Edited status. No moderation action is currently enabled.';
    default:
      return '';
  }
}
