import { supabase } from '@/lib/supabase';
import { ComplaintPublicationDraft } from '@/types/Complaint';

export interface PublicationDraftResult {
  success: boolean;
  complaint_id?: string;
  status?: string;
  message?: string;
  error?: string;
}

export async function saveComplaintPublicationDraft(
  complaintId: string,
  draft: ComplaintPublicationDraft
): Promise<PublicationDraftResult> {
  const { data, error } = await supabase.rpc('admin_save_publication_draft', {
    p_complaint_id: complaintId,
    p_public_title_bn: draft.publicTitleBn.trim() || null,
    p_public_title_en: draft.publicTitleEn.trim() || null,
    p_public_summary_bn: draft.publicSummaryBn.trim() || null,
    p_public_summary_en: draft.publicSummaryEn.trim() || null,
  });

  if (error) {
    throw new Error(error.message || 'Failed to save public presentation draft');
  }

  const result = (data || {}) as PublicationDraftResult;
  if (result.success === false) {
    throw new Error(
      result.message || result.error || 'Failed to save public presentation draft'
    );
  }

  return result;
}
