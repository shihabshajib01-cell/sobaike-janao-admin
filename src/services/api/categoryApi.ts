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
  TaxonomyStats,
} from '@/types/Category';

export interface TaxonomyBundle {
  segments: TaxonomySegment[];
  subcategories: TaxonomySubcategory[];
  fullTree: TaxonomySegmentNode[];
  stats: TaxonomyStats;
}

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
   * Fetch all taxonomy data in a single unified read (2 Supabase queries total)
   */
  async getTaxonomy(): Promise<TaxonomyBundle> {
    this.checkConfig();

    const [segmentsRes, subcategoriesRes] = await Promise.all([
      supabase
        .from('segments')
        .select('id, name_en, name_bn, active, sort_order')
        .order('sort_order', { ascending: true }),
      supabase
        .from('subcategories')
        .select('id, segment_id, name_en, name_bn, active, sort_order')
        .order('sort_order', { ascending: true }),
    ]);

    if (segmentsRes.error) {
      console.error('Failed to fetch segments from Supabase:', segmentsRes.error);
      throw new Error(`Failed to load segments: ${segmentsRes.error.message}`);
    }

    if (subcategoriesRes.error) {
      console.error('Failed to fetch subcategories from Supabase:', subcategoriesRes.error);
      throw new Error(`Failed to load subcategories: ${subcategoriesRes.error.message}`);
    }

    const segments: TaxonomySegment[] = (segmentsRes.data || []).map((row) => ({
      id: row.id,
      nameEn: row.name_en || row.name_bn || row.id,
      nameBn: row.name_bn || row.name_en || row.id,
      status: row.active === false ? 'inactive' : 'active',
      order: row.sort_order ?? 0,
    }));

    const subcategories: TaxonomySubcategory[] = (subcategoriesRes.data || []).map((row) => ({
      id: row.id,
      segmentId: row.segment_id,
      nameEn: row.name_en || row.name_bn || row.id,
      nameBn: row.name_bn || row.name_en || row.id,
      status: row.active === false ? 'inactive' : 'active',
      order: row.sort_order ?? 0,
    }));

    const fullTree: TaxonomySegmentNode[] = segments.map((seg) => ({
      ...seg,
      subcategories: subcategories.filter((sub) => sub.segmentId === seg.id),
    }));

    const activeSegments = segments.filter((s) => s.status === 'active').length;
    const activeSubs = subcategories.filter((s) => s.status === 'active').length;

    const stats: TaxonomyStats = {
      segments: segments.length,
      subcategories: subcategories.length,
      activeItems: activeSegments + activeSubs,
    };

    return {
      segments,
      subcategories,
      fullTree,
      stats,
    };
  }

  /**
   * Get all real taxonomy segments from Supabase
   */
  async getSegments(): Promise<TaxonomySegment[]> {
    const { segments } = await this.getTaxonomy();
    return segments;
  }

  /**
   * Get all real taxonomy subcategories from Supabase
   */
  async getSubcategories(segmentId?: string): Promise<TaxonomySubcategory[]> {
    const { subcategories } = await this.getTaxonomy();
    if (segmentId && segmentId !== 'all') {
      return subcategories.filter((s) => s.segmentId === segmentId);
    }
    return subcategories;
  }

  /**
   * Get complete hierarchical taxonomy tree (Segment -> Subcategory)
   */
  async getTaxonomyTree(): Promise<TaxonomySegmentNode[]> {
    const { fullTree } = await this.getTaxonomy();
    return fullTree;
  }

  /**
   * Get truthful summary statistics from loaded taxonomy records
   */
  async getTaxonomyStats(): Promise<TaxonomyStats> {
    const { stats } = await this.getTaxonomy();
    return stats;
  }
}

export const categoryApi = new CategoryApi();
export default categoryApi;
