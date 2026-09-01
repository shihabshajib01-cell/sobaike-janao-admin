/**
 * Category Management Mock Service
 * Provides API-ready access to Sobaike's 3-level taxonomy (Feature -> Category -> Subcategory)
 * Demo taxonomy data aligned strictly with public product scope
 */

import {
  Feature,
  Category,
  Subcategory,
  CategoryTreeNode,
  FeatureTreeNode,
  CategoryFilterState,
  CategoryStatus,
} from '@/types/Category';

// 1. Features Dataset (Demo Feature Data)
export let MOCK_FEATURES: Feature[] = [
  {
    id: 'complaints',
    nameEn: 'Citizen Complaints',
    nameBn: 'নাগরিক অভিযোগ প্রতিকার',
    status: 'active',
    order: 1,
  },
  {
    id: 'public_feed',
    nameEn: 'Public Feed & Community',
    nameBn: 'পাবলিক ফিড ও নাগরিক জনপরিসর',
    status: 'active',
    order: 2,
  },
];

// 2. Categories Dataset (Demo Category Data)
export let MOCK_CATEGORIES: Category[] = [
  // --- Under 'complaints' Feature ---
  {
    id: 'roads_traffic',
    featureId: 'complaints',
    nameEn: 'Roads & Traffic Infrastructure',
    nameBn: 'রাস্তাঘাট ও ট্রাফিক অবকাঠামো',
    status: 'active',
    order: 1,
  },
  {
    id: 'waste_management',
    featureId: 'complaints',
    nameEn: 'Waste Management & Sanitation',
    nameBn: 'বর্জ্য ব্যবস্থাপনা ও পরিচ্ছন্নতা',
    status: 'active',
    order: 2,
  },
  {
    id: 'water_drainage',
    featureId: 'complaints',
    nameEn: 'Water Supply & Drainage',
    nameBn: 'পানি সরবরাহ ও নিষ্কাশন',
    status: 'active',
    order: 3,
  },
  {
    id: 'electricity_utilities',
    featureId: 'complaints',
    nameEn: 'Electricity & Public Utilities',
    nameBn: 'বিদ্যুৎ ও ইউটিলিটি পরিষেবা',
    status: 'active',
    order: 4,
  },
  {
    id: 'extortion',
    featureId: 'complaints',
    nameEn: 'Extortion & Unlawful Tolls',
    nameBn: 'চাঁদাবাজি ও অবৈধ টোল আদায়',
    status: 'active',
    order: 5,
  },
  {
    id: 'harassment',
    featureId: 'complaints',
    nameEn: 'Public Harassment & Safety',
    nameBn: 'পাবলিক হয়রানি ও নারী নিরাপত্তা',
    status: 'active',
    order: 6,
  },
  {
    id: 'corruption',
    featureId: 'complaints',
    nameEn: 'Public Office Irregularities',
    nameBn: 'সরকারি দপ্তরের অনিয়ম ও হয়রানি',
    status: 'active',
    order: 7,
  },
  {
    id: 'civic_issues',
    featureId: 'complaints',
    nameEn: 'Civic Problems & General',
    nameBn: 'নাগরিক সমস্যা ও বিবিধ',
    status: 'active',
    order: 8,
  },

  // --- Under 'public_feed' Feature ---
  {
    id: 'community_updates',
    featureId: 'public_feed',
    nameEn: 'Community Updates & Ward News',
    nameBn: 'ওয়ার্ডের হালচাল ও উন্নয়ন নোটিশ',
    status: 'active',
    order: 1,
  },
  {
    id: 'civic_initiatives',
    featureId: 'public_feed',
    nameEn: 'Voluntary Civic Initiatives',
    nameBn: 'নাগরিক উদ্যোগ ও স্বেচ্ছাসেবা',
    status: 'active',
    order: 2,
  },
  {
    id: 'neighborhood_discussions',
    featureId: 'public_feed',
    nameEn: 'Neighborhood Discussions',
    nameBn: 'এলাকাভিত্তিক গঠনমূলক আলোচনা',
    status: 'active',
    order: 3,
  },
  {
    id: 'lost_and_found',
    featureId: 'public_feed',
    nameEn: 'Lost & Found Civic Desk',
    nameBn: 'হারানো ও প্রাপ্তি বিজ্ঞপ্তি',
    status: 'active',
    order: 4,
  },
];

