import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  PublicVisitSession,
  LocationActivityFilters,
  LocationActivityStats,
  LocationActivityResponse,
} from '@/types/LocationActivity';

const DEV_MOCK_SESSIONS: PublicVisitSession[] = [
  {
    id: 'pvs_101',
    visitor_id: 'vis_df83a9',
    session_id: 'sess_991823',
    permission_status: 'granted',
    latitude: 23.8103,
    longitude: 90.4125,
    accuracy_meters: 15,
    browser_name: 'Chrome Mobile',
    browser_version: '128.0',
    os_name: 'Android 14',
    device_category: 'Mobile',
    platform: 'Linux armv8l',
    language: 'en-US,bn-BD',
    timezone: 'Asia/Dhaka',
    screen_width: 390,
    screen_height: 844,
    user_agent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B)',
    consented_at: '2026-09-02T08:30:00Z',
    first_seen_at: '2026-09-02T08:30:00Z',
    last_seen_at: '2026-09-02T09:15:00Z',
    location_updated_at: '2026-09-02T09:15:00Z',
    created_at: '2026-09-02T08:30:00Z',
  },
  {
    id: 'pvs_102',
    visitor_id: 'vis_aa44bc',
    session_id: 'sess_991824',
    permission_status: 'prompt',
    latitude: null,
    longitude: null,
    accuracy_meters: null,
    browser_name: 'Chrome',
    browser_version: '127.0',
    os_name: 'Windows 11',
    device_category: 'Desktop',
    platform: 'Win32',
    language: 'en-US',
    timezone: 'Asia/Dhaka',
    screen_width: 1920,
    screen_height: 1080,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    consented_at: null,
    first_seen_at: '2026-09-02T08:45:00Z',
    last_seen_at: '2026-09-02T09:20:00Z',
    location_updated_at: null,
    created_at: '2026-09-02T08:45:00Z',
  },
  {
    id: 'pvs_103',
    visitor_id: 'vis_bb77ef',
    session_id: 'sess_991825',
    permission_status: 'denied',
    latitude: null,
    longitude: null,
    accuracy_meters: null,
    browser_name: 'Safari',
    browser_version: '18.0',
    os_name: 'iOS 18.0',
    device_category: 'Mobile',
    platform: 'iPhone',
    language: 'bn-BD',
    timezone: 'Asia/Dhaka',
    screen_width: 430,
    screen_height: 932,
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    consented_at: null,
    first_seen_at: '2026-09-02T07:10:00Z',
    last_seen_at: '2026-09-02T08:50:00Z',
    location_updated_at: null,
    created_at: '2026-09-02T07:10:00Z',
  },
];

const DEV_MOCK_STATS: LocationActivityStats = {
  totalSessions: 142,
  grantedCount: 89,
  deniedCount: 28,
  promptCount: 25,
  recentSessionsCount: 14,
};

const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

/**
 * Service for querying visitor location sessions and device context.
 * Read-only operations against public.public_visit_sessions.
 * In configured production: queries real Supabase records exclusively; fails closed on error.
 */
