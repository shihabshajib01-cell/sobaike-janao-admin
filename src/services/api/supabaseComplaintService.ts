/**
 * Supabase Complaint Service
 * Direct queries to public.complaints, public.segments, public.subcategories, and public.complaint_updates.
 * Real Supabase read-only operations for Sobaike Admin.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Complaint,
  ComplaintFilterState,
  ComplaintLifecycleStatus,
  ComplaintListResponse,
  ComplaintStatusTabCount,
  ComplaintTimelineEvent,
  ComplaintUrgency,
  TimelineEventType,
} from '@/types/Complaint';

export interface SupabaseSegment {
  id: string;
  name_en: string;
  name_bn: string;
  active?: boolean;
  sort_order?: number;
}

export interface SupabaseSubcategory {
  id: string;
  segment_id: string;
  name_en: string;
  name_bn: string;
  active?: boolean;
  sort_order?: number;
}

export interface SupabaseComplaintRow {
  id: string;
  segment_id: string | null;
  subcategory_id: string | null;
  title: string | null;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  incident_date: string | null;
  incident_time: string | null;
  frequency: string | null;
  status: string | null;
  priority: string | null;
  privacy_choice: string | null;
  reporter_name: string | null;
  reporter_contact: string | null;
  confirm_public_identity: boolean | null;
  relationship_context: string | null;
  intimate_what_happened: string | null;
  intimate_platform: string | null;
  division: string | null;
  district: string | null;
  upazila_or_thana: string | null;
  area: string | null;
  road: string | null;
  landmark: string | null;
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  has_supporting_info: boolean | null;
  evidence_types: string[] | null;
  evidence_description: string | null;
  publication_preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

export interface SupabaseComplaintUpdateRow {
  id: string;
  complaint_id: string;
  update_type: string;
  note: string | null;
  is_public: boolean | null;
  created_at: string;
}

// In-memory cache for taxonomy to avoid repeated requests
let cachedSegments: SupabaseSegment[] | null = null;
let cachedSubcategories: SupabaseSubcategory[] | null = null;
let taxonomyFetchPromise: Promise<{
  segments: SupabaseSegment[];
  subcategories: SupabaseSubcategory[];
}> | null = null;

const VALID_STATUSES: ComplaintLifecycleStatus[] = [
  'submitted',
  'published',
  'rejected',
  'edited',
];

/**
 * Fetch and cache taxonomy segments & subcategories
 */
export async function getTaxonomy(): Promise<{
  segments: SupabaseSegment[];
  subcategories: SupabaseSubcategory[];
}> {
  if (cachedSegments && cachedSubcategories) {
    return { segments: cachedSegments, subcategories: cachedSubcategories };
  }

  if (taxonomyFetchPromise) {
    return taxonomyFetchPromise;
  }

  taxonomyFetchPromise = (async () => {
    try {
      const [segRes, subRes] = await Promise.all([
        supabase
          .from('segments')
          .select('id, name_en, name_bn, active, sort_order')
          .order('sort_order', { ascending: true }),
        supabase
          .from('subcategories')
          .select('id, segment_id, name_en, name_bn, active, sort_order')
          .order('sort_order', { ascending: true }),
      ]);

      if (segRes.error) {
        console.warn('Error loading segments:', segRes.error.message);
      }
      if (subRes.error) {
        console.warn('Error loading subcategories:', subRes.error.message);
      }

      cachedSegments = segRes.data || [];
      cachedSubcategories = subRes.data || [];

      return {
        segments: cachedSegments,
        subcategories: cachedSubcategories,
      };
    } finally {
      taxonomyFetchPromise = null;
    }
  })();

  return taxonomyFetchPromise;
}

/**
 * Get category options for filtering
 */
export async function getTaxonomySegments(): Promise<SupabaseSegment[]> {
  const { segments } = await getTaxonomy();
  return segments.filter((s) => s.active !== false);
}

/**
 * Get distinct district locations from complaints
 */
export async function getDistinctLocations(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('district')
      .not('district', 'is', null)
      .neq('district', '')
      .limit(500);

    if (error) {
      console.warn('Error loading distinct districts:', error.message);
      return [];
    }

    const uniqueDistricts = Array.from(
      new Set(
        (data || [])
          .map((d: { district: string | null }) => d.district?.trim())
          .filter((d): d is string => Boolean(d))
      )
    ).sort((a, b) => a.localeCompare(b));

    return uniqueDistricts;
  } catch (err) {
    console.warn('Failed to get distinct locations:', err);
    return [];
  }
}

