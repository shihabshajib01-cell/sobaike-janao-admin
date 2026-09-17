import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface ComplaintEngagementCounts {
  viewCount: number;
  shareCount: number;
}

interface ComplaintEngagementRow extends ComplaintEngagementCounts {
  id: string;
}

const ZERO_COUNTS: ComplaintEngagementCounts = { viewCount: 0, shareCount: 0 };
let countsCache: Map<string, ComplaintEngagementCounts> | null = null;
let countsRequest: Promise<Map<string, ComplaintEngagementCounts>> | null = null;

const normalizeId = (id: string) => id.trim().toUpperCase();

export const complaintEngagementApi = {
  async getAll(): Promise<Map<string, ComplaintEngagementCounts>> {
    if (countsCache) return countsCache;
    if (countsRequest) return countsRequest;
    if (!isSupabaseConfigured) return new Map();

    countsRequest = (async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_report_engagement_counts');
        if (error) throw error;

        const next = new Map<string, ComplaintEngagementCounts>();
        if (Array.isArray(data)) {
          for (const row of data as ComplaintEngagementRow[]) {
            if (!row?.id) continue;
            next.set(normalizeId(row.id), {
              viewCount: Math.max(0, Number(row.viewCount) || 0),
              shareCount: Math.max(0, Number(row.shareCount) || 0),
            });
          }
        }
        countsCache = next;
        return next;
      } catch (error) {
        console.warn('[complaintEngagementApi.getAll] Failed:', error);
        return new Map();
      } finally {
        countsRequest = null;
      }
    })();

    return countsRequest;
  },

  async getByComplaintId(complaintId: string): Promise<ComplaintEngagementCounts> {
    const all = await this.getAll();
    return all.get(normalizeId(complaintId)) || ZERO_COUNTS;
  },

  clearCache() {
    countsCache = null;
    countsRequest = null;
  },
};
