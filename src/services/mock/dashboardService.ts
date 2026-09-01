/**
 * Dashboard Service (Mock Data Foundation)
 * API-ready service returning structured dashboard analytics, complaint queues, and event streams.
 * Replaceable with real HTTP/gRPC endpoints in production.
 */

import {
  DashboardStats,
  StatusSummaryItem,
  CategorySummaryItem,
  RecentComplaintItem,
  ActivityEvent,
  MapSummaryData,
} from '@/types/Dashboard';

export class DashboardService {
  /**
   * Fetch high-level operational statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    // Simulate brief network latency for robust loading state verification
    await new Promise((resolve) => setTimeout(resolve, 80));

    return {
      totalComplaints: 1482,
      submitted: 124,
      published: 942,
      rejected: 136,
      edited: 280,
      trends: {
        totalComplaintsChange: 14.8,
        submittedChange: -5.2,
        publishedChange: 22.1,
        rejectedChange: -3.4,
        editedChange: 18.6,
      },
    };
  }

  /**
   * Fetch complaint distribution across the 4 strict lifecycle statuses
   */
  async getStatusSummary(): Promise<StatusSummaryItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    return [
      {
        key: 'submitted',
        labelEn: 'Submitted',
        labelBn: 'দাখিলকৃত',
        count: 124,
        percentage: 12.4,
        badgeStatus: 'pending',
        descriptionEn: 'Fresh citizen complaints awaiting editorial review',
        descriptionBn: 'নাগরিকদের নতুন জমা দেওয়া অভিযোগ, যা পর্যালোচনার অপেক্ষায় রয়েছে',
      },
      {
        key: 'published',
        labelEn: 'Published',
        labelBn: 'প্রকাশিত',
        count: 742,
        percentage: 74.2,
        badgeStatus: 'published',
        descriptionEn: 'Visible on public feed for citizen transparency and official response',
        descriptionBn: 'নাগরিকদের জন্য পাবলিক ফিডে দৃশ্যমান ও বিভাগীয় প্রতিক্রিয়ার জন্য সক্রিয় রয়েছে',
      },
      {
        key: 'rejected',
        labelEn: 'Rejected',
        labelBn: 'বাতিলকৃত',
        count: 86,
        percentage: 8.6,
        badgeStatus: 'rejected',
        descriptionEn: 'Rejected submissions violating community safety policies',
        descriptionBn: 'নীতিমালা লঙ্ঘনের কারণে বাতিলকৃত নাগরিক অভিযোগ',
      },
      {
        key: 'edited',
        labelEn: 'Edited',
        labelBn: 'সম্পাদিত',
        count: 48,
        percentage: 4.8,
        badgeStatus: 'info',
        descriptionEn: 'Complaints updated with editorial corrections or version history',
        descriptionBn: 'প্রশাসনিক সম্পাদনা ও সংস্করণ ইতিহাসযুক্ত অভিযোগ',
      },
    ];
  }

  /**
   * Fetch civic category breakdown (using Sobaike standard civic categories)
   */
  async getCategorySummary(): Promise<CategorySummaryItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    return [
      {
        id: 'civic_issues',
        nameEn: 'Civic Problems & Drainage',
        nameBn: 'নাগরিক সমস্যা ও ড্রেনেজ',
        count: 512,
        percentage: 34.5,
        resolvedCount: 142,
        pendingCount: 48,
      },
      {
        id: 'roads_traffic',
        nameEn: 'Roads & Traffic Hazards',
        nameBn: 'রাস্তাঘাট ও ট্রাফিক ঝুঁকি',
        count: 384,
        percentage: 25.9,
        resolvedCount: 88,
        pendingCount: 32,
      },
      {
        id: 'waste_management',
        nameEn: 'Waste Management',
        nameBn: 'বর্জ্য ব্যবস্থাপনা',
        count: 248,
        percentage: 16.7,
        resolvedCount: 65,
        pendingCount: 19,
      },
      {
        id: 'extortion',
        nameEn: 'Extortion & Unlawful Tolls',
        nameBn: 'চাঁদাবাজি ও অবৈধ টোল',
        count: 172,
        percentage: 11.6,
        resolvedCount: 21,
        pendingCount: 14,
      },
      {
        id: 'harassment',
        nameEn: 'Public Harassment',
        nameBn: 'পাবলিক হয়রানি',
        count: 112,
        percentage: 7.6,
        resolvedCount: 11,
        pendingCount: 8,
      },
      {
        id: 'corruption',
        nameEn: 'Public Office Irregularities',
        nameBn: 'সরকারি দপ্তরের অনিয়ম',
        count: 54,
        percentage: 3.7,
        resolvedCount: 3,
        pendingCount: 3,
      },
    ];
  }

  /**
   * Fetch recent complaints feed for the dashboard table
   */
  async getRecentComplaints(limit = 6): Promise<RecentComplaintItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const complaints: RecentComplaintItem[] = [
      {
        id: 'CMP-10492',
        titleEn: 'Severe manhole hazard near Mirpur-10 intersection',
        titleBn: 'মিরপুর-১০ গোলচত্বরের কাছে উন্মুক্ত ম্যানহোলের মারাত্মক ঝুঁকি',
        categoryEn: 'Roads & Traffic',
        categoryBn: 'রাস্তাঘাট ও ট্রাফিক',
        locationEn: 'Ward 14, Mirpur',
        locationBn: 'ওয়ার্ড ১৪, মিরপুর',
        ward: 'Ward 14',
        date: '10 mins ago',
        status: 'submitted',
        urgency: 'urgent',
        upvotesCount: 48,
      },
      {
        id: 'CMP-10491',
        titleEn: 'Uncollected domestic waste blocking road for 3 days',
        titleBn: '৩ দিন ধরে প্রধান সড়কে উপচে পড়া গৃহস্থালি ময়লা',
        categoryEn: 'Waste Management',
        categoryBn: 'বর্জ্য ব্যবস্থাপনা',
        locationEn: 'Ward 22, Dhanmondi',
        locationBn: 'ওয়ার্ড ২২, ধানমন্ডি',
        ward: 'Ward 22',
        date: '35 mins ago',
        status: 'edited',
        urgency: 'high',
        upvotesCount: 32,
      },
      {
        id: 'CMP-10490',
        titleEn: 'Extortion demand at localized vendor marketplace',
        titleBn: 'স্থানীয় কাঁচাবাজারে ক্ষুদ্র ব্যবসায়ীদের নিকট অবৈধ চাঁদা দাবি',
        categoryEn: 'Extortion',
        categoryBn: 'চাঁদাবাজি',
        locationEn: 'Ward 31, Mohammadpur',
        locationBn: 'ওয়ার্ড ৩১, মোহাম্মদপুর',
        ward: 'Ward 31',
        date: '1 hour ago',
        status: 'submitted',
        urgency: 'high',
        upvotesCount: 65,
      },
      {
        id: 'CMP-10489',
        titleEn: 'Street lights non-functional along Uttara Sector 7',
        titleBn: 'উত্তরা সেক্টর ৭ প্রধান সড়কের স্ট্রিট লাইট বিকল',
        categoryEn: 'Civic Problems',
        categoryBn: 'নাগরিক সমস্যা',
        locationEn: 'Ward 01, Uttara',
        locationBn: 'ওয়ার্ড ০১, উত্তরা',
        ward: 'Ward 01',
        date: '2 hours ago',
        status: 'rejected',
        urgency: 'medium',
        upvotesCount: 19,
      },
      {
        id: 'CMP-10488',
        titleEn: 'Illegal sand vehicle movement damaging neighborhood pavement',
        titleBn: 'অননুমোদিত ভারী বালুর ট্রাকের যাতায়াতে গলির রাস্তা ক্ষতিগ্রস্ত',
        categoryEn: 'Roads & Traffic',
        categoryBn: 'রাস্তাঘাট ও ট্রাফিক',
        locationEn: 'Ward 18, Gulshan',
        locationBn: 'ওয়ার্ড ১৮, গুলশান',
        ward: 'Ward 18',
        date: '3 hours ago',
        status: 'published',
        urgency: 'medium',
        upvotesCount: 84,
      },
      {
        id: 'CMP-10487',
        titleEn: 'WASA main water leakage flooding building entrance',
        titleBn: 'ওয়াসা পাইপলাইন ফেটে আবাসিক ভবনের গেটে জলাবদ্ধতা',
        categoryEn: 'Civic Problems',
        categoryBn: 'নাগরিক সমস্যা',
        locationEn: 'Ward 09, Farmgate',
        locationBn: 'ওয়ার্ড ০৯, ফার্মগেট',
        ward: 'Ward 09',
        date: '4 hours ago',
        status: 'published',
        urgency: 'low',
        upvotesCount: 112,
      },
    ];

    return complaints.slice(0, limit);
  }

  /**
   * Fetch recent operational activity events
   */
  async getActivities(limit = 5): Promise<ActivityEvent[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    const activities: ActivityEvent[] = [
      {
        id: 'ACT-901',
        type: 'new_submission',
        titleEn: 'New Citizen Complaint Submitted',
        titleBn: 'নতুন নাগরিক অভিযোগ দাখিল',
        descriptionEn: 'Citizen reported broken culvert in Ward 14 (CMP-10492)',
        descriptionBn: 'ওয়ার্ড ১৪-এ ভাঙা কালভার্ট সংক্রান্ত অভিযোগ দাখিল (CMP-10492)',
        timestamp: '10 mins ago',
        actor: 'Citizen Portal',
        role: 'Verified Citizen',
        complaintId: 'CMP-10492',
      },
      {
        id: 'ACT-900',
        type: 'moved_to_review',
        titleEn: 'Complaint Triage Started',
        titleBn: 'অভিযোগ ট্রায়াজ শুরু',
        descriptionEn: 'Officer Farhana initiated evidentiary audit for Dhanmondi waste report',
        descriptionBn: 'কর্মকর্তা ফারহানা ধানমন্ডি বর্জ্য রিপোর্টের সত্যতা যাচাই শুরু করেছেন',
        timestamp: '32 mins ago',
        actor: 'Farhana Ahmed',
        role: 'Triage Officer',
        complaintId: 'CMP-10491',
      },
      {
        id: 'ACT-899',
        type: 'assigned_department',
        titleEn: 'Assigned to DNCC Engineering',
        titleBn: 'ডিএনসিসি প্রকৌশল বিভাগে হস্তান্তর',
        descriptionEn: 'Uttara street lighting issue routed to Department Zone 1',
        descriptionBn: 'উত্তরা সড়ক বাতি সমস্যা ডিএনসিসি জোন ১ প্রকৌশল বিভাগে পাঠানো হয়েছে',
        timestamp: '1 hour ago',
        actor: 'Auto Router',
        role: 'SLA Engine',
        complaintId: 'CMP-10489',
      },
      {
        id: 'ACT-898',
        type: 'report_published',
        titleEn: 'Report Published to Public Feed',
        titleBn: 'পাবলিক ফিডে রিপোর্ট প্রকাশিত',
        descriptionEn: 'Gulshan pavement degradation report approved for citizen transparency',
        descriptionBn: 'গুলশান রাস্তা ক্ষতিগ্রস্ত রিপোর্ট নাগরিক স্বচ্ছতার জন্য অনুমোদিত ও প্রকাশিত',
        timestamp: '2 hours ago',
        actor: 'Superadmin',
        role: 'Executive',
        complaintId: 'CMP-10488',
      },
      {
        id: 'ACT-897',
        type: 'status_resolved',
        titleEn: 'Official Remediation Completed',
        titleBn: 'দাপ্তরিক সমাধান সম্পন্ন',
        descriptionEn: 'WASA engineering team repaired broken pipeline with post-fix photos',
        descriptionBn: 'ওয়াসা প্রকৌশল টিম পাইপলাইন মেরামত সম্পন্ন করে ছবি আপলোড করেছে',
        timestamp: '4 hours ago',
        actor: 'WASA Zone-2 Officer',
        role: 'Department Authority',
        complaintId: 'CMP-10487',
      },
    ];

    return activities.slice(0, limit);
  }

  /**
   * Fetch spatial summary overview for the map card
   */
  async getMapSummary(): Promise<MapSummaryData> {
    await new Promise((resolve) => setTimeout(resolve, 70));

    return {
      totalComplaintLocations: 1248,
      activeHotspotCount: 14,
      primaryZone: 'Dhaka North (DNCC) Zone-4',
      hotspotWards: [
        { ward: 'Ward 14', zone: 'Mirpur-10', count: 42, urgencyLevel: 'high' },
        { ward: 'Ward 22', zone: 'Dhanmondi', count: 35, urgencyLevel: 'medium' },
        { ward: 'Ward 31', zone: 'Mohammadpur', count: 29, urgencyLevel: 'high' },
        { ward: 'Ward 01', zone: 'Uttara North', count: 21, urgencyLevel: 'low' },
      ],
      recentPings: [
        {
          id: 'CMP-10492',
          title: 'Open Manhole Hazard',
          category: 'Roads',
          ward: 'Ward 14',
          time: '10m ago',
          status: 'submitted',
          coords: [23.807, 90.3686],
        },
        {
          id: 'CMP-10491',
          title: 'Overflowing Waste Dump',
          category: 'Sanitation',
          ward: 'Ward 22',
          time: '35m ago',
          status: 'edited',
          coords: [23.7465, 90.376],
        },
        {
          id: 'CMP-10490',
          title: 'Extortion Incident',
          category: 'Extortion',
          ward: 'Ward 31',
          time: '1h ago',
          status: 'submitted',
          coords: [23.7588, 90.3598],
        },
        {
          id: 'CMP-10488',
          title: 'Heavy Vehicle Damage',
          category: 'Roads',
          ward: 'Ward 18',
          time: '3h ago',
          status: 'published',
          coords: [23.7925, 90.4162],
        },
      ],
    };
  }
}

export const mockDashboardService = new DashboardService();
export default mockDashboardService;
