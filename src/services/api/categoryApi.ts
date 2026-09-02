/**
 * Real Read-Only Taxonomy API Service Layer
 * Reads real segments and subcategories directly from Supabase.
 * Strictly read-only: no fake write methods, no mock fallbacks, no old REST endpoints.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  TaxonomySegment,
  TaxonomySubcategory,
  TaxonomySegmentNode,
  TaxonomyFilterState,
  TaxonomyStats,
} from '@/types/Category';

export class CategoryApi {
  /**
   * Ensure Supabase is configured before querying
   */
  private checkConfig() {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
  }

  /**
   * Get all real taxonomy segments from Supabase
   */
  async getSegments(): Promise<TaxonomySegment[]> {
    this.checkConfig();

    const { data, error } = await supabase
      .from('segments')
      .select('id, name_en, name_bn, active, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch segments from Supabase:', error);
      throw new Error(`Failed to load segments: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      nameEn: row.name_en || row.id,
      nameBn: row.name_bn || row.name_en || row.id,
      status: row.active === false ? 'inactive' : 'active',
      order: row.sort_order ?? 0,
    }));
  }

  /**
   * Get all real taxonomy subcategories from Supabase
   */
  async getSubcategories(segmentId?: string): Promise<TaxonomySubcategory[]> {
    this.checkConfig();

    let query = supabase
      .from('subcategories')
      .select('id, segment_id, name_en, name_bn, active, sort_order')
      .order('sort_order', { ascending: true });

    if (segmentId && segmentId !== 'all') {
      query = query.eq('segment_id', segmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch subcategories from Supabase:', error);
      throw new Error(`Failed to load subcategories: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      segmentId: row.segment_id,
      categoryId: row.segment_id, // Backwards compatibility for Map
      nameEn: row.name_en || row.id,
      nameBn: row.name_bn || row.name_en || row.id,
      status: row.active === false ? 'inactive' : 'active',
      order: row.sort_order ?? 0,
    }));
  }

  /**
   * Get complete hierarchical taxonomy tree (Segment -> Subcategory)
   */
  async getTaxonomyTree(
    filters?: Partial<TaxonomyFilterState>
  ): Promise<TaxonomySegmentNode[]> {
    const [segments, subcategories] = await Promise.all([
      this.getSegments(),
      this.getSubcategories(),
    ]);

    const searchQuery = (filters?.search || '').trim().toLowerCase();
    const statusFilter = filters?.status || 'all';
    const segmentFilter = filters?.segmentId || 'all';

    // Map subcategories under their respective segments
    const tree: TaxonomySegmentNode[] = segments.map((seg) => {
      const segSubs = subcategories.filter((sub) => sub.segmentId === seg.id);
      return {
        ...seg,
        subcategories: segSubs,
      };
    });

    // Apply filters
    return tree
      .filter((seg) => {
        // Segment ID filter
        if (segmentFilter !== 'all' && seg.id !== segmentFilter) {
          return false;
        }

        // Status filter: match segment status or if any subcategory matches status
        if (statusFilter !== 'all') {
          const segMatch = seg.status === statusFilter;
          const hasMatchingSub = seg.subcategories.some((s) => s.status === statusFilter);
          if (!segMatch && !hasMatchingSub) {
            return false;
          }
        }

        // Search filter: match segment names or subcategory names
        if (searchQuery) {
          const segNameEnMatch = seg.nameEn.toLowerCase().includes(searchQuery);
          const segNameBnMatch = seg.nameBn.toLowerCase().includes(searchQuery);
          const segIdMatch = seg.id.toLowerCase().includes(searchQuery);
          const subMatch = seg.subcategories.some(
            (s) =>
              s.nameEn.toLowerCase().includes(searchQuery) ||
              s.nameBn.toLowerCase().includes(searchQuery) ||
              s.id.toLowerCase().includes(searchQuery)
          );

          if (!segNameEnMatch && !segNameBnMatch && !segIdMatch && !subMatch) {
            return false;
          }
        }

        return true;
      })
      .map((seg) => {
        // Filter subcategories within segment if status or search applies
        let filteredSubs = seg.subcategories;

        if (statusFilter !== 'all') {
          filteredSubs = filteredSubs.filter((s) => s.status === statusFilter);
        }

        if (searchQuery) {
          const segMatchesSearch =
            seg.nameEn.toLowerCase().includes(searchQuery) ||
            seg.nameBn.toLowerCase().includes(searchQuery) ||
            seg.id.toLowerCase().includes(searchQuery);

          // If segment itself matched search, show all filtered subs, otherwise filter subs
          if (!segMatchesSearch) {
            filteredSubs = filteredSubs.filter(
              (s) =>
                s.nameEn.toLowerCase().includes(searchQuery) ||
                s.nameBn.toLowerCase().includes(searchQuery) ||
                s.id.toLowerCase().includes(searchQuery)
            );
          }
        }

        return {
          ...seg,
          subcategories: filteredSubs,
        };
      });
  }

  /**
   * Get truthful summary statistics from loaded taxonomy records
   */
  async getTaxonomyStats(): Promise<TaxonomyStats> {
    const [segments, subcategories] = await Promise.all([
      this.getSegments(),
      this.getSubcategories(),
    ]);

    const activeSegments = segments.filter((s) => s.status === 'active').length;
    const activeSubs = subcategories.filter((s) => s.status === 'active').length;

    return {
      segments: segments.length,
      subcategories: subcategories.length,
      activeItems: activeSegments + activeSubs,
    };
  }

  /**
   * Backwards-compatible alias for MapPage
   */
  async getCategories(
    segmentId?: string,
    filters?: Partial<TaxonomyFilterState>
  ): Promise<TaxonomySegment[]> {
    const segments = await this.getSegments();
    if (segmentId && segmentId !== 'all') {
      return segments.filter((s) => s.id === segmentId);
    }
    if (filters?.status && filters.status !== 'all') {
      return segments.filter((s) => s.status === filters.status);
    }
    return segments;
  }
}

export const categoryApi = new CategoryApi();
export default categoryApi;
