/**
 * Map Monitoring Mock Service
 * Provides geospatial complaint data, filtered views, and summary statistics.
 * Uses complaint location data only for demo mapping.
 * API-ready service for future REST/gRPC backend integration.
 */

import { MapComplaint, MapFilterState, MapSummary, MapCategoryReportCount, MapWardCount } from '@/types/Map';
import { MOCK_COMPLAINTS } from './complaintService';

export class MapService {
  /**
   * Helper to convert Complaint into MapComplaint with verified coordinates (Demo map data)
   */
  private mapToMapComplaint(complaint: typeof MOCK_COMPLAINTS[0]): MapComplaint | null {
    const coords = complaint.location?.coordinates;
    if (!coords || coords.length < 2) return null;
    const [lat, lng] = coords;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return null;
    }

    return {
      id: complaint.id,
      titleEn: complaint.titleEn,
      titleBn: complaint.titleBn,
      descriptionEn: complaint.descriptionEn,
      descriptionBn: complaint.descriptionBn,
      categoryId: complaint.categoryId,
      categoryEn: complaint.categoryEn,
      categoryBn: complaint.categoryBn,
      subcategoryId: complaint.subcategoryId,
      subcategoryEn: complaint.subcategoryEn,
      subcategoryBn: complaint.subcategoryBn,
      status: complaint.status,
      location: complaint.location,
      latitude: lat,
      longitude: lng,
      createdAt: complaint.createdAt,
    };
  }

  /**
   * Fetch all map complaints with optional filters
   */
  async getMapComplaints(filters: Partial<MapFilterState> = {}): Promise<MapComplaint[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    const mapComplaints = MOCK_COMPLAINTS
      .map((c) => this.mapToMapComplaint(c))
      .filter((c): c is MapComplaint => c !== null);

    let filtered = [...mapComplaints];

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter((c) => c.categoryId === filters.category);
    }

    // Subcategory filter
    if (filters.subcategory && filters.subcategory !== 'all') {
      filtered = filtered.filter((c) => c.subcategoryId === filters.subcategory);
    }

    // Ward filter
    if (filters.ward && filters.ward !== 'all') {
      filtered = filtered.filter((c) => c.location.ward === filters.ward);
    }

    // Zone filter
    if (filters.zone && filters.zone !== 'all') {
      filtered = filtered.filter((c) => c.location.zone === filters.zone);
    }

    // Search query filter (ID, Title, Address, Subcategory)
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.titleEn.toLowerCase().includes(q) ||
          c.titleBn.toLowerCase().includes(q) ||
          c.location.addressEn.toLowerCase().includes(q) ||
          c.location.addressBn.toLowerCase().includes(q) ||
          c.location.ward.toLowerCase().includes(q) ||
          c.categoryEn.toLowerCase().includes(q) ||
          c.categoryBn.toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date('2026-08-28T10:00:00Z').getTime();
      if (filters.dateRange === 'today') {
        const oneDay = 24 * 60 * 60 * 1000;
        filtered = filtered.filter((c) => now - new Date(c.createdAt).getTime() <= oneDay);
      } else if (filters.dateRange === 'week') {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter((c) => now - new Date(c.createdAt).getTime() <= sevenDays);
      } else if (filters.dateRange === 'month') {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter((c) => now - new Date(c.createdAt).getTime() <= thirtyDays);
      }
    }

    return filtered;
  }

  /**
   * Compute aggregate summary statistics from a list of map complaints
   */
  async getMapSummary(complaintsList?: MapComplaint[]): Promise<MapSummary> {
    const list = complaintsList || (await this.getMapComplaints());

    // Unique location coordinates count
    const uniqueLocations = new Set(list.map((c) => `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`));

    // Active complaints (submitted, published, edited)
    const activeComplaints = list.filter(
      (c) => c.status !== 'rejected'
    ).length;

    // Resolved / Published count
    const resolvedComplaints = list.filter((c) => c.status === 'published').length;

    // Most reported category calculation
    const categoryCounts: Record<string, { nameEn: string; nameBn: string; count: number }> = {};
    list.forEach((c) => {
      if (!categoryCounts[c.categoryId]) {
        categoryCounts[c.categoryId] = {
          nameEn: c.categoryEn,
          nameBn: c.categoryBn,
          count: 0,
        };
      }
      categoryCounts[c.categoryId].count++;
    });

    let mostReportedCategory: MapCategoryReportCount | null = null;
    let maxCatCount = 0;
    Object.entries(categoryCounts).forEach(([catId, data]) => {
      if (data.count > maxCatCount) {
        maxCatCount = data.count;
        mostReportedCategory = {
          id: catId,
          nameEn: data.nameEn,
          nameBn: data.nameBn,
          count: data.count,
        };
      }
    });

    // Ward breakdown
    const wardMap: Record<string, { zone: string; count: number }> = {};
    list.forEach((c) => {
      const wardKey = c.location.ward;
      if (!wardMap[wardKey]) {
        wardMap[wardKey] = {
          zone: c.location.zone,
          count: 0,
        };
      }
      wardMap[wardKey].count++;
    });

    const wardBreakdown: MapWardCount[] = Object.entries(wardMap)
      .map(([ward, val]) => ({
        ward,
        zone: val.zone,
        count: val.count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalLocations: uniqueLocations.size,
      totalComplaints: list.length,
      activeComplaints,
      resolvedComplaints,
      mostReportedCategory,
      wardBreakdown,
    };
  }

  /**
   * Get unique wards and zones for filter dropdowns
   */
  async getAvailableLocations(): Promise<{ wards: string[]; zones: string[] }> {
    const all = await this.getMapComplaints();
    const wards = Array.from(new Set(all.map((c) => c.location.ward).filter(Boolean))).sort();
    const zones = Array.from(new Set(all.map((c) => c.location.zone).filter(Boolean))).sort();
    return { wards, zones };
  }

  /**
   * Get single map complaint by ID
   */
  async getComplaintById(id: string): Promise<MapComplaint | null> {
    const all = await this.getMapComplaints();
    return all.find((c) => c.id.toLowerCase() === id.toLowerCase()) || null;
  }
}

export const mockMapService = new MapService();
export default mockMapService;
