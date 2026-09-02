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

export const MAP_MONITORING_CONNECTED = true;

const MAP_QUERY_PAGE_SIZE = 1000;

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
   * Verify Supabase client readiness
   */
  private checkConfig() {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
  }

  /**
   * Fetch complete geospatial dataset with deterministic chunking and taxonomy resolution
   */
  async getMapDataset(): Promise<MapDataset> {
    this.checkConfig();

    // 1. Fetch Taxonomy (segments & subcategories)
    const taxonomyPromise = categoryApi.getTaxonomy().catch((err) => {
      console.warn('Failed to fetch taxonomy via categoryApi:', err);
      return { segments: [], subcategories: [] };
    });

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
      const nameEn = seg.nameEn || seg.nameBn || seg.id;
      const nameBn = seg.nameBn || seg.nameEn || seg.id;
      segmentMap.set(seg.id, { nameEn, nameBn });
      return { id: seg.id, nameEn, nameBn };
    });

    const subcategoryMap = new Map<string, { nameEn: string; nameBn: string; segmentId: string }>();
    const subcategoryOptions: MapSubcategoryOption[] = taxonomy.subcategories.map((sub) => {
      const nameEn = sub.nameEn || sub.nameBn || sub.id;
      const nameBn = sub.nameBn || sub.nameEn || sub.id;
      subcategoryMap.set(sub.id, { nameEn, nameBn, segmentId: sub.segmentId });
      return { id: sub.id, segmentId: sub.segmentId, nameEn, nameBn };
    });

    // 3. Process, validate coordinates, and transform complaints
    const mappedComplaints: MapComplaint[] = [];
    const districtSet = new Set<string>();
    let unmappedCount = 0;

    for (const row of rawComplaints) {
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

      // Map verified status
      const validStatuses: ComplaintLifecycleStatus[] = [
        'submitted',
        'published',
        'unpublished',
        'rejected',
        'edited',
      ];
      const status: ComplaintLifecycleStatus = validStatuses.includes(
        row.status as ComplaintLifecycleStatus
      )
        ? (row.status as ComplaintLifecycleStatus)
        : 'submitted';

      mappedComplaints.push({
        id: row.id,
        titleEn: row.title_en || row.title || row.id,
        titleBn: row.title || row.title_en || row.id,
        segmentId,
        segmentEn: segInfo?.nameEn || (segmentId ? segmentId : 'General'),
        segmentBn: segInfo?.nameBn || (segmentId ? segmentId : 'সাধারণ'),
        subcategoryId,
        subcategoryEn: subInfo?.nameEn || (subcategoryId ? subcategoryId : 'General'),
        subcategoryBn: subInfo?.nameBn || (subcategoryId ? subcategoryId : 'সাধারণ'),
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
      segments: segmentOptions,
      subcategories: subcategoryOptions,
      districts,
    };
  }
}

export const mapApi = new MapApi();
export default mapApi;
