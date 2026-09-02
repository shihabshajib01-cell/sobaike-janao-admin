/**
 * Dashboard API Service Layer
 * Aggregates real operational metrics directly from the complaint data layer.
 * Queries Supabase when configured, otherwise throws an honest configuration error.
 */

import {
  DashboardStats,
  StatusSummaryItem,
  CategorySummaryItem,
  RecentComplaintItem,
  LifecycleStatusKey,
} from '@/types/Dashboard';
import { complaintApi } from './complaintApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatDate } from '@/utils/formatters';

export class DashboardApi {
  /**
   * Ensures Supabase is configured before querying real data.
   */
  private checkConfiguration(): void {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Real database credentials are required to load Dashboard data.'
      );
    }
  }

  /**
   * Fetch high-level operational statistics derived from real complaint status counts.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    this.checkConfiguration();

    const stats = await complaintApi.getComplaintStats();
    const countMap = new Map<string, number>();

    stats.forEach((item) => {
      countMap.set(item.status, item.count);
    });

    const totalComplaints = countMap.get('all') ?? 0;
    const submitted = countMap.get('submitted') ?? 0;
    const published = countMap.get('published') ?? 0;
    const unpublished = countMap.get('unpublished') ?? 0;
    const rejected = countMap.get('rejected') ?? 0;
    const edited = countMap.get('edited') ?? 0;

    return {
      totalComplaints,
      submitted,
      published,
      unpublished,
      rejected,
      edited,
    };
  }

  /**
   * Fetch complaint distribution across real lifecycle statuses.
   */
  async getStatusSummary(): Promise<StatusSummaryItem[]> {
    this.checkConfiguration();

    const stats = await complaintApi.getComplaintStats();
    const countMap = new Map<string, number>();

    stats.forEach((item) => {
      countMap.set(item.status, item.count);
    });

    const total = countMap.get('all') ?? 0;

    const definitions: Array<{
      key: LifecycleStatusKey;
      labelEn: string;
      labelBn: string;
      badgeStatus: StatusSummaryItem['badgeStatus'];
      descriptionEn: string;
      descriptionBn: string;
    }> = [
      {
        key: 'submitted',
        labelEn: 'Submitted',
        labelBn: 'জমা পড়েছে',
        badgeStatus: 'pending',
        descriptionEn: 'Awaiting moderation review',
        descriptionBn: 'মডারেশন পর্যালোচনার অপেক্ষায়',
      },
      {
        key: 'published',
        labelEn: 'Published',
        labelBn: 'প্রকাশিত',
        badgeStatus: 'published',
        descriptionEn: 'Visible on public feed',
        descriptionBn: 'পাবলিক সাইটে দৃশ্যমান ও সক্রিয়',
      },
      {
        key: 'unpublished',
        labelEn: 'Unpublished',
        labelBn: 'অপ্রকাশিত',
        badgeStatus: 'default',
        descriptionEn: 'Removed from public view',
        descriptionBn: 'পাবলিক ভিউ থেকে সরানো',
      },
      {
        key: 'rejected',
        labelEn: 'Rejected',
        labelBn: 'প্রত্যাখ্যাত',
        badgeStatus: 'rejected',
        descriptionEn: 'Not approved for publication',
        descriptionBn: 'প্রকাশের জন্য অনুমোদিত নয়',
      },
    ];

    // Include edited if represented in dataset
    const editedCount = countMap.get('edited') ?? 0;
    if (editedCount > 0) {
      definitions.push({
        key: 'edited',
        labelEn: 'Edited',
        labelBn: 'সম্পাদিত',
        badgeStatus: 'info',
        descriptionEn: 'Revised versions with updates',
        descriptionBn: 'সংশোধিত সংস্করণ',
      });
    }

    return definitions.map((def) => {
      const count = countMap.get(def.key) ?? 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;

      return {
        key: def.key,
        labelEn: def.labelEn,
        labelBn: def.labelBn,
        count,
        percentage,
        badgeStatus: def.badgeStatus,
        descriptionEn: def.descriptionEn,
        descriptionBn: def.descriptionBn,
      };
    });
  }

  /**
   * Fetch taxonomy segment breakdown with real complaint counts.
   */
  async getCategorySummary(): Promise<CategorySummaryItem[]> {
    this.checkConfiguration();

    const [segments, stats] = await Promise.all([
      complaintApi.getSegments(),
      complaintApi.getComplaintStats(),
    ]);

    const totalComplaints =
      stats.find((s) => s.status === 'all')?.count ?? 0;

    // Fetch real count for each active segment in parallel
    const categoryCounts = await Promise.all(
      segments.map(async (segment) => {
        try {
          const res = await complaintApi.getComplaints(
            { category: segment.id },
            1,
            1
          );
          const count = res.pagination.totalItems ?? 0;
          const percentage =
            totalComplaints > 0 ? (count / totalComplaints) * 100 : 0;

          return {
            id: segment.id,
            nameEn: segment.name_en,
            nameBn: segment.name_bn,
            count,
            percentage,
          };
        } catch (err) {
          console.warn(`Failed to count complaints for segment ${segment.id}:`, err);
          return {
            id: segment.id,
            nameEn: segment.name_en,
            nameBn: segment.name_bn,
            count: 0,
            percentage: 0,
          };
        }
      })
    );

    return categoryCounts;
  }

  /**
   * Fetch recent real complaints for the dashboard review table.
   */
  async getRecentComplaints(limit = 6): Promise<RecentComplaintItem[]> {
    this.checkConfiguration();

    const response = await complaintApi.getComplaints({}, 1, limit);

    return response.items.map((complaint) => {
      const locationEn =
        complaint.location?.addressEn ||
        complaint.location?.zone ||
        complaint.location?.ward ||
        'Unknown';
      const locationBn =
        complaint.location?.addressBn ||
        complaint.location?.zone ||
        complaint.location?.ward ||
        'অজানা';

      return {
        id: complaint.id,
        titleEn: complaint.titleEn || complaint.id,
        titleBn: complaint.titleBn || complaint.id,
        categoryEn: complaint.categoryEn || 'Uncategorized',
        categoryBn: complaint.categoryBn || 'শ্রেণিহীন',
        locationEn,
        locationBn,
        ward: complaint.location?.ward || '',
        date: formatDate(complaint.createdAt),
        status: complaint.status as LifecycleStatusKey,
        urgency: complaint.urgency || 'medium',
      };
    });
  }
}

export const dashboardApi = new DashboardApi();
export default dashboardApi;
