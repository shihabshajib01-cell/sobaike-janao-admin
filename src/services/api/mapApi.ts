/**
 * Map Monitoring API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import {
  MapComplaint,
  MapFilterState,
  MapSummary,
} from '@/types/Map';
import { mapFallback } from '@/services/fallback/mapFallback';

export class MapApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get geospatial complaints with optional filters
   */
  async getMapComplaints(filters: Partial<MapFilterState> = {}): Promise<MapComplaint[]> {
    try {
      const response = await this.client.get<MapComplaint[]>('/map/complaints', {
        params: {
          status: filters.status,
          category: filters.category,
          subcategory: filters.subcategory,
          ward: filters.ward,
          zone: filters.zone,
          searchQuery: filters.searchQuery,
          dateRange: filters.dateRange,
        },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return mapFallback.getMapComplaints(filters);
  }

  /**
   * Get map summary statistics
   */
  async getMapSummary(
    complaintsOrFilters?: MapComplaint[] | Partial<MapFilterState>
  ): Promise<MapSummary> {
    if (Array.isArray(complaintsOrFilters)) {
      return mapFallback.getMapSummary(complaintsOrFilters);
    }
    try {
      const response = await this.client.get<MapSummary>('/map/summary', {
        params: complaintsOrFilters,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return mapFallback.getMapSummary(complaintsOrFilters);
  }

  /**
   * Get unique wards and zones for filter dropdowns
   */
  async getAvailableLocations(): Promise<{ wards: string[]; zones: string[] }> {
    try {
      const response = await this.client.get<{ wards: string[]; zones: string[] }>('/map/locations');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return mapFallback.getAvailableLocations();
  }

  /**
   * Get single map complaint by ID
   */
  async getComplaintById(id: string): Promise<MapComplaint | null> {
    try {
      const response = await this.client.get<MapComplaint>(`/map/complaints/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return mapFallback.getComplaintById(id);
  }
}

export const mapApi = new MapApi();
export default mapApi;

