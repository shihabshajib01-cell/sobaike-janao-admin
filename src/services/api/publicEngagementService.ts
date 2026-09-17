import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface PublicEngagementMetrics {
  viewCount: number;
  shareCount: number;
}

export const publicEngagementService = {
  async getForComplaint(complaintId: string): Promise<PublicEngagementMetrics> {
    if (!isSupabaseConfigured) {
      return { viewCount: 0, shareCount: 0 };
    }

    const { data, error } = await supabase
      .from('complaints')
      .select('public_view_count, public_share_count')
      .eq('id', complaintId)
      .maybeSingle();

    if (error) {
      console.warn('[publicEngagementService] Failed to load engagement metrics:', error.message);
      return { viewCount: 0, shareCount: 0 };
    }

    return {
      viewCount: Math.max(0, Number(data?.public_view_count || 0)),
      shareCount: Math.max(0, Number(data?.public_share_count || 0)),
    };
  },
};