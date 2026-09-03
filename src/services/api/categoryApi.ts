/**
 * Real Read-Only Taxonomy API Service Layer
 * Reads real segments and subcategories directly from Supabase.
 * Strictly read-only: no fake write methods, no mock fallbacks in configured production.
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

const DEV_FALLBACK_SEGMENTS: TaxonomySegment[] = [
  { id: 'harassment', nameEn: 'Harassment & Violence', nameBn: 'যৌন হয়রানি ও সহিংসতা', status: 'active', order: 1 },
  { id: 'rickshaw', nameEn: 'Battery Rickshaw & Charging Hazards', nameBn: 'ব্যাটারি রিকশা ও চার্জিং ঝুঁকি', status: 'active', order: 2 },
  { id: 'roads_traffic', nameEn: 'Roads & Traffic Hazards', nameBn: 'রাস্তাঘাট ও ট্রাফিক ঝুঁকি', status: 'active', order: 3 },
  { id: 'waste_management', nameEn: 'Waste Management', nameBn: 'বর্জ্য ব্যবস্থাপনা', status: 'active', order: 4 },
  { id: 'water_sanitation', nameEn: 'Water & Sanitation', nameBn: 'পানি ও পয়ঃনিষ্কাশন', status: 'active', order: 5 },
  { id: 'public_lighting', nameEn: 'Street & Public Lighting', nameBn: 'সড়ক ও পাবলিক বাতি', status: 'active', order: 6 },
];

const DEV_FALLBACK_SUBCATEGORIES: TaxonomySubcategory[] = [
  { id: 'street_harassment', segmentId: 'harassment', nameEn: 'Street Harassment', nameBn: 'সড়কে হয়রানি', status: 'active', order: 1 },
  { id: 'domestic_abuse', segmentId: 'harassment', nameEn: 'Domestic Abuse', nameBn: 'পারিবারিক নির্যাতন', status: 'active', order: 2 },
  { id: 'unauthorized_charging', segmentId: 'rickshaw', nameEn: 'Unauthorized Charging Station', nameBn: 'অবৈধ চার্জিং স্টেশন', status: 'active', order: 1 },
  { id: 'reckless_driving', segmentId: 'rickshaw', nameEn: 'Reckless Driving', nameBn: 'বেপরোয়া চলাচল', status: 'active', order: 2 },
  { id: 'open_manhole', segmentId: 'roads_traffic', nameEn: 'Open Manhole', nameBn: 'উন্মুক্ত ম্যানহোল', status: 'active', order: 1 },
  { id: 'broken_pavement', segmentId: 'roads_traffic', nameEn: 'Broken Road / Pavement', nameBn: 'ভাঙা সড়ক ও ফুটপাত', status: 'active', order: 2 },
  { id: 'uncollected_garbage', segmentId: 'waste_management', nameEn: 'Uncollected Garbage', nameBn: 'অনপসারিত বর্জ্য', status: 'active', order: 1 },
  { id: 'drainage_blockage', segmentId: 'water_sanitation', nameEn: 'Drainage Overflow', nameBn: 'ড্রেনেজ উপচে পড়া', status: 'active', order: 1 },
  { id: 'broken_streetlamp', segmentId: 'public_lighting', nameEn: 'Broken Streetlamp', nameBn: 'অকেজো সড়কবাতি', status: 'active', order: 1 },
];

const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

function createDevFallbackTaxonomyBundle(): TaxonomyBundle {
  const fullTree: TaxonomySegmentNode[] = DEV_FALLBACK_SEGMENTS.map((seg) => ({
    ...seg,
    subcategories: DEV_FALLBACK_SUBCATEGORIES.filter((sub) => sub.segmentId === seg.id),
  }));

  const stats: TaxonomyStats = {
    segments: DEV_FALLBACK_SEGMENTS.length,
    subcategories: DEV_FALLBACK_SUBCATEGORIES.length,
    activeItems: DEV_FALLBACK_SEGMENTS.length + DEV_FALLBACK_SUBCATEGORIES.length,
  };

  return {
    segments: DEV_FALLBACK_SEGMENTS,
    subcategories: DEV_FALLBACK_SUBCATEGORIES,
    fullTree,
    stats,
  };
}

export class CategoryApi {
  /**
   * Fetch all taxonomy data in a single unified read.
   * In configured production: queries real Supabase tables and throws real errors on failure.
   * Genuine empty databases return empty arrays and 0 stats; never fake data.
   */
  async getTaxonomy(): Promise<TaxonomyBundle> {
    if (!isSupabaseConfigured) {
      if (isDev) {
        return createDevFallbackTaxonomyBundle();
      }
      throw new Error('Supabase taxonomy service is not configured in this environment.');
    }

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
      console.error('Supabase segments query failed:', segmentsRes.error);
      throw new Error(`Failed to load segments: ${segmentsRes.error.message}`);
    }

    if (subcategoriesRes.error) {
      console.error('Supabase subcategories query failed:', subcategoriesRes.error);
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
