/**
 * Map Fallback Service
 */

import {
  MapComplaint,
  MapFilterState,
  MapSummary,
} from '@/types/Map';
import { mockMapService } from '@/services/mock/mapService';

export const mapFallback = {
  getMapComplaints(filters: Partial<MapFilterState> = {}): Promise<MapComplaint[]> {
    return mockMapService.getMapComplaints(filters);
  },

  getMapSummary(complaintsOrFilters?: MapComplaint[] | Partial<MapFilterState>): Promise<MapSummary> {
    if (Array.isArray(complaintsOrFilters)) {
      return mockMapService.getMapSummary(complaintsOrFilters);
    }
    return mockMapService.getMapComplaints(complaintsOrFilters).then((res) => mockMapService.getMapSummary(res));
  },

  getAvailableLocations(): Promise<{ wards: string[]; zones: string[] }> {
    return mockMapService.getAvailableLocations();
  },

  getComplaintById(id: string): Promise<MapComplaint | null> {
    return mockMapService.getComplaintById(id);
  },
};

export default mapFallback;
