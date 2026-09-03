/**
 * Real Map Monitoring API Service Layer
 * Uses controlled SECURITY DEFINER Map RPC when Supabase is configured,
 * ensuring users with 'map.view' can inspect geospatial monitoring datasets
 * without requiring arbitrary row-level 'complaints.view' table reads.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  MapComplaint,
  MapDataset,
  MapSegmentOption,
  MapSubcategoryOption,
} from '@/types/Map';
import { ComplaintLifecycleStatus } from '@/types/Complaint';
import { MOCK_COMPLAINTS } from '@/services/mock/complaintService';

export const MAP_MONITORING_CONNECTED = true;

const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

function getFallbackMapDataset(): MapDataset {
  const mappedComplaints: MapComplaint[] = MOCK_COMPLAINTS.map((c) => ({
    id: c.id,
    titleEn: c.titleEn,
    titleBn: c.titleBn,
    segmentId: c.categoryId,
    segmentEn: c.categoryEn,
    segmentBn: c.categoryBn,
    subcategoryId: c.subcategoryId,
    subcategoryEn: c.subcategoryEn,
    subcategoryBn: c.subcategoryBn,
    status: c.status,
    latitude: c.location.coordinates[0],
    longitude: c.location.coordinates[1],
    location: {
      formattedAddress: c.location.addressEn,
      division: 'Dhaka',
      district: 'Dhaka',
      upazilaOrThana: c.location.zone,
      area: c.location.ward,
      road: c.location.addressEn,
      landmark: '',
    },
    createdAt: c.createdAt,
  }));

  const segmentSet = new Map<string, MapSegmentOption>();
  const subcategorySet = new Map<string, MapSubcategoryOption>();
  const districtSet = new Set<string>();

  for (const c of mappedComplaints) {
    if (c.segmentId && !segmentSet.has(c.segmentId)) {
      segmentSet.set(c.segmentId, {
        id: c.segmentId,
        nameEn: c.segmentEn,
        nameBn: c.segmentBn,
      });
    }
    if (c.subcategoryId && !subcategorySet.has(c.subcategoryId)) {
      subcategorySet.set(c.subcategoryId, {
        id: c.subcategoryId,
        segmentId: c.segmentId,
        nameEn: c.subcategoryEn,
        nameBn: c.subcategoryBn,
      });
    }
    if (c.location.district) {
      districtSet.add(c.location.district);
    }
  }

  return {
    complaints: mappedComplaints,
    totalSourceCount: mappedComplaints.length,
    unmappedCount: 0,
    unsupportedStatusCount: 0,
    segments: Array.from(segmentSet.values()),
    subcategories: Array.from(subcategorySet.values()),
    districts: Array.from(districtSet).sort((a, b) => a.localeCompare(b)),
  };
}

export class MapApi {
  /**
   * Fetch complete geospatial dataset with controlled RPC and taxonomy resolution
   */
  async getMapDataset(): Promise<MapDataset> {
    if (!isSupabaseConfigured) {
      if (isDev) {
        return getFallbackMapDataset();
      }
      throw new Error('Supabase map service is not configured in this environment.');
    }

    // Call controlled SECURITY DEFINER Map RPC
    const { data, error } = await supabase.rpc('admin_get_map_dataset');

    if (error) {
      console.error('admin_get_map_dataset RPC failed:', error);
      throw new Error(`Failed to load map dataset: ${error.message}`);
    }

    if (!data) {
      throw new Error('No map dataset received from server.');
    }

    const rawSegments = Array.isArray(data.segments) ? data.segments : [];
    const rawSubcategories = Array.isArray(data.subcategories) ? data.subcategories : [];
    const rawComplaints = Array.isArray(data.complaints) ? data.complaints : [];

    // Build taxonomy lookup maps from returned RPC contract
    const segmentMap = new Map<string, { nameEn: string; nameBn: string }>();
    const segmentOptions: MapSegmentOption[] = rawSegments.map((seg: any) => {
      const id = String(seg.id);
      const nameEn = String(seg.name_en || seg.nameEn || seg.name_bn || seg.nameBn || id);
      const nameBn = String(seg.name_bn || seg.nameBn || seg.name_en || seg.nameEn || id);
      segmentMap.set(id, { nameEn, nameBn });
      return { id, nameEn, nameBn };
    });

    const subcategoryMap = new Map<string, { nameEn: string; nameBn: string; segmentId: string }>();
    const subcategoryOptions: MapSubcategoryOption[] = rawSubcategories.map((sub: any) => {
      const id = String(sub.id);
      const segmentId = String(sub.segment_id || sub.segmentId || '');
      const nameEn = String(sub.name_en || sub.nameEn || sub.name_bn || sub.nameBn || id);
      const nameBn = String(sub.name_bn || sub.nameBn || sub.name_en || sub.nameEn || id);
      subcategoryMap.set(id, { nameEn, nameBn, segmentId });
      return { id, segmentId, nameEn, nameBn };
    });

    // Process, validate status & coordinates, and transform complaints
    const mappedComplaints: MapComplaint[] = [];
    const districtSet = new Set<string>();
    let unmappedCount = 0;
    let unsupportedStatusCount = 0;

    const validStatuses: ComplaintLifecycleStatus[] = [
      'submitted',
      'published',
      'unpublished',
      'rejected',
      'edited',
    ];

    for (const row of rawComplaints) {
      // 1. Only include complaints with supported Admin status
      if (!row.status || !validStatuses.includes(row.status as ComplaintLifecycleStatus)) {
        unsupportedStatusCount++;
        continue;
      }
      const status = row.status as ComplaintLifecycleStatus;

      // 2. Validate coordinates among supported-status records
      const rawLat = row.latitude;
      const rawLng = row.longitude;

      const latNum = rawLat !== null && rawLat !== undefined && rawLat !== '' ? Number(rawLat) : NaN;
      const lngNum = rawLng !== null && rawLng !== undefined && rawLng !== '' ? Number(rawLng) : NaN;

      const isValidCoord =
        Number.isFinite(latNum) &&
        Number.isFinite(lngNum) &&
        latNum >= -90 &&
        latNum <= 90 &&
        lngNum >= -180 &&
        lngNum <= 180 &&
        !(latNum === 0 && lngNum === 0); // Exclude 0,0 null-island coordinates if any

      if (!isValidCoord) {
        unmappedCount++;
        continue;
      }

      const segmentId = String(row.segment_id || row.segmentId || '');
      const subcategoryId = String(row.subcategory_id || row.subcategoryId || '');
      const segInfo = segmentMap.get(segmentId);
      const subInfo = subcategoryMap.get(subcategoryId);

      const districtName = String(row.district || '').trim();
      if (districtName) {
        districtSet.add(districtName);
      }

      mappedComplaints.push({
        id: String(row.id),
        titleEn: String(row.title_en || row.titleEn || row.title || row.id),
        titleBn: String(row.title || row.titleBn || row.title_en || row.titleEn || row.id),
        segmentId,
        segmentEn: segInfo?.nameEn || segInfo?.nameBn || segmentId || '',
        segmentBn: segInfo?.nameBn || segInfo?.nameEn || segmentId || '',
        subcategoryId,
        subcategoryEn: subInfo?.nameEn || subInfo?.nameBn || subcategoryId || '',
        subcategoryBn: subInfo?.nameBn || subInfo?.nameEn || subcategoryId || '',
        status,
        latitude: latNum,
        longitude: lngNum,
        location: {
          formattedAddress: String(row.formatted_address || row.formattedAddress || '').trim(),
          division: String(row.division || '').trim(),
          district: districtName,
          upazilaOrThana: String(row.upazila_or_thana || row.upazilaOrThana || '').trim(),
          area: String(row.area || '').trim(),
          road: String(row.road || '').trim(),
          landmark: String(row.landmark || '').trim(),
        },
        createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
      });
    }

    const districts = Array.from(districtSet).sort((a, b) => a.localeCompare(b));

    return {
      complaints: mappedComplaints,
      totalSourceCount: rawComplaints.length,
      unmappedCount,
      unsupportedStatusCount,
      segments: segmentOptions,
      subcategories: subcategoryOptions,
      districts,
    };
  }
}

export const mapApi = new MapApi();
export default mapApi;
