import { supabase } from '@/lib/supabase';
import { ComplaintPublicationDraft } from '@/types/Complaint';

function normalizeDraft(draft: ComplaintPublicationDraft) {
  return {
    p_public_title_bn: draft.publicTitleBn.trim() || null,
    p_public_title_en: draft.publicTitleEn.trim() || null,
    p_public_summary_bn: draft.publicSummaryBn.trim() || null,
    p_public_summary_en: draft.publicSummaryEn.trim() || null,
  };
}

function assertRpcSuccess(
  data: unknown,
  fallbackMessage: string
): void {
  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    (data as { success?: boolean }).success === false
  ) {
    const result = data as { message?: string; error?: string };
    throw new Error(result.message || result.error || fallbackMessage);
  }
}

export const publicationApi = {
  async saveDraft(
    complaintId: string,
    draft: ComplaintPublicationDraft
  ): Promise<void> {
    const { data, error } = await supabase.rpc('admin_save_publication_draft', {
      p_complaint_id: complaintId,
      ...normalizeDraft(draft),
    });

    if (error) {
      throw new Error(error.message || 'Failed to save publication draft.');
    }

    assertRpcSuccess(data, 'Failed to save publication draft.');
  },

  async publish(
    complaintId: string,
    draft: ComplaintPublicationDraft
  ): Promise<void> {
    const { data, error } = await supabase.rpc('admin_publish_complaint', {
      p_complaint_id: complaintId,
      ...normalizeDraft(draft),
    });

    if (error) {
      throw new Error(error.message || 'Failed to publish complaint.');
    }

    assertRpcSuccess(data, 'Failed to publish complaint.');
  },
};

export default publicationApi;
