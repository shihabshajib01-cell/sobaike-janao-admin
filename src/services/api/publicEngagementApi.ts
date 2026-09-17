import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface ComplaintPublicEngagement {
  viewCount: number;
  shareCount: number;
}

export async function getComplaintPublicEngagement(
  complaintId: string
): Promise<ComplaintPublicEngagement> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('complaints')
    .select('public_view_count, public_share_count')
    .eq('id', complaintId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load public engagement: ${error.message}`);
  }

  return {
    viewCount: Math.max(0, Number(data?.public_view_count ?? 0) || 0),
    shareCount: Math.max(0, Number(data?.public_share_count ?? 0) || 0),
  };
}
