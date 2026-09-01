/**
 * Category Fallback Service
 */

import {
  Feature,
  Category,
  Subcategory,
  FeatureTreeNode,
  CategoryFilterState,
  CategoryStatus,
} from '@/types/Category';
import { mockCategoryService } from '@/services/mock/categoryService';

export const categoryFallback = {
  getFeatures(): Promise<Feature[]> {
    return mockCategoryService.getFeatures();
  },

  getFeatureById(id: string): Promise<Feature | null> {
    return mockCategoryService.getFeatureById(id);
  },

  getCategories(
    featureId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<Category[]> {
    return mockCategoryService.getCategories(featureId, filters);
  },

  getCategoryById(id: string): Promise<Category | null> {
    return mockCategoryService.getCategoryById(id);
  },

  getSubcategories(
    categoryId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<Subcategory[]> {
    return mockCategoryService.getSubcategories(categoryId, filters);
  },

  getSubcategoryById(id: string): Promise<Subcategory | null> {
    return mockCategoryService.getSubcategoryById(id);
  },

  getCategoryTree(
    featureId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<FeatureTreeNode[]> {
    return mockCategoryService.getCategoryTree(featureId, filters);
  },

  getTaxonomyTree(filters: Partial<CategoryFilterState> = {}): Promise<FeatureTreeNode[]> {
    return mockCategoryService.getCategoryTree(filters.featureId, filters);
  },

  updateFeatureStatus(id: string, status: CategoryStatus): Promise<Feature> {
    return mockCategoryService.updateFeatureStatus(id, status);
  },

  updateCategoryStatus(id: string, status: CategoryStatus): Promise<Category> {
    return mockCategoryService.updateCategoryStatus(id, status);
  },

  updateSubcategoryStatus(id: string, status: CategoryStatus): Promise<Subcategory> {
    return mockCategoryService.updateSubcategoryStatus(id, status);
  },

  getCategoryStats(): Promise<{
    totalFeatures: number;
    totalCategories: number;
    totalSubcategories: number;
    activeCategories: number;
    inactiveCategories: number;
  }> {
    return mockCategoryService.getCategoryStats();
  },
};

export default categoryFallback;


