import { supabase } from '@/lib/supabase';
import { ComplaintPublicationDraft } from '@/types/Complaint';

export interface PublishPresentationResult {
  success: boolean;
  complaint_id?: string;
  status?: string;
  previous_status?: string;
  public_title_bn?: string;
  public_title_en?: string;
  message?: string;
  error?: string;
}

export async function publishComplaintPresentation(
  complaintId: string,
  draft: ComplaintPublicationDraft
): Promise<PublishPresentationResult> {
  const { data, error } = await supabase.rpc('admin_publish_complaint', {
    p_complaint_id: complaintId,
    p_public_title_bn: draft.publicTitleBn.trim() || null,
    p_public_title_en: draft.publicTitleEn.trim() || null,
    p_public_summary_bn: draft.publicSummaryBn.trim() || null,
    p_public_summary_en: draft.publicSummaryEn.trim() || null,
  });

  if (error) {
    throw new Error(error.message || 'Failed to publish complaint');
  }

  const result = (data || {}) as PublishPresentationResult;
  if (result.success === false) {
    throw new Error(result.message || result.error || 'Failed to publish complaint');
  }

  return result;
}
