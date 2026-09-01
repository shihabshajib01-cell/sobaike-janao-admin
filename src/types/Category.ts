/**
 * Category & Hierarchy Domain Types
 * Strict 3-level taxonomy: Feature -> Category -> Subcategory
 * Demo taxonomy data aligned with public product scope
 */

export type CategoryStatus = 'active' | 'inactive';

export type FeatureId =
  | 'complaints'
  | 'public_feed';

export interface Feature {
  id: FeatureId | string;
  nameEn: string;
  nameBn: string;
  status: CategoryStatus;
  order: number;
}

export interface Category {
  id: string;
  featureId: FeatureId | string;
  nameEn: string;
  nameBn: string;
  status: CategoryStatus;
  order: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  featureId?: FeatureId | string;
  nameEn: string;
  nameBn: string;
  status: CategoryStatus;
  order: number;
}

export interface CategoryTreeNode extends Category {
  subcategories: Subcategory[];
}

export interface FeatureTreeNode extends Feature {
  categories: CategoryTreeNode[];
}

export interface CategoryFilterState {
  search: string;
  status: 'all' | CategoryStatus;
  featureId: 'all' | string;
  categoryId: 'all' | string;
}

export interface CategoryDetailDrawerData {
  type: 'feature' | 'category' | 'subcategory';
  item: Feature | Category | Subcategory;
  parentFeature?: Feature;
  parentCategory?: Category;
  childCategories?: Category[];
  childSubcategories?: Subcategory[];
}

