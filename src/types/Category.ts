/**
 * Real Sobaike Taxonomy Domain Types (Segment -> Subcategory).
 * Represents the truthful 2-level taxonomy used by public reporting.
 */

export type TaxonomyStatus = 'active' | 'inactive';
export type TaxonomyConfigStatus = 'draft' | 'ready' | 'published' | 'archived';
export type TaxonomyItemType = 'segment' | 'subcategory';

export interface TaxonomySegment {
  id: string;
  nameEn: string;
  nameBn: string;
  status: TaxonomyStatus;
  configStatus: TaxonomyConfigStatus;
  order: number;
  slug?: string;
  shortNameEn?: string;
  shortNameBn?: string;
  descriptionEn?: string;
  descriptionBn?: string;
  iconKey?: string;
  themeKey?: string;
}

export interface TaxonomySubcategory {
  id: string;
  segmentId: string;
  nameEn: string;
  nameBn: string;
  status: TaxonomyStatus;
  configStatus: TaxonomyConfigStatus;
  order: number;
  descriptionEn?: string;
  descriptionBn?: string;
  categoryGroup?: string | null;
  isSensitive?: boolean;
}

export interface TaxonomySegmentNode extends TaxonomySegment {
  subcategories: TaxonomySubcategory[];
}

export interface TaxonomyFilterState {
  search: string;
  status: 'all' | TaxonomyStatus;
  segmentId: 'all' | string;
}

export interface TaxonomyStats {
  segments: number;
  subcategories: number;
  activeItems: number;
}

export interface TaxonomyUpdateInput {
  itemType: TaxonomyItemType;
  id: string;
  nameEn: string;
  nameBn: string;
  status: TaxonomyStatus;
  order: number;
}


export interface TaxonomyCreateInput {
  itemType: TaxonomyItemType;
  id: string;
  parentSegmentId?: string;
  nameEn: string;
  nameBn: string;
  order: number;
}
