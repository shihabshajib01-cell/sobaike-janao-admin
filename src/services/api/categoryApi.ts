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
  { id: 'harassment', nameEn: 'Harassment & Abuse', nameBn: 'হয়রানি ও নির্যাতন', status: 'active', order: 1 },
  { id: 'rickshaw', nameEn: 'Illegal Auto-Rickshaw Charging', nameBn: 'অবৈধ অটো চার্জিং', status: 'active', order: 2 },
  { id: 'extortion', nameEn: 'Extortion', nameBn: 'চাঁদাবাজি', status: 'active', order: 3 },
  { id: 'load_shedding', nameEn: 'Utility Service Complaints', nameBn: 'ইউটিলিটি সেবা অভিযোগ', status: 'active', order: 4 },
];

const DEV_FALLBACK_SUBCATEGORIES: TaxonomySubcategory[] = [
  { id: 'rape-sexual-violence', segmentId: 'harassment', nameEn: 'Rape / Sexual Violence', nameBn: 'ধর্ষণ / যৌন সহিংসতা', status: 'active', order: 1 },
  { id: 'sexual-harassment', segmentId: 'harassment', nameEn: 'Sexual Harassment', nameBn: 'যৌন হয়রানি', status: 'active', order: 2 },
  { id: 'domestic-violence', segmentId: 'harassment', nameEn: 'Domestic Violence', nameBn: 'পারিবারিক সহিংসতা', status: 'active', order: 3 },
  { id: 'blackmail-coercion', segmentId: 'harassment', nameEn: 'Blackmailing / Coercion', nameBn: 'ব্ল্যাকমেইল / জবরদস্তি', status: 'active', order: 4 },
  { id: 'honeytrap', segmentId: 'harassment', nameEn: 'Honeytrap', nameBn: 'হানিট্র্যাপ', status: 'active', order: 5 },
  { id: 'charging-station-location', segmentId: 'rickshaw', nameEn: 'Illegal Auto-Rickshaw Charging', nameBn: 'অবৈধ অটো চার্জিং', status: 'active', order: 1 },
  { id: 'shop-business', segmentId: 'extortion', nameEn: 'Shops & Businesses', nameBn: 'দোকান ও ব্যবসা', status: 'active', order: 1 },
  { id: 'transport-movement', segmentId: 'extortion', nameEn: 'Transport & Transit', nameBn: 'পরিবহন ও চলাচল', status: 'active', order: 2 },
  { id: 'construction-property', segmentId: 'extortion', nameEn: 'Construction & Property', nameBn: 'নির্মাণ ও সম্পত্তি', status: 'active', order: 3 },
  { id: 'threat-money-demand', segmentId: 'extortion', nameEn: 'Threats & Demands', nameBn: 'হুমকি ও টাকা দাবি', status: 'active', order: 4 },
  { id: 'extortion-other', segmentId: 'extortion', nameEn: 'Other Extortion', nameBn: 'অন্যান্য চাঁদাবাজি', status: 'active', order: 5 },
  { id: 'load-shedding-outage', segmentId: 'load_shedding', nameEn: 'Load Shedding', nameBn: 'লোডশেডিং', status: 'active', order: 1 },
  { id: 'gas-shortage', segmentId: 'load_shedding', nameEn: 'Gas Shortage', nameBn: 'গ্যাস সংকট', status: 'active', order: 2 },
  { id: 'excess-electricity-bill', segmentId: 'load_shedding', nameEn: 'Excess Electricity Bill', nameBn: 'অতিরিক্ত বিদ্যুৎ বিল', status: 'active', order: 3 },
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
