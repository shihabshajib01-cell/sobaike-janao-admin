/**
 * Category Management API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import {
  Feature,
  Category,
  Subcategory,
  FeatureTreeNode,
  CategoryFilterState,
  CategoryStatus,
} from '@/types/Category';
import { categoryFallback } from '@/services/fallback/categoryFallback';

export class CategoryApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get all top-level features
   */
  async getFeatures(): Promise<Feature[]> {
    try {
      const response = await this.client.get<Feature[]>('/categories/features');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return categoryFallback.getFeatures();
  }

  /**
   * Get categories, optionally filtered by feature and search/status filters
   */
  async getCategories(
    featureId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<Category[]> {
    try {
      const response = await this.client.get<Category[]>('/categories', {
        params: {
          featureId: featureId === 'all' ? undefined : featureId,
          search: filters?.search,
          status: filters?.status === 'all' ? undefined : filters?.status,
        },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return categoryFallback.getCategories(featureId, filters);
  }

  /**
   * Get subcategories, optionally filtered by category and search/status filters
   */
  async getSubcategories(
    categoryId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<Subcategory[]> {
    try {
      const response = await this.client.get<Subcategory[]>('/categories/subcategories', {
        params: {
          categoryId: categoryId === 'all' ? undefined : categoryId,
          featureId: filters?.featureId === 'all' ? undefined : filters?.featureId,
          search: filters?.search,
          status: filters?.status === 'all' ? undefined : filters?.status,
        },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return categoryFallback.getSubcategories(categoryId, filters);
  }

  /**
   * Get complete hierarchical category taxonomy tree
   */
  async getCategoryTree(
    featureId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<FeatureTreeNode[]> {
    try {
      const response = await this.client.get<FeatureTreeNode[]>('/categories/tree', {
        params: {
          featureId: featureId === 'all' ? undefined : featureId,
          search: filters?.search,
          status: filters?.status === 'all' ? undefined : filters?.status,
        },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return categoryFallback.getCategoryTree(featureId, filters);
  }

  /**
   * Alias for getCategoryTree
   */
  async getTaxonomyTree(filters: Partial<CategoryFilterState> = {}): Promise<FeatureTreeNode[]> {
    return this.getCategoryTree(filters.featureId, filters);
  }

  /**
   * Update feature status
   */
  async updateFeatureStatus(id: string, status: CategoryStatus): Promise<Feature> {
    try {
      const response = await this.client.patch<Feature>(`/categories/features/${id}/status`, {
        status,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return categoryFallback.updateFeatureStatus(id, status);
  }

  /**
   * Update category status
   */
  async updateCategoryStatus(id: string, status: CategoryStatus): Promise<Category> {
    try {
      const response = await this.client.patch<Category>(`/categories/${id}/status`, {
        status,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return categoryFallback.updateCategoryStatus(id, status);
  }

  /**
   * Update subcategory status
   */
  async updateSubcategoryStatus(id: string, status: CategoryStatus): Promise<Subcategory> {
    try {
      const response = await this.client.patch<Subcategory>(`/categories/subcategories/${id}/status`, {
        status,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return categoryFallback.updateSubcategoryStatus(id, status);
  }

  /**
   * Get taxonomy overview stats
   */
  async getCategoryStats(): Promise<{
    totalFeatures: number;
    totalCategories: number;
    totalSubcategories: number;
    activeCategories: number;
    inactiveCategories: number;
  }> {
    try {
      const response = await this.client.get<{
        totalFeatures: number;
        totalCategories: number;
        totalSubcategories: number;
        activeCategories: number;
        inactiveCategories: number;
      }>('/categories/stats');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return categoryFallback.getCategoryStats();
  }
}

export const categoryApi = new CategoryApi();
export default categoryApi;

