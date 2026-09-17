import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface ComplaintEngagementCounts {
  viewCount: number;
  shareCount: number;
}

interface ComplaintEngagementRow extends ComplaintEngagementCounts {
  id: string;
}

const EMPTY_COUNTS: ComplaintEngagementCounts = { viewCount: 0, shareCount: 0 };
const CACHE_TTL_MS = 15_000;

let cachedCounts = new Map<string, ComplaintEngagementCounts>();
let cacheExpiresAt = 0;
let countsRequest: Promise<Map<string, ComplaintEngagementCounts>> | null = null;

const normalizeCounts = (value: unknown): ComplaintEngagementCounts => {
  const row = (value || {}) as Partial<ComplaintEngagementCounts>;
  return {
    viewCount: Math.max(0, Number(row.viewCount) || 0),
    shareCount: Math.max(0, Number(row.shareCount) || 0),
  };
};

async function loadAllCounts(): Promise<Map<string, ComplaintEngagementCounts>> {
  if (!isSupabaseConfigured() || !supabase) return new Map();
  if (Date.now() < cacheExpiresAt && cachedCounts.size > 0) return cachedCounts;
  if (countsRequest) return countsRequest;

  countsRequest = (async () => {
    const { data, error } = await supabase!.rpc('get_public_report_engagement_counts');
    if (error) {
      console.warn('[ComplaintEngagementService] Failed to load engagement counts:', error);
      return cachedCounts;
    }

    const next = new Map<string, ComplaintEngagementCounts>();
    if (Array.isArray(data)) {
      (data as ComplaintEngagementRow[]).forEach((row) => {
        if (!row?.id) return;
        next.set(row.id.trim().toUpperCase(), normalizeCounts(row));
      });
    }

    cachedCounts = next;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return cachedCounts;
  })().finally(() => {
    countsRequest = null;
  });

  return countsRequest;
}

export const ComplaintEngagementService = {
  async getCounts(complaintId: string): Promise<ComplaintEngagementCounts> {
    const cleanId = complaintId.trim().toUpperCase();
    if (!cleanId) return EMPTY_COUNTS;
    const allCounts = await loadAllCounts();
    return allCounts.get(cleanId) || EMPTY_COUNTS;
  },
};
