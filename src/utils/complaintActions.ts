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
 * - submitted: [edit, publish, reject]
 * - edited: [edit, publish, reject]
 * - published: [edit, reject]
 * - rejected: [edit, publish]
 */
export function getAvailableComplaintActions(
  status: ComplaintLifecycleStatus
): ComplaintActionConfig[] {
  switch (status) {
    case 'submitted':
      return [
        COMPLAINT_ACTION_DEFINITIONS.edit,
        COMPLAINT_ACTION_DEFINITIONS.publish,
        COMPLAINT_ACTION_DEFINITIONS.reject,
      ];

    case 'edited':
      return [
        COMPLAINT_ACTION_DEFINITIONS.edit,
        COMPLAINT_ACTION_DEFINITIONS.publish,
        COMPLAINT_ACTION_DEFINITIONS.reject,
      ];

    case 'published':
      return [
        COMPLAINT_ACTION_DEFINITIONS.edit,
        COMPLAINT_ACTION_DEFINITIONS.reject,
      ];

    case 'rejected':
      return [
        COMPLAINT_ACTION_DEFINITIONS.edit,
        COMPLAINT_ACTION_DEFINITIONS.publish,
      ];

    default:
      return [COMPLAINT_ACTION_DEFINITIONS.edit];
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
        ? 'নতুন দাখিলকৃত অভিযোগ। বিবরণ সম্পাদনা করুন, ফিডে প্রকাশ করুন অথবা বাতিল করুন।'
        : 'Newly submitted complaint. You can edit details, publish to public feed, or reject.';
    case 'edited':
      return isBn
        ? 'অভিযোগটি সম্পাদিত হয়েছে। সংস্করণ ইতিহাস যাচাই করুন এবং প্রকাশ বা বাতিল করুন।'
        : 'Complaint has been edited. Inspect version history, publish to public feed, or reject.';
    case 'published':
      return isBn
        ? 'অভিযোগটি পাবলিক ফিডে উন্মুক্ত রয়েছে। প্রয়োজনে তথ্য সম্পাদনা বা প্রত্যাহার করতে পারেন।'
        : 'Complaint is live on the public feed. You can edit details or reject if needed.';
    case 'rejected':
      return isBn
        ? 'অভিযোগটি বাতিল করা হয়েছে। প্রয়োজনে সম্পাদনা বা পুনরায় প্রকাশ করতে পারেন।'
        : 'Complaint was rejected. You can edit details or re-publish.';
    default:
      return '';
  }
}
