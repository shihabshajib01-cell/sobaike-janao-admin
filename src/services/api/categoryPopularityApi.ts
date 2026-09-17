import { supabase } from '@/lib/supabase';

export interface CategoryPopularityMetric {
  segmentId: string;
  publishedPostCount: number;
  viewCount: number;
  shareCount: number;
  popularityScore: number;
  popularityRank: number;
}

interface RawCategoryPopularityRow {
  segment_id: string;
  published_post_count: number | string | null;
  view_count: number | string | null;
  share_count: number | string | null;
  popularity_score: number | string | null;
  popularity_rank: number | string | null;
}

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export async function getCategoryPopularity(): Promise<CategoryPopularityMetric[]> {
  const { data, error } = await supabase.rpc('get_public_category_popularity');

  if (error) {
    throw new Error(`Failed to load category popularity: ${error.message}`);
  }

  if (!Array.isArray(data)) return [];

  return (data as RawCategoryPopularityRow[])
    .filter((row) => typeof row.segment_id === 'string' && row.segment_id.length > 0)
    .map((row) => ({
      segmentId: row.segment_id,
      publishedPostCount: toNumber(row.published_post_count),
      viewCount: toNumber(row.view_count),
      shareCount: toNumber(row.share_count),
      popularityScore: toNumber(row.popularity_score),
      popularityRank: toNumber(row.popularity_rank),
    }))
    .sort((a, b) => a.popularityRank - b.popularityRank);
}
