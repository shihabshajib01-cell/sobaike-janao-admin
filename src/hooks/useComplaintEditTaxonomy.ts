import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getTaxonomy,
  SupabaseSegment,
  SupabaseSubcategory,
} from '@/services/api/supabaseComplaintService';

export interface ComplaintEditTaxonomyOption {
  value: string;
  labelEn: string;
  labelBn: string;
}

export function useComplaintEditTaxonomy(enabled: boolean) {
  const [segments, setSegments] = useState<SupabaseSegment[]>([]);
  const [subcategories, setSubcategories] = useState<SupabaseSubcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const taxonomy = await getTaxonomy();
      const activeSegments = taxonomy.segments
        .filter((item) => item.active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const activeSegmentIds = new Set(activeSegments.map((item) => item.id));
      const activeSubcategories = taxonomy.subcategories
        .filter((item) => item.active !== false && activeSegmentIds.has(item.segment_id))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      if (activeSegments.length === 0 || activeSubcategories.length === 0) {
        throw new Error('Active complaint taxonomy is unavailable.');
      }

      setSegments(activeSegments);
      setSubcategories(activeSubcategories);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load complaint taxonomy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && segments.length === 0 && !loading) {
      void load();
    }
  }, [enabled, segments.length, loading, load]);

  const categories = useMemo<ComplaintEditTaxonomyOption[]>(
    () =>
      segments.map((item) => ({
        value: item.id,
        labelEn: item.name_en,
        labelBn: item.name_bn,
      })),
    [segments]
  );

  const getSubcategories = useCallback(
    (segmentId: string): ComplaintEditTaxonomyOption[] =>
      subcategories
        .filter((item) => item.segment_id === segmentId)
        .map((item) => ({
          value: item.id,
          labelEn: item.name_en,
          labelBn: item.name_bn,
        })),
    [subcategories]
  );

  return {
    categories,
    getSubcategories,
    loading,
    error,
    reload: load,
  };
}
