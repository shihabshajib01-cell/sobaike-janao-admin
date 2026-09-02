/**
 * Analytics API Service
 */
import {
  AnalyticsDataResponse,
  AnalyticsFilterState,
  TrendDataPoint,
  StatusSummary,
  CategorySummary,
  LocationSummary,
} from '@/types/Analytics';

export const analyticsApi = {
  getCompleteAnalytics: async (
    _filters?: AnalyticsFilterState
  ): Promise<AnalyticsDataResponse> => {
    // Generate simulated dynamic analytical trends and distribution
    const trends: TrendDataPoint[] = [
      { date: '2025-05-01', dateFormattedEn: 'May 1', dateFormattedBn: '১ মে', complaintsCount: 18, publishedCount: 12, resolvedCount: 8 },
      { date: '2025-05-02', dateFormattedEn: 'May 2', dateFormattedBn: '২ মে', complaintsCount: 24, publishedCount: 19, resolvedCount: 14 },
      { date: '2025-05-03', dateFormattedEn: 'May 3', dateFormattedBn: '৩ মে', complaintsCount: 20, publishedCount: 15, resolvedCount: 11 },
      { date: '2025-05-04', dateFormattedEn: 'May 4', dateFormattedBn: '৪ মে', complaintsCount: 32, publishedCount: 28, resolvedCount: 21 },
      { date: '2025-05-05', dateFormattedEn: 'May 5', dateFormattedBn: '৫ মে', complaintsCount: 28, publishedCount: 22, resolvedCount: 19 },
      { date: '2025-05-06', dateFormattedEn: 'May 6', dateFormattedBn: '৬ মে', complaintsCount: 35, publishedCount: 30, resolvedCount: 25 },
      { date: '2025-05-07', dateFormattedEn: 'May 7', dateFormattedBn: '৭ মে', complaintsCount: 42, publishedCount: 36, resolvedCount: 31 },
    ];

    const statusDistribution: StatusSummary[] = [
      { status: 'submitted', labelEn: 'Submitted', labelBn: 'জমা দেওয়া', count: 45, percentage: 22 },
      { status: 'published', labelEn: 'Published', labelBn: 'প্রকাশিত', count: 78, percentage: 38 },
      { status: 'in_progress', labelEn: 'In Progress', labelBn: 'চলমান', count: 35, percentage: 17 },
      { status: 'resolved', labelEn: 'Resolved', labelBn: 'সমাধানকৃত', count: 32, percentage: 15 },
      { status: 'rejected', labelEn: 'Rejected', labelBn: 'প্রত্যাখ্যাত', count: 16, percentage: 8 },
    ];

    const categoryDistribution: CategorySummary[] = [
      {
        categoryId: 'roads_traffic',
        nameEn: 'Roads & Traffic',
        nameBn: 'রাস্তাঘাট ও ট্রাফিক',
        count: 68,
        percentage: 33,
        resolvedCount: 24,
        pendingCount: 44,
        subcategories: [
          { subcategoryId: 'potholes', nameEn: 'Potholes / Road Damage', nameBn: 'রাস্তা ক্ষতিগ্রস্ত / গর্ত', count: 42, percentage: 62 },
          { subcategoryId: 'signals', nameEn: 'Broken Signals', nameBn: 'ট্রাফিক সিগন্যাল সমস্যা', count: 26, percentage: 38 },
        ],
      },
      {
        categoryId: 'waste_management',
        nameEn: 'Waste Management',
        nameBn: 'বর্জ্য ব্যবস্থাপনা',
        count: 52,
        percentage: 25,
        resolvedCount: 30,
        pendingCount: 22,
        subcategories: [
          { subcategoryId: 'uncollected', nameEn: 'Uncollected Trash', nameBn: 'অনপসারিত ময়লা', count: 34, percentage: 65 },
          { subcategoryId: 'overflow', nameEn: 'Overflowing Bin', nameBn: 'ডাস্টবিন উপচে পড়া', count: 18, percentage: 35 },
        ],
      },
      {
        categoryId: 'water_drainage',
        nameEn: 'Water & Drainage',
        nameBn: 'পানি ও নিষ্কাশন',
        count: 44,
        percentage: 21,
        resolvedCount: 18,
        pendingCount: 26,
        subcategories: [
          { subcategoryId: 'waterlogging', nameEn: 'Waterlogging', nameBn: 'জলাবদ্ধতা', count: 28, percentage: 64 },
          { subcategoryId: 'pipe_leak', nameEn: 'Pipe Leakage', nameBn: 'পাইপ লিকেজ', count: 16, percentage: 36 },
        ],
      },
      {
        categoryId: 'street_lighting',
        nameEn: 'Street Lighting',
        nameBn: 'রাস্তার বাতি',
        count: 26,
        percentage: 13,
        resolvedCount: 16,
        pendingCount: 10,
        subcategories: [
          { subcategoryId: 'lamp_broken', nameEn: 'Broken Street Light', nameBn: 'অকেজো সড়কবাতি', count: 26, percentage: 100 },
        ],
      },
      {
        categoryId: 'public_health',
        nameEn: 'Public Health & Mosquitos',
        nameBn: 'জনস্বাস্থ্য ও মশক নিধন',
        count: 16,
        percentage: 8,
        resolvedCount: 8,
        pendingCount: 8,
        subcategories: [
          { subcategoryId: 'mosquito_fogging', nameEn: 'Mosquito Breeding', nameBn: 'মশার উপদ্রব', count: 16, percentage: 100 },
        ],
      },
    ];

    const locationDistribution: LocationSummary[] = [
      { location: 'Ward 18 - Gulshan / Banani', area: 'North Dhaka', count: 48, percentage: 23, resolvedCount: 20, mappedCount: 48 },
      { location: 'Ward 32 - Dhanmondi', area: 'South Dhaka', count: 42, percentage: 20, resolvedCount: 18, mappedCount: 42 },
      { location: 'Ward 06 - Mirpur 10', area: 'North Dhaka', count: 38, percentage: 18, resolvedCount: 14, mappedCount: 38 },
      { location: 'Ward 24 - Tejgaon', area: 'Central Dhaka', count: 32, percentage: 16, resolvedCount: 12, mappedCount: 32 },
      { location: 'Ward 12 - Uttara Sector 7', area: 'North Dhaka', count: 26, percentage: 13, resolvedCount: 10, mappedCount: 26 },
      { location: 'Ward 45 - Old Dhaka', area: 'South Dhaka', count: 20, percentage: 10, resolvedCount: 6, mappedCount: 20 },
    ];

    return {
      summary: {
        totalComplaints: 206,
        published: 78,
        resolved: 32,
        responses: 94,
        activeCategories: 5,
      },
      trends,
      statusDistribution,
      categoryDistribution,
      locationDistribution,
    };
  },
};

export default analyticsApi;
