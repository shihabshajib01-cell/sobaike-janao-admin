/**
 * Map Monitoring API Service Layer
 * UI contract retained for future real geospatial API integration.
 * Currently disconnected until geospatial implementation phase.
 */

import {
  MapComplaint,
  MapFilterState,
  MapSummary,
} from '@/types/Map';

export const MAP_MONITORING_CONNECTED = false;

export class MapFeatureUnavailableError extends Error {
  code = 'FEATURE_NOT_CONNECTED';

  constructor() {
    super('Map monitoring data source is not connected.');
    this.name = 'MapFeatureUnavailableError';
  }
}

export class MapApi {
  /**
   * Get geospatial complaints with optional filters
   */
  async getMapComplaints(_filters: Partial<MapFilterState> = {}): Promise<MapComplaint[]> {
    throw new MapFeatureUnavailableError();
  }

  /**
   * Get map summary statistics
   */
  async getMapSummary(
    _complaintsOrFilters?: MapComplaint[] | Partial<MapFilterState>
  ): Promise<MapSummary> {
    throw new MapFeatureUnavailableError();
  }

  /**
   * Get unique wards and zones for filter dropdowns
   */
  async getAvailableLocations(): Promise<{ wards: string[]; zones: string[] }> {
    throw new MapFeatureUnavailableError();
  }

  /**
   * Get single map complaint by ID
   */
  async getComplaintById(_id: string): Promise<MapComplaint | null> {
    throw new MapFeatureUnavailableError();
  }
}

export const mapApi = new MapApi();
export default mapApi;
