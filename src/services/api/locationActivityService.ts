import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  PublicVisitSession,
  LocationActivityFilters,
  LocationActivityStats,
  LocationActivityResponse,
} from '@/types/LocationActivity';

/**
 * Service for querying visitor location sessions and device context.
 * Read-only operations against public.public_visit_sessions.
 * Direct Supabase access with active admin RLS enforcement.
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
      throw new Error('Supabase client is not configured.');
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

    // 5. Text Search (visitor_id, session_id, browser_name, os_name, platform, timezone)
    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim().replace(/,/g, '');
      query = query.or(
        `visitor_id.ilike.%${term}%,session_id.ilike.%${term}%,browser_name.ilike.%${term}%,os_name.ilike.%${term}%,platform.ilike.%${term}%,timezone.ilike.%${term}%`
      );
    }

    // Default Order: last_seen_at DESC
    query = query
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .range(fromIndex, toIndex);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching public_visit_sessions:', error);
      throw new Error(error.message || 'Failed to fetch location activity sessions');
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
      throw new Error('Supabase client is not configured.');
    }

    const fifteenMinutesAgoIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const [totalRes, grantedRes, deniedRes, promptRes, recentRes] = await Promise.all([
      // Total Sessions
      supabase
        .from('public_visit_sessions')
        .select('*', { count: 'exact', head: true }),
      // Granted Location
      supabase
        .from('public_visit_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('permission_status', 'granted'),
      // Denied
      supabase
        .from('public_visit_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('permission_status', 'denied'),
      // Not Now / Prompt
      supabase
        .from('public_visit_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('permission_status', 'prompt'),
      // Recent Sessions (last 15 minutes)
      supabase
        .from('public_visit_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', fifteenMinutesAgoIso),
    ]);

    if (totalRes.error) {
      console.error('Error fetching total session count:', totalRes.error);
      throw new Error(totalRes.error.message || 'Failed to fetch total session count');
    }

    return {
      totalSessions: totalRes.count ?? 0,
      grantedCount: grantedRes.count ?? 0,
      deniedCount: deniedRes.count ?? 0,
      promptCount: promptRes.count ?? 0,
      recentSessionsCount: recentRes.count ?? 0,
    };
  },

  /**
   * Fetch distinct browser names present in the sessions for filter suggestions.
   */
  async getDistinctBrowsers(): Promise<string[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('public_visit_sessions')
        .select('browser_name')
        .not('browser_name', 'is', null)
        .limit(100);

      if (error || !data) return [];
      const set = new Set<string>();
      data.forEach((row: { browser_name: string | null }) => {
        if (row.browser_name && row.browser_name.trim()) {
          set.add(row.browser_name.trim());
        }
      });
      return Array.from(set);
    } catch {
      return [];
    }
  },
};

export default locationActivityService;