export const locationActivityService = {
  /**
   * Fetch paginated visitor location sessions with server-side filters.
   */
  async getLocationActivity(
    filters: LocationActivityFilters,
    page = 1,
    pageSize = 20
  ): Promise<LocationActivityResponse> {
    if (!isSupabaseConfigured) {
      return {
        sessions: DEV_MOCK_SESSIONS,
        total: DEV_MOCK_SESSIONS.length,
        page: 1,
        pageSize,
        totalPages: 1,
      };
    }

    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    let query = supabase
      .from('public_visit_sessions')
      .select('*', { count: 'exact' });

    // 1. Permission Filter
    if (filters.permission && filters.permission !== 'all') {
      query = query.eq('permission_status', filters.permission);
    }

    // 2. Device Category Filter
    if (filters.device && filters.device !== 'all') {
      query = query.ilike('device_category', filters.device);
    }

    // 3. Browser Filter
    if (filters.browser && filters.browser !== 'all' && filters.browser.trim().length > 0) {
      query = query.ilike('browser_name', `%${filters.browser.trim()}%`);
    }

    // 4. Time Range Filter (based on last_seen_at)
    if (filters.timeRange && filters.timeRange !== 'all') {
      const now = Date.now();
      let startTimeIso = '';
      if (filters.timeRange === '24h') {
        startTimeIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.timeRange === '7d') {
        startTimeIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.timeRange === '30d') {
        startTimeIso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      if (startTimeIso) {
        query = query.gte('last_seen_at', startTimeIso);
      }
    }

    // 5. Text Search
    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim().replace(/,/g, '');
      query = query.or(
        `visitor_id.ilike.%${term}%,session_id.ilike.%${term}%,browser_name.ilike.%${term}%,os_name.ilike.%${term}%,platform.ilike.%${term}%,timezone.ilike.%${term}%`
      );
    }

    query = query
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .range(fromIndex, toIndex);

    const { data, count, error } = await query;

    if (error) {
      console.error('Failed to query visitor location sessions from Supabase:', error);
      throw new Error(`Failed to load visitor sessions: ${error.message}`);
    }

    const sessions = (data || []) as PublicVisitSession[];
    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      sessions,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch real summary KPI counts for visitor sessions.
   */
  async getLocationActivityStats(): Promise<LocationActivityStats> {
    if (!isSupabaseConfigured) {
      return DEV_MOCK_STATS;
    }

    const fifteenMinutesAgoIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const [totalRes, grantedRes, deniedRes, promptRes, recentRes] = await Promise.all([
      supabase.from('public_visit_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('public_visit_sessions').select('*', { count: 'exact', head: true }).eq('permission_status', 'granted'),
      supabase.from('public_visit_sessions').select('*', { count: 'exact', head: true }).eq('permission_status', 'denied'),
      supabase.from('public_visit_sessions').select('*', { count: 'exact', head: true }).eq('permission_status', 'prompt'),
      supabase.from('public_visit_sessions').select('*', { count: 'exact', head: true }).gte('last_seen_at', fifteenMinutesAgoIso),
    ]);

    if (totalRes.error) {
      console.error('Failed to fetch total sessions count:', totalRes.error);
      throw new Error(`Failed to load location statistics: ${totalRes.error.message}`);
    }

    if (grantedRes.error) {
      console.error('Failed to fetch granted sessions count:', grantedRes.error);
      throw new Error(`Failed to load location statistics: ${grantedRes.error.message}`);
    }

    if (deniedRes.error) {
      console.error('Failed to fetch denied sessions count:', deniedRes.error);
      throw new Error(`Failed to load location statistics: ${deniedRes.error.message}`);
    }

    if (promptRes.error) {
      console.error('Failed to fetch prompt sessions count:', promptRes.error);
      throw new Error(`Failed to load location statistics: ${promptRes.error.message}`);
    }

    if (recentRes.error) {
      console.error('Failed to fetch recent sessions count:', recentRes.error);
      throw new Error(`Failed to load location statistics: ${recentRes.error.message}`);
    }

    const total = totalRes.count ?? 0;
    const granted = grantedRes.count ?? 0;
    const denied = deniedRes.count ?? 0;
    const prompt = promptRes.count ?? 0;
    const recent15m = recentRes.count ?? 0;

    return {
      totalSessions: total,
      grantedCount: granted,
      deniedCount: denied,
      promptCount: prompt,
      recentSessionsCount: recent15m,
    };
  },

  /**
   * Fetch distinct browser names present in the sessions for filter suggestions.
   */
  async getDistinctBrowsers(): Promise<string[]> {
    if (!isSupabaseConfigured) {
      if (isDev) {
        return ['Chrome', 'Chrome Mobile', 'Safari'];
      }
      throw new Error('Supabase location activity service is not configured in this environment.');
    }

    const { data, error } = await supabase
      .from('public_visit_sessions')
      .select('browser_name')
      .not('browser_name', 'is', null)
      .limit(100);

    if (error) {
      console.error('Failed to query distinct browsers from Supabase:', error);
      throw new Error(`Failed to load distinct browsers: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    const set = new Set<string>();
    data.forEach((row: { browser_name: string | null }) => {
      if (row.browser_name && row.browser_name.trim()) {
        set.add(row.browser_name.trim());
      }
    });
    return Array.from(set);
  },
};

export default locationActivityService;
