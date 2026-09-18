/**
 * Real Taxonomy API Service Layer
 * Reads the full Admin taxonomy through an authorized RPC and updates existing
 * taxonomy items through the categories.manage contract.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  TaxonomySegment,
  TaxonomySubcategory,
  TaxonomySegmentNode,
  TaxonomyStats,
  TaxonomyUpdateInput,
  TaxonomyCreateInput,
  TaxonomyConfigStatus,
} from '@/types/Category';

export interface TaxonomyBundle {
  segments: TaxonomySegment[];
  subcategories: TaxonomySubcategory[];
  fullTree: TaxonomySegmentNode[];
  stats: TaxonomyStats;
}

interface RawSegmentRow {
  id: string;
  name_en: string;
  name_bn: string;
  active: boolean;
  sort_order: number;
  config_status?: TaxonomyConfigStatus;
  slug?: string | null;
  short_name_en?: string | null;
  short_name_bn?: string | null;
  description_en?: string | null;
  description_bn?: string | null;
  icon_key?: string | null;
  theme_key?: string | null;
}

interface RawSubcategoryRow extends RawSegmentRow {
  segment_id: string;
  category_group?: string | null;
  is_sensitive?: boolean | null;
}

interface RawTaxonomyBundle {
  segments?: RawSegmentRow[];
  subcategories?: RawSubcategoryRow[];
}

export class CategoryApi {
  /**
   * Fetch all taxonomy data through the Admin-only RPC so inactive records are
   * visible to authorized administrators without weakening public RLS.
   */
  async getTaxonomy(): Promise<TaxonomyBundle> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase taxonomy service is not configured in this environment.');
    }

    const { data, error } = await supabase.rpc('admin_get_taxonomy_configuration');

    if (error) {
      console.error('Supabase admin taxonomy query failed:', error);
      throw new Error(`Failed to load taxonomy: ${error.message}`);
    }

    const raw = (data || {}) as RawTaxonomyBundle;
    const segmentRows = Array.isArray(raw.segments) ? raw.segments : [];
    const subcategoryRows = Array.isArray(raw.subcategories) ? raw.subcategories : [];

    const segments: TaxonomySegment[] = segmentRows.map((row) => ({
      id: row.id,
      nameEn: row.name_en || row.name_bn || row.id,
      nameBn: row.name_bn || row.name_en || row.id,
      status: row.active === false ? 'inactive' : 'active',
      configStatus: row.config_status || 'published',
      order: row.sort_order ?? 0,
      slug: row.slug || undefined,
      shortNameEn: row.short_name_en || undefined,
      shortNameBn: row.short_name_bn || undefined,
      descriptionEn: row.description_en || undefined,
      descriptionBn: row.description_bn || undefined,
      iconKey: row.icon_key || undefined,
      themeKey: row.theme_key || undefined,
    }));

    const subcategories: TaxonomySubcategory[] = subcategoryRows.map((row) => ({
      id: row.id,
      segmentId: row.segment_id,
      nameEn: row.name_en || row.name_bn || row.id,
      nameBn: row.name_bn || row.name_en || row.id,
      status: row.active === false ? 'inactive' : 'active',
      configStatus: row.config_status || 'published',
      order: row.sort_order ?? 0,
      descriptionEn: row.description_en || undefined,
      descriptionBn: row.description_bn || undefined,
      categoryGroup: row.category_group ?? null,
      isSensitive: Boolean(row.is_sensitive),
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
   * Create a new taxonomy item as an inactive draft.
   * Draft items are intentionally not available to the Public reporting flow.
   */
  async createTaxonomyItem(input: TaxonomyCreateInput): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase taxonomy service is not configured in this environment.');
    }

    const id = input.id.trim().toLowerCase();
    const nameEn = input.nameEn.trim();
    const nameBn = input.nameBn.trim();

    if (!id || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id)) {
      throw new Error('ID must use lowercase letters, numbers, and underscores only.');
    }

    if (!nameEn || !nameBn) {
      throw new Error('Both English and Bangla names are required.');
    }

    if (!Number.isInteger(input.order) || input.order < 1 || input.order > 999) {
      throw new Error('Sort order must be an integer from 1 to 999.');
    }

    if (input.itemType === 'subcategory' && !input.parentSegmentId?.trim()) {
      throw new Error('Parent category is required for a subcategory.');
    }

    const { error } = await supabase.rpc('admin_create_taxonomy_item', {
      p_item_type: input.itemType,
      p_item_id: id,
      p_parent_segment_id: input.parentSegmentId?.trim() || null,
      p_name_en: nameEn,
      p_name_bn: nameBn,
      p_sort_order: input.order,
    });

    if (error) {
      throw new Error(`Failed to create taxonomy draft: ${error.message}`);
    }
  }

  /**
   * Update an existing segment or subcategory. IDs remain immutable.
   * Subcategory re-parenting is handled through the protected move RPC and
   * automatically deactivates the item until it is republished.
   */
  async updateTaxonomyItem(input: TaxonomyUpdateInput): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase taxonomy service is not configured in this environment.');
    }

    const id = input.id.trim();
    const nameEn = input.nameEn.trim();
    const nameBn = input.nameBn.trim();

    if (!id || !nameEn || !nameBn) {
      throw new Error('Taxonomy ID and both bilingual names are required.');
    }

    if (!Number.isInteger(input.order)) {
      throw new Error('Sort order must be an integer.');
    }

    if (input.itemType === 'subcategory' && input.parentSegmentId?.trim()) {
      const current = await this.getSubcategories();
      const existing = current.find((item) => item.id === id);
      if (existing && existing.segmentId !== input.parentSegmentId.trim()) {
        const { error: moveError } = await supabase.rpc('admin_move_subcategory', {
          p_subcategory_id: id,
          p_target_segment_id: input.parentSegmentId.trim(),
          p_sort_order: input.order,
        });
        if (moveError) {
          throw new Error(`Failed to move subcategory: ${moveError.message}`);
        }
      }
    }

    const configPayload =
      input.itemType === 'segment'
        ? {
            nameEn,
            nameBn,
            shortNameEn: input.shortNameEn?.trim() || nameEn,
            shortNameBn: input.shortNameBn?.trim() || nameBn,
            descriptionEn: input.descriptionEn ?? '',
            descriptionBn: input.descriptionBn ?? '',
            slug: input.slug?.trim() || id.replace(/_/g, '-'),
            iconKey: input.iconKey?.trim() || 'shield',
            themeKey: input.themeKey?.trim() || 'sky',
            sortOrder: input.order,
          }
        : {
            nameEn,
            nameBn,
            descriptionEn: input.descriptionEn ?? '',
            descriptionBn: input.descriptionBn ?? '',
            categoryGroup: input.categoryGroup ?? null,
            isSensitive: Boolean(input.isSensitive),
            sortOrder: input.order,
          };

    const { error: configError } = await supabase.rpc('admin_update_taxonomy_configuration', {
      p_item_type: input.itemType,
      p_item_id: id,
      p_payload: configPayload,
    });

    if (configError) {
      throw new Error(`Failed to update taxonomy configuration: ${configError.message}`);
    }

    const { error } = await supabase.rpc('admin_update_taxonomy_item', {
      p_item_type: input.itemType,
      p_item_id: id,
      p_name_en: nameEn,
      p_name_bn: nameBn,
      p_active: input.status === 'active',
      p_sort_order: input.order,
    });

    if (error) {
      throw new Error(`Failed to update taxonomy: ${error.message}`);
    }
  }

  async publishTaxonomyItem(itemType: 'segment' | 'subcategory', id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase taxonomy service is not configured in this environment.');
    }

    const { error } = await supabase.rpc('admin_publish_taxonomy_item', {
      p_item_type: itemType,
      p_item_id: id,
    });

    if (error) {
      throw new Error(`Failed to publish taxonomy item: ${error.message}`);
    }
  }

  async moveSubcategory(
    subcategoryId: string,
    targetSegmentId: string,
    sortOrder?: number
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase taxonomy service is not configured in this environment.');
    }

    const { error } = await supabase.rpc('admin_move_subcategory', {
      p_subcategory_id: subcategoryId,
      p_target_segment_id: targetSegmentId,
      p_sort_order: sortOrder ?? null,
    });

    if (error) {
      throw new Error(`Failed to move subcategory: ${error.message}`);
    }
  }

  async getSegments(): Promise<TaxonomySegment[]> {
    const { segments } = await this.getTaxonomy();
    return segments;
  }

  async getSubcategories(segmentId?: string): Promise<TaxonomySubcategory[]> {
    const { subcategories } = await this.getTaxonomy();
    if (segmentId && segmentId !== 'all') {
      return subcategories.filter((s) => s.segmentId === segmentId);
    }
    return subcategories;
  }

  async getTaxonomyTree(): Promise<TaxonomySegmentNode[]> {
    const { fullTree } = await this.getTaxonomy();
    return fullTree;
  }

  async getTaxonomyStats(): Promise<TaxonomyStats> {
    const { stats } = await this.getTaxonomy();
    return stats;
  }
}

export const categoryApi = new CategoryApi();
export default categoryApi;
