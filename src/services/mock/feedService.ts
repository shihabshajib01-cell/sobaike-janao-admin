/**
 * Public Feed Mock Service
 * Manages post listing, filtering, status counting, search, and pagination.
 * Simplified 2-state model: unpublished & published.
 */

import {
  FeedPost,
  FeedFilterState,
  FeedListResponse,
  FeedStatusTabCount,
  FeedStatusFilter,
} from '@/types/Post';

export const MOCK_FEED_POSTS: FeedPost[] = [
  {
    id: 'POST-401',
    complaintId: 'CMP-10488',
    titleEn: 'Illegal heavy sand vehicle movement damaging neighborhood pavement',
    titleBn: 'অননুমোদিত ভারী বালুর ট্রাকের যাতায়াতে গলির রাস্তা মারাত্মক ক্ষতিগ্রস্ত',
    contentEn: '10-wheeler trucks transporting construction sand violating daytime curfew and breaking storm drain culverts. Resident committee reported multiple pavement collapses.',
    contentBn: 'দিনের নির্ধারিত সময় অমান্য করে ১০ চাকার বালুর ট্রাকের চলাচলে কালভার্ট ও নর্দমার স্লাব ভেঙে ড্রেন বন্ধ হয়ে গেছে। এলাকাবাসী একাধিকবার অভিযোগ জানিয়েছেন।',
    categoryId: 'roads_traffic',
    categoryEn: 'Roads & Traffic',
    categoryBn: 'রাস্তাঘাট ও ট্রাফিক',
    subcategoryId: 'road_damage',
    subcategoryEn: 'Road Surface Damage',
    subcategoryBn: 'রাস্তা ক্ষতিগ্রস্ত',
    location: {
      addressEn: 'Gulshan-2, Road 54 Inner Alley',
      addressBn: 'গুলশান-২, রোড ৫৪ অভ্যন্তরীণ গলি',
      ward: 'Ward 18',
      zone: 'Gulshan (Zone 3)',
      coordinates: [23.7925, 90.4162],
    },
    media: [
      {
        id: 'fm-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
        caption: 'Broken road culvert edge caused by heavy axles',
      },
      {
        id: 'fm-2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
        caption: 'Construction truck tire tracks and shattered pavement',
      },
    ],
    status: 'published',
    upvotesCount: 142,
    commentsCount: 28,
    sharesCount: 35,
    authorDisplayEn: 'Verified Citizen (Gulshan Resident)',
    authorDisplayBn: 'যাচাইকৃত নাগরিক (গুলশান বাসিন্দা)',
    publishedAt: '2026-08-28T07:00:00Z',
    createdAt: '2026-08-28T05:15:00Z',
    updatedAt: '2026-08-28T07:00:00Z',
  },
  {
    id: 'POST-402',
    complaintId: 'CMP-10487',
    titleEn: 'WASA main water distribution pipe burst causing severe street flooding',
    titleBn: 'ওয়াসা প্রধান বিতরণ পাইপ ফেটে ব্যাপক এলাকা প্লাবিত ও পানি অপচয়',
    contentEn: 'High-pressure distribution pipeline burst early morning, submerging Farmgate gate area and depriving 200 households of drinking water supply.',
    contentBn: 'ভোরবেলায় উচ্চচাপ বিতরণ পাইপ ফেটে ফার্মগেট এলাকার প্রধান গেট নিমজ্জিত এবং ২০০ পরিবারের পানীয় জল সরবরাহ বন্ধ হয়ে পড়েছে।',
    categoryId: 'water_drainage',
    categoryEn: 'Water & Drainage',
    categoryBn: 'পানি ও নিষ্কাশন',
    subcategoryId: 'pipe_leak',
    subcategoryEn: 'Pipeline Leakage',
    subcategoryBn: 'পাইপলাইন লিকেজ',
    location: {
      addressEn: 'Ananda Cinema Hall Road, Farmgate',
      addressBn: 'আনন্দ সিনেমা হল রোড, ফার্মগেট',
      ward: 'Ward 27',
      zone: 'Tejgaon (Zone 5)',
      coordinates: [23.757, 90.389],
    },
    media: [
      {
        id: 'fm-3',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80',
        caption: 'High pressure water jet from ruptured underground joint',
      },
    ],
    status: 'published',
    upvotesCount: 219,
    commentsCount: 45,
    sharesCount: 68,
    authorDisplayEn: 'Kazi Moinuddin',
    authorDisplayBn: 'কাজী মঈনুদ্দিন',
    publishedAt: '2026-08-27T18:00:00Z',
    createdAt: '2026-08-27T14:30:00Z',
    updatedAt: '2026-08-28T04:20:00Z',
  },
  {
    id: 'POST-403',
    complaintId: 'CMP-10489',
    titleEn: 'Street lights non-functional along Uttara Sector 7 avenue',
    titleBn: 'উত্তরা সেক্টর ৭ প্রধান সড়কের সকল স্ট্রিট লাইট বিকল',
    contentEn: 'Over 14 consecutive LED poles dark since Sunday storm, making night commuting unsafe for working women and residents.',
    contentBn: 'রোববারের ঝড়ের পর থেকে ১৪টি এলইডি পোল সম্পূর্ণ বন্ধ। কর্মজীবী নারী ও পথচারীদের জন্য রাতের চলাচল মারাত্মক অনিরাপদ হয়ে উঠেছে।',
    categoryId: 'civic_issues',
    categoryEn: 'Civic Problems',
    categoryBn: 'নাগরিক সমস্যা',
    subcategoryId: 'street_lighting',
    subcategoryEn: 'Street Lighting',
    subcategoryBn: 'সড়ক বাতি',
    location: {
      addressEn: 'Sector 7, Avenue 4, Uttara',
      addressBn: 'সেক্টর ৭, এভিনিউ ৪, উত্তরা',
      ward: 'Ward 01',
      zone: 'Uttara North (Zone 1)',
      coordinates: [23.868, 90.398],
    },
    media: [],
    status: 'unpublished',
    upvotesCount: 88,
    commentsCount: 14,
    sharesCount: 19,
    authorDisplayEn: 'Uttara Welfare Association',
    authorDisplayBn: 'উত্তরা কল্যাণ সমিতি',
    createdAt: '2026-08-26T19:00:00Z',
    updatedAt: '2026-08-27T08:15:00Z',
  },
  {
    id: 'POST-404',
    complaintId: 'CMP-10486',
    titleEn: 'Open garbage dump near Dhanmondi Lake walking trail causing extreme stench',
    titleBn: 'ধানমন্ডি লেকের হাঁটার পথের পাশে উন্মুক্ত ময়লার স্তূপ ও তীব্র দুর্গন্ধ',
    contentEn: 'Unregulated secondary transfer station overflowing onto morning walker pathways. Waste bins uncleaned for 48 hours.',
    contentBn: 'অননুমোদিত সেকেন্ডারি ট্রান্সফার পয়েন্টে ময়লা উপচে প্রাতঃভ্রমণকারীদের পথে ছড়িয়ে পড়েছে। ৪৮ ঘণ্টা যাবত বর্জ্য অপসারণ করা হয়নি।',
    categoryId: 'waste_management',
    categoryEn: 'Waste Management',
    categoryBn: 'বর্জ্য ব্যবস্থাপনা',
    subcategoryId: 'overflowing_dustbin',
    subcategoryEn: 'Overflowing Dustbin',
    subcategoryBn: 'উপচে পড়া ডাস্টবিন',
    location: {
      addressEn: 'Dhanmondi Lake Walkway, Road 8/A',
      addressBn: 'ধানমন্ডি লেক সংলগ্ন ওয়াকওয়ে, রোড ৮/এ',
      ward: 'Ward 15',
      zone: 'Dhanmondi (Zone 10)',
      coordinates: [23.7485, 90.3752],
    },
    media: [
      {
        id: 'fm-4',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
        caption: 'Organic waste spilling onto pedestrian jogging path',
      },
    ],
    status: 'published',
    upvotesCount: 312,
    commentsCount: 76,
    sharesCount: 104,
    authorDisplayEn: 'Afreen Sultana',
    authorDisplayBn: 'আফরিন সুলতানা',
    publishedAt: '2026-08-26T09:30:00Z',
    createdAt: '2026-08-26T06:00:00Z',
    updatedAt: '2026-08-27T11:00:00Z',
  },
  {
    id: 'POST-405',
    complaintId: 'CMP-10485',
    titleEn: 'Open deep manhole near primary school gate in Mirpur-10',
    titleBn: 'মিরপুর-১০ এ প্রাথমিক বিদ্যালয়ের গেটের সামনে ঢাকনাবিহীন গভীর ম্যানহোল',
    contentEn: 'Broken concrete manhole cover uncovered for 5 days. Children and elderly pedestrians at high risk of fatal accidents.',
    contentBn: 'গত ৫ দিন ধরে কনক্রিটের স্লাব ভাঙা অবস্থায় ম্যানহোল খোলা পড়ে আছে। স্কুলগামী শিশু ও পথচারীদের প্রাণহানির ঝুঁকি তৈরি হয়েছে।',
    categoryId: 'water_drainage',
    categoryEn: 'Water & Drainage',
    categoryBn: 'পানি ও নিষ্কাশন',
    subcategoryId: 'open_manhole',
    subcategoryEn: 'Open Manhole',
    subcategoryBn: 'ঢাকনাবিহীন ম্যানহোল',
    location: {
      addressEn: 'Section 10, Block C, Mirpur',
      addressBn: 'সেকশন ১০, ব্লক সি, মিরপুর',
      ward: 'Ward 11',
      zone: 'Mirpur (Zone 4)',
      coordinates: [23.807, 90.3685],
    },
    media: [
      {
        id: 'fm-5',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?auto=format&fit=crop&w=800&q=80',
        caption: 'Hazardous exposed sewer opening with warning branch placed by locals',
      },
    ],
    status: 'unpublished',
    upvotesCount: 540,
    commentsCount: 92,
    sharesCount: 210,
    authorDisplayEn: 'School Guardians Committee',
    authorDisplayBn: 'অভিভাবক ফোরাম',
    createdAt: '2026-08-25T11:00:00Z',
    updatedAt: '2026-08-25T14:20:00Z',
  },
  {
    id: 'POST-406',
    complaintId: 'CMP-10484',
    titleEn: 'Fallen electric transformer pole blocking Banani Road 11 pathway',
    titleBn: 'বনানী ১১ নম্বর সড়কের ফুটপাতে ট্রান্সফরমারযুক্ত বিপজ্জনক বৈদ্যুতিক খুঁটি হেলে পড়া',
    contentEn: 'Heavy tree branch fell on distribution wires causing 45-degree pole tilt with live sparks during rain.',
    contentBn: 'ঝড়ে গাছের ভারী ডাল পড়ে তার ছিঁড়ে বৈদ্যুতিক খুঁটি বিপজ্জনকভাবে কাত হয়ে গেছে এবং বৃষ্টিতে স্পার্ক সৃষ্টি হচ্ছে।',
    categoryId: 'civic_issues',
    categoryEn: 'Civic Problems',
    categoryBn: 'নাগরিক সমস্যা',
    subcategoryId: 'hazardous_wiring',
    subcategoryEn: 'Hazardous Electrical Wiring',
    subcategoryBn: 'বিপজ্জনক বৈদ্যুতিক তার',
    location: {
      addressEn: 'Road 11, Block D, Banani',
      addressBn: 'রোড ১১, ব্লক ডি, বনানী',
      ward: 'Ward 19',
      zone: 'Gulshan (Zone 3)',
      coordinates: [23.7937, 90.4048],
    },
    media: [
      {
        id: 'fm-6',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
        caption: 'Tilted utility pole entangled with overhead optical fiber cords',
      },
    ],
    status: 'unpublished',
    upvotesCount: 165,
    commentsCount: 31,
    sharesCount: 42,
    authorDisplayEn: 'Tanvir Hossain',
    authorDisplayBn: 'তানভীর হোসেন',
    createdAt: '2026-08-24T16:45:00Z',
    updatedAt: '2026-08-25T09:00:00Z',
  },
  {
    id: 'POST-407',
    complaintId: 'CMP-10483',
    titleEn: 'Unauthorized construction materials occupying half of Mohakhali Wireless main road',
    titleBn: 'মহাখালী ওয়্যারলেস প্রধান সড়কের অর্ধেক দখল করে অননুমোদিত নির্মাণ সামগ্রী মজুদ',
    contentEn: 'Commercial building contractor dumping gravel, iron rods, and cement on public roadway causing severe bottlenecks.',
    contentBn: 'বাণিজ্যিক ভবন নির্মাণকারী প্রতিষ্ঠান সড়কের উপর রড, সিমেন্ট ও পাথর ফেলে রাখায় দীর্ঘ যানজটের সৃষ্টি হচ্ছে।',
    categoryId: 'encroachment',
    categoryEn: 'Illegal Encroachment',
    categoryBn: 'অবৈধ দখল',
    subcategoryId: 'footpath_occupation',
    subcategoryEn: 'Footpath & Road Encroachment',
    subcategoryBn: 'ফুটপাত ও সড়ক দখল',
    location: {
      addressEn: 'Wireless Gate, Mohakhali',
      addressBn: 'ওয়্যারলেস গেট, মহাখালী',
      ward: 'Ward 20',
      zone: 'Mohakhali (Zone 3)',
      coordinates: [23.778, 90.401],
    },
    media: [],
    status: 'published',
    upvotesCount: 180,
    commentsCount: 39,
    sharesCount: 51,
    authorDisplayEn: 'Concerned Commuter',
    authorDisplayBn: 'সচেতন যাত্রী',
    publishedAt: '2026-08-24T12:00:00Z',
    createdAt: '2026-08-24T08:00:00Z',
    updatedAt: '2026-08-24T12:00:00Z',
  },
];

