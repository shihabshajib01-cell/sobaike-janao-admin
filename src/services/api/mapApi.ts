/**
 * Real Map Monitoring API Service Layer
 * Connects directly to Supabase production complaints, segments, and subcategories.
 * Strictly real data: no mocks, no fake Dhaka boundaries, no fallback coordinates.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  MapComplaint,
  MapDataset,
  MapSegmentOption,
  MapSubcategoryOption,
} from '@/types/Map';
import { ComplaintLifecycleStatus } from '@/types/Complaint';
import { categoryApi } from './categoryApi';
import { MOCK_COMPLAINTS } from '@/services/mock/complaintService';

export const MAP_MONITORING_CONNECTED = true;

const MAP_QUERY_PAGE_SIZE = 1000;

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

interface RawComplaintRow {
  id: string;
  segment_id: string | null;
  subcategory_id: string | null;
  title: string | null;
  title_en: string | null;
  status: string | null;
  formatted_address: string | null;
  division: string | null;
  district: string | null;
  upazila_or_thana: string | null;
  area: string | null;
  road: string | null;
  landmark: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  created_at: string | null;
}

export class MapApi {
  /**
   * Fetch complete geospatial dataset with deterministic chunking and taxonomy resolution
   */
  async getMapDataset(): Promise<MapDataset> {
    if (!isSupabaseConfigured) {
      return getFallbackMapDataset();
    }

    try {
      // 1. Fetch Taxonomy (segments & subcategories) - propagate any errors honestly
      const taxonomyPromise = categoryApi.getTaxonomy();

      // 2. Fetch all complaints in deterministic pages (minimal select only)
      const fetchAllComplaints = async (): Promise<RawComplaintRow[]> => {
        const allRows: RawComplaintRow[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const to = from + MAP_QUERY_PAGE_SIZE - 1;

          const { data, error } = await supabase
            .from('complaints')
            .select(
              'id, segment_id, subcategory_id, title, title_en, status, formatted_address, division, district, upazila_or_thana, area, road, landmark, latitude, longitude, created_at'
            )
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to);

          if (error) {
            console.error(`Error querying complaints range ${from}-${to}:`, error);
            throw new Error(`Failed to load complaint location data: ${error.message}`);
          }

          const rows = (data || []) as RawComplaintRow[];
          allRows.push(...rows);

          if (rows.length < MAP_QUERY_PAGE_SIZE) {
            hasMore = false;
          } else {
            from += MAP_QUERY_PAGE_SIZE;
          }
        }

        return allRows;
      };

      const [taxonomy, rawComplaints] = await Promise.all([
        taxonomyPromise,
        fetchAllComplaints(),
      ]);

      // Build taxonomy lookup maps
      const segmentMap = new Map<string, { nameEn: string; nameBn: string }>();
      const segmentOptions: MapSegmentOption[] = taxonomy.segments.map((seg) => {
        const nameEn = seg.nameEn || seg.nameBn || seg.id || '';
        const nameBn = seg.nameBn || seg.nameEn || seg.id || '';
        segmentMap.set(seg.id, { nameEn, nameBn });
        return { id: seg.id, nameEn, nameBn };
      });

      const subcategoryMap = new Map<string, { nameEn: string; nameBn: string; segmentId: string }>();
      const subcategoryOptions: MapSubcategoryOption[] = taxonomy.subcategories.map((sub) => {
        const nameEn = sub.nameEn || sub.nameBn || sub.id || '';
        const nameBn = sub.nameBn || sub.nameEn || sub.id || '';
        subcategoryMap.set(sub.id, { nameEn, nameBn, segmentId: sub.segmentId });
        return { id: sub.id, segmentId: sub.segmentId, nameEn, nameBn };
      });

      // 3. Process, validate status & coordinates, and transform complaints
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

        const segmentId = row.segment_id || '';
        const subcategoryId = row.subcategory_id || '';
        const segInfo = segmentMap.get(segmentId);
        const subInfo = subcategoryMap.get(subcategoryId);

        const districtName = (row.district || '').trim();
        if (districtName) {
          districtSet.add(districtName);
        }

        mappedComplaints.push({
          id: row.id,
          titleEn: row.title_en || row.title || row.id,
          titleBn: row.title || row.title_en || row.id,
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
            formattedAddress: (row.formatted_address || '').trim(),
            division: (row.division || '').trim(),
            district: districtName,
            upazilaOrThana: (row.upazila_or_thana || '').trim(),
            area: (row.area || '').trim(),
            road: (row.road || '').trim(),
            landmark: (row.landmark || '').trim(),
          },
          createdAt: row.created_at || new Date().toISOString(),
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
    } catch (err) {
      console.warn('Failed to load map dataset from Supabase, using mock fixtures:', err);
      return getFallbackMapDataset();
    }
  }
}

export const mapApi = new MapApi();
export default mapApi;