// 3. Subcategories Dataset (Demo Subcategory Data)
export let MOCK_SUBCATEGORIES: Subcategory[] = [
  // --- Roads & Traffic (roads_traffic) ---
  {
    id: 'open_manhole',
    categoryId: 'roads_traffic',
    featureId: 'complaints',
    nameEn: 'Open / Broken Manhole',
    nameBn: 'উন্মুক্ত বা ভাঙা ম্যানহোল',
    status: 'active',
    order: 1,
  },
  {
    id: 'potholes_damaged_road',
    categoryId: 'roads_traffic',
    featureId: 'complaints',
    nameEn: 'Potholes & Broken Surface',
    nameBn: 'খানাখন্দ ও ভাঙাচোরা সড়ক',
    status: 'active',
    order: 2,
  },
  {
    id: 'illegal_parking_block',
    categoryId: 'roads_traffic',
    featureId: 'complaints',
    nameEn: 'Illegal Vehicle Stand / Encroachment',
    nameBn: 'অবৈধ পার্কিং ও যানবাহন স্ট্যান্ড',
    status: 'active',
    order: 3,
  },
  {
    id: 'culvert_bridge_hazard',
    categoryId: 'roads_traffic',
    featureId: 'complaints',
    nameEn: 'Damaged Culvert / Footbridge',
    nameBn: 'ঝুঁকিপূর্ণ ফুটওভার ব্রিজ ও কালভার্ট',
    status: 'active',
    order: 4,
  },
  {
    id: 'broken_traffic_signal',
    categoryId: 'roads_traffic',
    featureId: 'complaints',
    nameEn: 'Traffic Signal Malfunction',
    nameBn: 'ট্রাফিক সিগন্যাল বিকল',
    status: 'active',
    order: 5,
  },

  // --- Waste Management (waste_management) ---
  {
    id: 'uncollected_garbage',
    categoryId: 'waste_management',
    featureId: 'complaints',
    nameEn: 'Uncollected Roadside Garbage Dump',
    nameBn: 'রাস্তার পাশে অনপসারিত ময়লার স্তূপ',
    status: 'active',
    order: 1,
  },
  {
    id: 'dustbin_overflow',
    categoryId: 'waste_management',
    featureId: 'complaints',
    nameEn: 'Public Dustbin Overflow',
    nameBn: 'উন্মুক্ত ডাস্টবিন উপচে পড়া',
    status: 'active',
    order: 2,
  },
  {
    id: 'medical_waste_dumping',
    categoryId: 'waste_management',
    featureId: 'complaints',
    nameEn: 'Unsafe Hazardous / Medical Waste',
    nameBn: 'মেডিকেল বা ঝুঁকিপূর্ণ বর্জ্য ফেলা',
    status: 'active',
    order: 3,
  },
  {
    id: 'drain_clogging_plastics',
    categoryId: 'waste_management',
    featureId: 'complaints',
    nameEn: 'Plastics Clogging Surface Drains',
    nameBn: 'ড্রেনে প্লাস্টিক বর্জ্য ফেলে পানি আটকে রাখা',
    status: 'active',
    order: 4,
  },

  // --- Water & Drainage (water_drainage) ---
  {
    id: 'water_pipeline_leak',
    categoryId: 'water_drainage',
    featureId: 'complaints',
    nameEn: 'WASA Water Main Pipeline Leakage',
    nameBn: 'খাবার পানির পাইপলাইন ফুটো / লিকেজ',
    status: 'active',
    order: 1,
  },
  {
    id: 'street_waterlogging',
    categoryId: 'water_drainage',
    featureId: 'complaints',
    nameEn: 'Severe Street Inundation / Waterlogging',
    nameBn: 'বৃষ্টিতে দীর্ঘস্থায়ী জলাবদ্ধতা',
    status: 'active',
    order: 2,
  },
  {
    id: 'contaminated_tap_water',
    categoryId: 'water_drainage',
    featureId: 'complaints',
    nameEn: 'Murky / Odorous Tap Water Supply',
    nameBn: 'সরবরাহের পানিতে দুর্গন্ধ ও ময়লা',
    status: 'active',
    order: 3,
  },
  {
    id: 'sewer_line_overflow',
    categoryId: 'water_drainage',
    featureId: 'complaints',
    nameEn: 'Underground Sewer Overflow',
    nameBn: 'স্যুয়ারেজ লাইন উপচে ড্রেনেজ বন্ধ',
    status: 'active',
    order: 4,
  },

  // --- Electricity & Utilities (electricity_utilities) ---
  {
    id: 'street_light_outage',
    categoryId: 'electricity_utilities',
    featureId: 'complaints',
    nameEn: 'Broken / Dead Street Light',
    nameBn: 'সড়ক বাতি বিকল বা বাতিহীন অন্ধ গলি',
    status: 'active',
    order: 1,
  },
  {
    id: 'exposed_hanging_wire',
    categoryId: 'electricity_utilities',
    featureId: 'complaints',
    nameEn: 'Dangerous Hanging Electrical Wires',
    nameBn: 'বিপজ্জনক ঝুলন্ত বিদ্যুতের তার',
    status: 'active',
    order: 2,
  },
  {
    id: 'gas_pipeline_leak',
    categoryId: 'electricity_utilities',
    featureId: 'complaints',
    nameEn: 'Titas Gas Line Leakage & Hazard',
    nameBn: 'গ্যাস লাইনের লিকেজ ও তীব্র গন্ধ',
    status: 'active',
    order: 3,
  },
  {
    id: 'transformer_sparking',
    categoryId: 'electricity_utilities',
    featureId: 'complaints',
    nameEn: 'Damaged Transformer / Fuse Spark',
    nameBn: 'ট্রান্সফরমার বিকল ও অতিরিক্ত লোড',
    status: 'active',
    order: 4,
  },

  // --- Extortion (extortion) ---
  {
    id: 'market_toll_extortion',
    categoryId: 'extortion',
    featureId: 'complaints',
    nameEn: 'Forced Toll on Street Hawkers / Vendors',
    nameBn: 'ফুটপাতের দোকান ও হকারদের থেকে জোরপূর্বক চাঁদা',
    status: 'active',
    order: 1,
  },
  {
    id: 'transport_stand_toll',
    categoryId: 'extortion',
    featureId: 'complaints',
    nameEn: 'Illegal Transport / Rickshaw Stand Toll',
    nameBn: 'রিকশা বা বাস স্ট্যান্ডে অবৈধ চাঁদা আদায়',
    status: 'active',
    order: 2,
  },
  {
    id: 'construction_extortion',
    categoryId: 'extortion',
    featureId: 'complaints',
    nameEn: 'Blackmail / Extortion on House Construction',
    nameBn: 'বাড়ি বা দোকান নির্মাণকাজে চাঁদা দাবি',
    status: 'active',
    order: 3,
  },

  // --- Harassment (harassment) ---
  {
    id: 'street_harassment',
    categoryId: 'harassment',
    featureId: 'complaints',
    nameEn: 'Eve-teasing & Stalking on Walkways',
    nameBn: 'ফুটপাত ও চলাচলের পথে উত্ত্যক্তকরণ',
    status: 'active',
    order: 1,
  },
  {
    id: 'footbridge_gang_hazard',
    categoryId: 'harassment',
    featureId: 'complaints',
    nameEn: 'Dark Footbridge Loitering / Gangs',
    nameBn: 'অন্ধকার ফুটওভার ব্রিজে বখাটেদের আড্ডা',
    status: 'active',
    order: 2,
  },
  {
    id: 'bus_terminal_harassment',
    categoryId: 'harassment',
    featureId: 'complaints',
    nameEn: 'Harassment at Bus Stands & Crossings',
    nameBn: 'বাস স্ট্যান্ড ও মোড়ে যাত্রীদের সাথে দুর্ব্যবহার',
    status: 'active',
    order: 3,
  },

  // --- Corruption (corruption) ---
  {
    id: 'bribe_trade_license',
    categoryId: 'corruption',
    featureId: 'complaints',
    nameEn: 'Bribery Demand for Permits / Trade License',
    nameBn: 'ট্রেড লাইসেন্স বা নকশা অনুমোদনে ঘুষ দাবি',
    status: 'active',
    order: 1,
  },
  {
    id: 'intentional_delay',
    categoryId: 'corruption',
    featureId: 'complaints',
    nameEn: 'Intentional Processing Delay & Neglect',
    nameBn: 'সেবা প্রদানে অযথা ফাইল আটকে রাখা',
    status: 'active',
    order: 2,
  },
  {
    id: 'civic_asset_misuse',
    categoryId: 'corruption',
    featureId: 'complaints',
    nameEn: 'Misuse of Civic Assets & Machinery',
    nameBn: 'সরকারি গাড়ি ও যন্ত্রপাতির ব্যক্তিগত অপব্যবহার',
    status: 'active',
    order: 3,
  },

  // --- Civic Issues (civic_issues) ---
  {
    id: 'noise_pollution',
    categoryId: 'civic_issues',
    featureId: 'complaints',
    nameEn: 'Excessive Loudspeaker / Industrial Noise',
    nameBn: 'তীব্র শব্দ দূষণ ও মাইকিং',
    status: 'active',
    order: 1,
  },
  {
    id: 'stray_animal_hazard',
    categoryId: 'civic_issues',
    featureId: 'complaints',
    nameEn: 'Stray Animal Bites & Hazard',
    nameBn: 'বেওয়ারিশ কুকুরের উপদ্রব',
    status: 'active',
    order: 2,
  },
  {
    id: 'park_neglect',
    categoryId: 'civic_issues',
    featureId: 'complaints',
    nameEn: 'Public Park / Playground Neglect',
    nameBn: 'খেলার মাঠ ও পার্কের অব্যবস্থাপনা',
    status: 'active',
    order: 3,
  },
  {
    id: 'spam_commercial',
    categoryId: 'civic_issues',
    featureId: 'complaints',
    nameEn: 'Invalid / Commercial Spam Submissions',
    nameBn: 'বাণিজ্যিক প্রচারপত্র বা ভুয়া এন্ট্রি',
    status: 'active',
    order: 4,
  },

  // --- Public Feed: Community Updates (community_updates) ---
  {
    id: 'ward_notices',
    categoryId: 'community_updates',
    featureId: 'public_feed',
    nameEn: 'Ward Councillor Official Notice',
    nameBn: 'ওয়ার্ড কাউন্সিলর দাপ্তরিক বার্তা',
    status: 'active',
    order: 1,
  },
  {
    id: 'utility_schedule',
    categoryId: 'community_updates',
    featureId: 'public_feed',
    nameEn: 'Road Digging & Utility Works Schedule',
    nameBn: 'রাস্তা খোঁড়াখুঁড়ি ও উন্নয়ন কাজের সময়সূচি',
    status: 'active',
    order: 2,
  },

  // --- Public Feed: Civic Initiatives (civic_initiatives) ---
  {
    id: 'cleanliness_campaign',
    categoryId: 'civic_initiatives',
    featureId: 'public_feed',
    nameEn: 'Volunteer Cleanliness Drive',
    nameBn: 'স্বেচ্ছাশ্রম পরিচ্ছন্নতা অভিযান',
    status: 'active',
    order: 1,
  },
  {
    id: 'tree_planting',
    categoryId: 'civic_initiatives',
    featureId: 'public_feed',
    nameEn: 'Community Green Plantation',
    nameBn: 'সবুজায়ন ও বৃক্ষরোপণ কর্মসূচি',
    status: 'active',
    order: 2,
  },

  // --- Public Feed: Neighborhood Discussions (neighborhood_discussions) ---
  {
    id: 'traffic_solutions',
    categoryId: 'neighborhood_discussions',
    featureId: 'public_feed',
    nameEn: 'Local Traffic Solutions & Proposals',
    nameBn: 'এলাকার যানজট নিরসনে নাগরিক পরামর্শ',
    status: 'active',
    order: 1,
  },
  {
    id: 'security_watch',
    categoryId: 'neighborhood_discussions',
    featureId: 'public_feed',
    nameEn: 'Night Guard & Security Patrol',
    nameBn: 'নৈশপ্রহরী ও সিসিটিভি নিরাপত্তা আলোচনা',
    status: 'active',
    order: 2,
  },

  // --- Public Feed: Lost & Found (lost_and_found) ---
  {
    id: 'found_documents',
    categoryId: 'lost_and_found',
    featureId: 'public_feed',
    nameEn: 'Found NID / Student Cards',
    nameBn: 'প্রাপ্ত জাতীয় পরিচয়পত্র বা আইডি কার্ড',
    status: 'active',
    order: 1,
  },
  {
    id: 'lost_belongings',
    categoryId: 'lost_and_found',
    featureId: 'public_feed',
    nameEn: 'Lost Vehicle Keys & Belongings',
    nameBn: 'হারানো গাড়ির চাবি ও জরুরি সামগ্রী',
    status: 'active',
    order: 2,
  },
];