export class FeedService {
  private postsStore: FeedPost[] = [...MOCK_FEED_POSTS];

  /**
   * Get filtered and paginated list of feed posts
   */
  async getPosts(
    filters: Partial<FeedFilterState> = {},
    page = 1,
    limit = 10
  ): Promise<FeedListResponse> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    let filtered = [...this.postsStore];

    // Status Tab Filtering (2-state model: unpublished, published)
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    // Text Search
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          (p.complaintId && p.complaintId.toLowerCase().includes(q)) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.titleBn.toLowerCase().includes(q) ||
          p.contentEn.toLowerCase().includes(q) ||
          p.contentBn.toLowerCase().includes(q) ||
          (p.categoryEn && p.categoryEn.toLowerCase().includes(q)) ||
          (p.categoryBn && p.categoryBn.toLowerCase().includes(q)) ||
          p.location.ward.toLowerCase().includes(q) ||
          (p.location.zone && p.location.zone.toLowerCase().includes(q))
      );
    }

    // Category Filter
    if (filters.categoryId && filters.categoryId !== 'all') {
      filtered = filtered.filter((p) => p.categoryId === filters.categoryId);
    }

    // Subcategory Filter
    if (filters.subcategoryId && filters.subcategoryId !== 'all') {
      filtered = filtered.filter((p) => p.subcategoryId === filters.subcategoryId);
    }

    // Media Filter (text only vs single image vs multiple images)
    if (filters.hasMedia && filters.hasMedia !== 'all') {
      if (filters.hasMedia === 'text_only') {
        filtered = filtered.filter((p) => p.media.length === 0);
      } else if (filters.hasMedia === 'single_image') {
        filtered = filtered.filter((p) => p.media.length === 1);
      } else if (filters.hasMedia === 'multiple_images') {
        filtered = filtered.filter((p) => p.media.length > 1);
      }
    }

    // Ward Filter
    if (filters.ward && filters.ward !== 'all') {
      filtered = filtered.filter((p) => p.location.ward === filters.ward);
    }

    // Sort by latest updated/created
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate Status Counts for the tabs
    const statusCounts: Record<FeedStatusFilter, number> = {
      all: this.postsStore.length,
      unpublished: this.postsStore.filter((p) => p.status === 'unpublished').length,
      published: this.postsStore.filter((p) => p.status === 'published').length,
    };

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedPosts = filtered.slice(startIndex, startIndex + limit);

    return {
      posts: paginatedPosts,
      total,
      page,
      limit,
      totalPages,
      statusCounts,
    };
  }

  /**
   * Get single post details by ID
   */
  async getPostById(id: string): Promise<FeedPost | null> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const found = this.postsStore.find(
      (p) =>
        p.id.toLowerCase() === id.toLowerCase() ||
        (p.complaintId && p.complaintId.toLowerCase() === id.toLowerCase())
    );
    return found ? { ...found } : null;
  }

  /**
   * Update post content (preserves current status)
   */
  async updatePost(
    id: string,
    updates: Partial<Omit<FeedPost, 'id' | 'status' | 'createdAt'>>
  ): Promise<FeedPost> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const index = this.postsStore.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Feed post with ID ${id} not found.`);
    }

    const current = this.postsStore[index];
    const updatedPost: FeedPost = {
      ...current,
      ...updates,
      id: current.id, // Immutable
      status: current.status, // Strictly preserved
      createdAt: current.createdAt, // Immutable
      updatedAt: new Date().toISOString(),
    };

    this.postsStore[index] = updatedPost;
    return { ...updatedPost };
  }

  /**
   * Status Tab Counts (Simplified: all, unpublished, published)
   */
  async getStatusCounts(): Promise<FeedStatusTabCount[]> {
    await new Promise((resolve) => setTimeout(resolve, 40));
    return [
      {
        status: 'all',
        count: this.postsStore.length,
        labelEn: 'All Content',
        labelBn: 'সকল কনটেন্ট',
      },
      {
        status: 'unpublished',
        count: this.postsStore.filter((p) => p.status === 'unpublished').length,
        labelEn: 'Unpublished',
        labelBn: 'অপ্রকাশিত',
      },
      {
        status: 'published',
        count: this.postsStore.filter((p) => p.status === 'published').length,
        labelEn: 'Published',
        labelBn: 'প্রকাশিত',
      },
    ];
  }
}

export const mockFeedService = new FeedService();
export default mockFeedService;