/**
 * Map raw Supabase row to domain Complaint model
 */
export function mapSupabaseRowToComplaint(
  row: SupabaseComplaintRow,
  segmentsMap: Map<string, SupabaseSegment>,
  subcategoriesMap: Map<string, SupabaseSubcategory>
): Complaint {
  const segment = row.segment_id ? segmentsMap.get(row.segment_id) : undefined;
  const subcategory = row.subcategory_id
    ? subcategoriesMap.get(row.subcategory_id)
    : undefined;

  // Title mapping
  const titleBn = row.title?.trim() || row.title_en?.trim() || row.id;
  const titleEn = row.title_en?.trim() || row.title?.trim() || row.id;

  // Description mapping
  const descriptionBn = row.description?.trim() || row.description_en?.trim() || '';
  const descriptionEn = row.description_en?.trim() || row.description?.trim() || '';

  // Taxonomy mapping
  const categoryId = row.segment_id || '';
  const categoryEn = segment?.name_en || row.segment_id || '';
  const categoryBn = segment?.name_bn || row.segment_id || '';

  const subcategoryId = row.subcategory_id || '';
  const subcategoryEn = subcategory?.name_en || row.subcategory_id || '';
  const subcategoryBn = subcategory?.name_bn || row.subcategory_id || '';

  // Urgency mapping
  let urgency: ComplaintUrgency = 'medium';
  if (row.priority) {
    const p = row.priority.toLowerCase();
    if (p === 'urgent' || p === 'high' || p === 'medium' || p === 'low') {
      urgency = p;
    }
  }

  // Lifecycle Status mapping
  const rawStatus = (row.status || 'submitted').toLowerCase();
  const status: ComplaintLifecycleStatus = VALID_STATUSES.includes(
    rawStatus as ComplaintLifecycleStatus
  )
    ? (rawStatus as ComplaintLifecycleStatus)
    : 'submitted';

  // Privacy & Citizen Details
  const isAnonymous = row.privacy_choice === 'anonymous';
  const citizenName = row.reporter_name?.trim() || undefined;

  // Check if reporter_contact looks like a phone number
  let citizenPhone: string | undefined = undefined;
  if (row.reporter_contact) {
    const contact = row.reporter_contact.trim();
    if (!contact.includes('@') && /[0-9+]/.test(contact)) {
      citizenPhone = contact;
    }
  }

  // Location mapping
  const addressFromParts = [
    row.area,
    row.upazila_or_thana,
    row.district,
    row.division,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ');

  const primaryAddress = row.formatted_address?.trim() || addressFromParts || '';

  const hasValidLat =
    row.latitude !== null &&
    row.latitude !== undefined &&
    !isNaN(Number(row.latitude));
  const hasValidLng =
    row.longitude !== null &&
    row.longitude !== undefined &&
    !isNaN(Number(row.longitude));

  const coordinates: [number, number] | undefined =
    hasValidLat && hasValidLng
      ? [Number(row.latitude), Number(row.longitude)]
      : undefined;

  const location = {
    addressEn: primaryAddress,
    addressBn: primaryAddress,
    ward: row.upazila_or_thana?.trim() || row.area?.trim() || '',
    zone: row.district?.trim() || row.division?.trim() || '',
    coordinates,
  };

  const createdAt = row.created_at || new Date().toISOString();
  const updatedAt = row.updated_at || row.created_at || createdAt;

  return {
    id: row.id,
    titleEn,
    titleBn,
    descriptionEn,
    descriptionBn,
    categoryId,
    categoryEn,
    categoryBn,
    subcategoryId,
    subcategoryEn,
    subcategoryBn,
    location,
    media: [],
    status,
    urgency,
    citizenName,
    citizenPhone,
    isAnonymous,
    upvotesCount: 0,
    commentsCount: 0,
    createdAt,
    updatedAt,
  };
}

/**
 * Map raw updates rows to ComplaintTimelineEvent[]
 */
export function mapComplaintUpdatesToTimeline(
  complaint: Complaint,
  updates: SupabaseComplaintUpdateRow[]
): ComplaintTimelineEvent[] {
  if (!updates || updates.length === 0) {
    // Generate initial registered event
    return [
      {
        id: `${complaint.id}-init`,
        complaintId: complaint.id,
        type: 'submitted',
        actorName: 'System',
        actorRole: 'Platform',
        timestamp: complaint.createdAt,
        titleEn: 'Complaint Submitted',
        titleBn: 'অভিযোগ দাখিল করা হয়েছে',
        descriptionEn: 'Complaint registered in the platform',
        descriptionBn: 'প্ল্যাটফর্মে অভিযোগ নিবন্ধিত হয়েছে',
        toStatus: 'submitted',
      },
    ];
  }

  return updates.map((u) => {
    const rawType = (u.update_type || '').toLowerCase();
    let type: TimelineEventType = 'official_update';
    let titleEn = 'Official Update';
    let titleBn = 'অফিসিয়াল আপডেট';
    let toStatus: ComplaintLifecycleStatus | undefined = undefined;

    if (rawType === 'submitted') {
      type = 'submitted';
      titleEn = 'Complaint Submitted';
      titleBn = 'অভিযোগ দাখিল করা হয়েছে';
      toStatus = 'submitted';
    } else if (rawType === 'published') {
      type = 'status_change';
      titleEn = 'Complaint Approved & Published';
      titleBn = 'অভিযোগ অনুমোদিত ও প্রকাশিত';
      toStatus = 'published';
    } else if (rawType === 'rejected') {
      type = 'status_change';
      titleEn = 'Complaint Rejected';
      titleBn = 'অভিযোগ বাতিল করা হয়েছে';
      toStatus = 'rejected';
    } else if (rawType === 'edited') {
      type = 'status_change';
      titleEn = 'Complaint Edited';
      titleBn = 'অভিযোগ সম্পাদন করা হয়েছে';
      toStatus = 'edited';
    } else if (rawType === 'assigned') {
      type = 'assigned';
      titleEn = 'Complaint Assigned';
      titleBn = 'অভিযোগ নির্ধারিত করা হয়েছে';
    } else if (rawType === 'info_requested') {
      type = 'info_requested';
      titleEn = 'Additional Information Requested';
      titleBn = 'অতিরিক্ত তথ্য চাওয়া হয়েছে';
    } else if (rawType === 'resolved') {
      type = 'resolved';
      titleEn = 'Complaint Resolved';
      titleBn = 'অভিযোগ নিষ্পত্তি হয়েছে';
    }

    return {
      id: u.id,
      complaintId: u.complaint_id,
      type,
      actorName: 'System',
      actorRole: 'Platform',
      timestamp: u.created_at,
      titleEn,
      titleBn,
      descriptionEn: u.note || '',
      descriptionBn: u.note || '',
      toStatus,
    };
  });
}

/**
 * Supabase Complaint Service Implementation
 */
export const supabaseComplaintService = {
  /**
   * Fetch paginated and filtered complaints from public.complaints
   */
  async getComplaints(
    filters: Partial<ComplaintFilterState> = {},
    page = 1,
    pageSize = 6
  ): Promise<ComplaintListResponse> {
    const { segments, subcategories } = await getTaxonomy();
    const segmentsMap = new Map(segments.map((s) => [s.id, s]));
    const subcategoriesMap = new Map(subcategories.map((s) => [s.id, s]));

    let query = supabase
      .from('complaints')
      .select('*', { count: 'exact' })
      .in('status', VALID_STATUSES);

    // Filter by Status
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Filter by Category (segment_id)
    if (filters.category && filters.category !== 'all') {
      query = query.eq('segment_id', filters.category);
    }

    // Filter by Location (district)
    if (filters.location && filters.location !== 'all') {
      query = query.eq('district', filters.location);
    }

    // Filter by Date Range
    if (filters.dateRange === 'today') {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', past24h);
    } else if (filters.dateRange === 'week') {
      const past7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', past7d);
    } else if (filters.dateRange === 'month') {
      const past30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', past30d);
    }

    // Filter by Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const rawTerm = filters.searchQuery.trim();
      const sanitized = rawTerm.replace(/[,%_()]/g, ' ').trim();
      if (sanitized) {
        query = query.or(
          `id.ilike.%${sanitized}%,title.ilike.%${sanitized}%,title_en.ilike.%${sanitized}%,description.ilike.%${sanitized}%,description_en.ilike.%${sanitized}%,district.ilike.%${sanitized}%,upazila_or_thana.ilike.%${sanitized}%,area.ilike.%${sanitized}%`
        );
      }
    }

    // Sort descending by creation date and apply pagination range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error getComplaints:', error);
      throw new Error(`Failed to load complaints: ${error.message}`);
    }

    const items = (data || []).map((row) =>
      mapSupabaseRowToComplaint(
        row as SupabaseComplaintRow,
        segmentsMap,
        subcategoriesMap
      )
    );

    // Fetch live status counts for tabs
    const statusCounts = await this.getComplaintStats();

    const totalItems = count ?? items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      items,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
      },
      statusCounts,
    };
  },

  /**
   * Fetch lifecycle status counts for the status tabs
   */
  async getComplaintStats(): Promise<ComplaintStatusTabCount[]> {
    try {
      const [allRes, submittedRes, publishedRes, rejectedRes, editedRes] =
        await Promise.all([
          supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .in('status', VALID_STATUSES),
          supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'submitted'),
          supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published'),
          supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'rejected'),
          supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'edited'),
        ]);

      if (allRes.error) throw allRes.error;

      return [
        {
          status: 'all',
          labelEn: 'All Complaints',
          labelBn: 'সকল অভিযোগ',
          count: allRes.count ?? 0,
          badgeStatus: 'default',
        },
        {
          status: 'submitted',
          labelEn: 'Submitted',
          labelBn: 'দাখিলকৃত',
          count: submittedRes.count ?? 0,
          badgeStatus: 'pending',
        },
        {
          status: 'published',
          labelEn: 'Published',
          labelBn: 'প্রকাশিত',
          count: publishedRes.count ?? 0,
          badgeStatus: 'published',
        },
        {
          status: 'rejected',
          labelEn: 'Rejected',
          labelBn: 'বাতিলকৃত',
          count: rejectedRes.count ?? 0,
          badgeStatus: 'rejected',
        },
        {
          status: 'edited',
          labelEn: 'Edited',
          labelBn: 'সম্পাদিত',
          count: editedRes.count ?? 0,
          badgeStatus: 'info',
        },
      ];
    } catch (err) {
      console.error('Failed to get complaint stats from Supabase:', err);
      throw err;
    }
  },

  /**
   * Fetch single complaint by ID
   */
  async getComplaintById(id: string): Promise<Complaint | null> {
    const { segments, subcategories } = await getTaxonomy();
    const segmentsMap = new Map(segments.map((s) => [s.id, s]));
    const subcategoriesMap = new Map(subcategories.map((s) => [s.id, s]));

    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error loading complaint ${id}:`, error);
      throw new Error(`Failed to load complaint ${id}: ${error.message}`);
    }

    if (!data) return null;

    return mapSupabaseRowToComplaint(
      data as SupabaseComplaintRow,
      segmentsMap,
      subcategoriesMap
    );
  },

  /**
   * Fetch complaint updates / timeline events
   */
  async getComplaintTimeline(id: string): Promise<ComplaintTimelineEvent[]> {
    const complaint = await this.getComplaintById(id);
    if (!complaint) return [];

    const { data, error } = await supabase
      .from('complaint_updates')
      .select('*')
      .eq('complaint_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn(`Error loading timeline for complaint ${id}:`, error.message);
      // Fallback to initial submitted event if updates table query fails
      return mapComplaintUpdatesToTimeline(complaint, []);
    }

    return mapComplaintUpdatesToTimeline(
      complaint,
      (data || []) as SupabaseComplaintUpdateRow[]
    );
  },

  /**
   * Fetch complaint detail and timeline bundle
   */
  async getComplaintDetail(
    id: string
  ): Promise<{ complaint: Complaint; timeline: ComplaintTimelineEvent[] } | null> {
    const complaint = await this.getComplaintById(id);
    if (!complaint) return null;

    const timeline = await this.getComplaintTimeline(id);
    return { complaint, timeline };
  },
};