// Helper delay to emulate network latency
const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockCategoryService = {
  /**
   * Get all features
   */
  async getFeatures(): Promise<Feature[]> {
    await delay();
    return [...MOCK_FEATURES].sort((a, b) => a.order - b.order);
  },

  /**
   * Get single feature by ID
   */
  async getFeatureById(id: string): Promise<Feature | null> {
    await delay();
    const feat = MOCK_FEATURES.find((f) => f.id === id);
    return feat ? { ...feat } : null;
  },

  /**
   * Get categories, optionally filtered by feature or custom filters
   */
  async getCategories(
    featureId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<Category[]> {
    await delay();
    let result = [...MOCK_CATEGORIES];

    // Filter by Feature
    if (featureId && featureId !== 'all') {
      result = result.filter((c) => c.featureId === featureId);
    } else if (filters?.featureId && filters.featureId !== 'all') {
      result = result.filter((c) => c.featureId === filters.featureId);
    }

    // Filter by Status
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((c) => c.status === filters.status);
    }

    // Search query across EN and BN names & ID
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.nameEn.toLowerCase().includes(q) ||
          c.nameBn.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.order - b.order);
  },

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category | null> {
    await delay();
    const cat = MOCK_CATEGORIES.find((c) => c.id === id);
    return cat ? { ...cat } : null;
  },

  /**
   * Get subcategories, optionally filtered by category or custom filters
   */
  async getSubcategories(
    categoryId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<Subcategory[]> {
    await delay();
    let result = [...MOCK_SUBCATEGORIES];

    if (categoryId && categoryId !== 'all') {
      result = result.filter((s) => s.categoryId === categoryId);
    } else if (filters?.categoryId && filters.categoryId !== 'all') {
      result = result.filter((s) => s.categoryId === filters.categoryId);
    }

    if (filters?.featureId && filters.featureId !== 'all') {
      result = result.filter((s) => s.featureId === filters.featureId);
    }

    if (filters?.status && filters.status !== 'all') {
      result = result.filter((s) => s.status === filters.status);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.nameEn.toLowerCase().includes(q) ||
          s.nameBn.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.order - b.order);
  },

  /**
   * Get single subcategory by ID
   */
  async getSubcategoryById(id: string): Promise<Subcategory | null> {
    await delay();
    const sub = MOCK_SUBCATEGORIES.find((s) => s.id === id);
    return sub ? { ...sub } : null;
  },

  /**
   * Get full hierarchy tree structure
   */
  async getCategoryTree(
    selectedFeatureId?: string,
    filters?: Partial<CategoryFilterState>
  ): Promise<FeatureTreeNode[]> {
    await delay();
    let features = [...MOCK_FEATURES];
    if (selectedFeatureId && selectedFeatureId !== 'all') {
      features = features.filter((f) => f.id === selectedFeatureId);
    }

    const searchQuery = filters?.search?.trim().toLowerCase();
    const statusFilter = filters?.status;

    return features
      .map((feat) => {
        let categories = MOCK_CATEGORIES.filter((c) => c.featureId === feat.id);

        if (statusFilter && statusFilter !== 'all') {
          categories = categories.filter((c) => c.status === statusFilter);
        }

        const categoryNodes: CategoryTreeNode[] = categories
          .map((cat) => {
            let subcategories = MOCK_SUBCATEGORIES.filter(
              (s) => s.categoryId === cat.id
            );

            if (statusFilter && statusFilter !== 'all') {
              subcategories = subcategories.filter(
                (s) => s.status === statusFilter
              );
            }

            // Search filter matching
            if (searchQuery) {
              const catMatches =
                cat.nameEn.toLowerCase().includes(searchQuery) ||
                cat.nameBn.toLowerCase().includes(searchQuery) ||
                cat.id.toLowerCase().includes(searchQuery);

              const matchedSubs = subcategories.filter(
                (s) =>
                  s.nameEn.toLowerCase().includes(searchQuery) ||
                  s.nameBn.toLowerCase().includes(searchQuery) ||
                  s.id.toLowerCase().includes(searchQuery)
              );

              if (catMatches) {
                return {
                  ...cat,
                  subcategories,
                };
              }

              if (matchedSubs.length > 0) {
                return {
                  ...cat,
                  subcategories: matchedSubs,
                };
              }

              return null;
            }

            return {
              ...cat,
              subcategories,
            };
          })
          .filter(Boolean) as CategoryTreeNode[];

        return {
          ...feat,
          categories: categoryNodes.sort((a, b) => a.order - b.order),
        };
      })
      .filter((feat) => feat.categories.length > 0 || !searchQuery)
      .sort((a, b) => a.order - b.order);
  },

  /**
   * Toggle / Update status of Feature
   */
  async updateFeatureStatus(
    id: string,
    status: CategoryStatus
  ): Promise<Feature> {
    await delay();
    const idx = MOCK_FEATURES.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error(`Feature ${id} not found`);
    MOCK_FEATURES[idx] = {
      ...MOCK_FEATURES[idx],
      status,
    };
    return { ...MOCK_FEATURES[idx] };
  },

  /**
   * Toggle / Update status of Category
   */
  async updateCategoryStatus(
    id: string,
    status: CategoryStatus
  ): Promise<Category> {
    await delay();
    const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Category ${id} not found`);
    MOCK_CATEGORIES[idx] = {
      ...MOCK_CATEGORIES[idx],
      status,
    };
    return { ...MOCK_CATEGORIES[idx] };
  },

  /**
   * Toggle / Update status of Subcategory
   */
  async updateSubcategoryStatus(
    id: string,
    status: CategoryStatus
  ): Promise<Subcategory> {
    await delay();
    const idx = MOCK_SUBCATEGORIES.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Subcategory ${id} not found`);
    MOCK_SUBCATEGORIES[idx] = {
      ...MOCK_SUBCATEGORIES[idx],
      status,
    };
    return { ...MOCK_SUBCATEGORIES[idx] };
  },

  /**
   * Get Category taxonomy overview statistics
   */
  async getCategoryStats(): Promise<{
    totalFeatures: number;
    totalCategories: number;
    totalSubcategories: number;
    activeCategories: number;
    inactiveCategories: number;
  }> {
    await delay();
    return {
      totalFeatures: MOCK_FEATURES.length,
      totalCategories: MOCK_CATEGORIES.length,
      totalSubcategories: MOCK_SUBCATEGORIES.length,
      activeCategories: MOCK_CATEGORIES.filter((c) => c.status === 'active').length,
      inactiveCategories: MOCK_CATEGORIES.filter((c) => c.status === 'inactive').length,
    };
  },
};

export default mockCategoryService;
