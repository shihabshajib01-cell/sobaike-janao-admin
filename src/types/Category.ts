/**
 * Real Sobaike Taxonomy Domain Types (Segment -> Subcategory).
 * Represents the truthful 2-level taxonomy used by public reporting.
 */

export type TaxonomyStatus = 'active' | 'inactive';

export interface TaxonomySegment {
  id: string;
  nameEn: string;
  nameBn: string;
  status: TaxonomyStatus;
  order: number;
}

export interface TaxonomySubcategory {
  id: string;
  segmentId: string;
  nameEn: string;
  nameBn: string;
  status: TaxonomyStatus;
  order: number;
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
