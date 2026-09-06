/**
 * Response Fallback Service
 * Provides mock fixtures and in-memory workflows for response moderation in development mode.
 */

import {
  ResponseItem,
  ResponseFilterState,
  ResponseListResponse,
  ResponseStatusFilter,
  ResponseTimelineEvent,
  ResponseWorkflowResult,
  ResponseStatus,
} from '@/types/Response';

const INITIAL_MOCK_RESPONSES: ResponseItem[] = [
  {
    id: 'RSP-20401',
    relatedType: 'complaint',
    relatedId: 'CMP-10492',
    relatedTitleEn: 'Massive pothole near Mirpur 10 roundabout causing extreme traffic gridlock',
    relatedTitleBn: 'মিরপুর ১০ গোলচত্বরে বিশাল গর্তের কারণে তীব্র যানজট সৃষ্টি হচ্ছে',
    categoryId: 'roads_traffic',
    categoryEn: 'Roads & Traffic',
    categoryBn: 'রাস্তাঘাট ও ট্রাফিক',
    ward: 'Ward 14',
    author: {
      id: 'auth-dncc-01',
      name: 'Engr. Tariqul Islam',
      nameBn: 'প্রকৌ. তরিকুল ইসলাম',
      role: 'official',
      roleTitleEn: 'Executive Engineer',
      roleTitleBn: 'নির্বাহী প্রকৌশলী',
      departmentEn: 'Zone 4 Engineering Dept.',
      departmentBn: 'অঞ্চল ৪ প্রকৌশল বিভাগ',
      organizationEn: 'Dhaka North City Corporation (DNCC)',
      organizationBn: 'ঢাকা উত্তর সিটি কর্পোরেশন',
      designationEn: 'Executive Engineer (Civil)',
      designationBn: 'নির্বাহী প্রকৌশলী (পুর)',
      isVerified: true,
      isOfficial: true,
    },
    contentEn:
      'We have inspected the site at Mirpur 10 roundabout. Our road maintenance team has been mobilized with cold-mix asphalt and stone ballast. Repair operations are scheduled tonight from 11:30 PM to minimize commuter inconvenience.',
    contentBn:
      'আমরা মিরপুর ১০ গোলচত্বরের স্থানটি পরিদর্শন করেছি। আমাদের সড়ক রক্ষণাবেক্ষণ দল কোল্ড-মিক্স অ্যাসফল্ট ও পাথরের খোয়া নিয়ে প্রস্তুত রয়েছে। যানজট এড়াতে আজ রাত ১১:৩০ মিনিটে মেরামত কাজ শুরু হবে।',
    publicContentEn:
      'DNCC engineering inspection complete. Urgent road resurfacing at Mirpur 10 roundabout scheduled tonight starting 11:30 PM.',
    publicContentBn:
      'ডিএনসিসি প্রকৌশল পরিদর্শন সম্পন্ন। মিরপুর ১০ গোলচত্বরে আজ রাত ১১:৩০ মিনিট থেকে জরুরি সড়ক মেরামত কাজ শুরু হবে।',
    status: 'pending_review',
    isOfficial: true,
    isPubliclyVisible: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    media: [
      {
        id: 'med-rsp-01',
        url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        caption: 'Inspection conducted by DNCC Zone 4 Engineering team',
      },
    ],
  },
  {
    id: 'RSP-20402',
    relatedType: 'complaint',
    relatedId: 'CMP-10495',
    relatedTitleEn: 'Illegal waste dumping site near Mohammadpur Town Hall market',
    relatedTitleBn: 'মোহাম্মদপুর টাউন হল মার্কেটের কাছে অবৈধ বর্জ্যের ভাগাড়',
    categoryId: 'waste_management',
    categoryEn: 'Waste Management',
    categoryBn: 'বর্জ্য ব্যবস্থাপনা',
    ward: 'Ward 31',
    author: {
      id: 'auth-dncc-02',
      name: 'Salma Khatun',
      nameBn: 'সালমা খাতুন',
      role: 'official',
      roleTitleEn: 'Chief Waste Management Inspector',
      roleTitleBn: 'প্রধান বর্জ্য ব্যবস্থাপনা পরিদর্শক',
      departmentEn: 'Waste Management Dept.',
      departmentBn: 'বর্জ্য ব্যবস্থাপনা বিভাগ',
      organizationEn: 'Dhaka North City Corporation (DNCC)',
      organizationBn: 'ঢাকা উত্তর সিটি কর্পোরেশন',
      designationEn: 'Inspector',
      designationBn: 'পরিদর্শক',
      isVerified: true,
      isOfficial: true,
    },
    contentEn:
      'Two compactor trucks and eight conservancy workers have cleared 4.5 tons of accumulated garbage. Bleaching powder and disinfectant spray applied across the pavement.',
    contentBn:
      'দুটি কম্প্যাক্টর ট্রাক এবং আটজন পরিচ্ছন্নতাকর্মীর মাধ্যমে ৪.৫ টন পুঞ্জীভূত ময়লা অপসারণ করা হয়েছে। ফুটপাতে ব্লিচিং পাউডার ও জীবাণুনাশক ছিটানো হয়েছে।',
    publicContentEn:
      'Illegal waste cleared by DNCC conservancy team. Disinfectant applied.',
    publicContentBn:
      'ডিএনসিসি পরিচ্ছন্নতা দল কর্তৃক অবৈধ বর্জ্য অপসারণ করা হয়েছে এবং জীবাণুনাশক ছিটানো হয়েছে।',
    status: 'approved',
    isOfficial: true,
    isPubliclyVisible: false,
    reviewedBy: 'Senior Moderator Karim',
    reviewedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    moderatorNotes: 'Verified official documentation and clearance photos.',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'RSP-20403',
    relatedType: 'complaint',
    relatedId: 'CMP-10499',
    relatedTitleEn: 'Severe waterlogging and open manhole near Shantinagar crossing',
    relatedTitleBn: 'শান্তিনগর মোড়ে তীব্র জলাবদ্ধতা এবং খোলা ম্যানহোল',
    categoryId: 'water_drainage',
    categoryEn: 'Water & Drainage',
    categoryBn: 'পানি ও পয়ঃনিষ্কাশন',
    ward: 'Ward 13',
    author: {
      id: 'auth-wasa-01',
      name: 'Engr. Mostafa Kamal',
      nameBn: 'প্রকৌ. মোস্তফা কামাল',
      role: 'official',
      roleTitleEn: 'Executive Engineer',
      roleTitleBn: 'নির্বাহী প্রকৌশলী',
      departmentEn: 'Drainage Division',
      departmentBn: 'ড্রেনেজ সার্কেল',
      organizationEn: 'Dhaka WASA',
      organizationBn: 'ঢাকা ওয়াসা',
      designationEn: 'Executive Engineer',
      designationBn: 'নির্বাহী প্রকৌশলী',
      isVerified: true,
      isOfficial: true,
    },
    contentEn:
      'Heavy-duty dewatering pumps have removed excess stagnant water. Concrete slab replaced on the exposed manhole with safety reflective bar markings.',
    contentBn:
      'উচ্চ ক্ষমতাসম্পন্ন ডি-ওয়াটারিং পাম্প দিয়ে জমে থাকা পানি নিষ্কাশন করা হয়েছে। খোলা ম্যানহোলে নতুন কংক্রিট স্ল্যাব স্থাপন ও সতর্কতামূলক রিফ্লেক্টিভ বার লাগানো হয়েছে।',
    publicContentEn:
      'Dhaka WASA resolved Shantinagar waterlogging and secured open manhole with concrete cover.',
    publicContentBn:
      'ঢাকা ওয়াসা শান্তিনগরের জলাবদ্ধতা নিরসন করেছে এবং উন্মুক্ত ম্যানহোলে কংক্রিট ঢাকনা স্থাপন করেছে।',
    status: 'published',
    isOfficial: true,
    isPubliclyVisible: true,
    reviewedBy: 'Admin Supervisor',
    reviewedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    publishedAt: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'RSP-20404',
    relatedType: 'post',
    relatedId: 'PST-101',
    relatedTitleEn: 'Commercial truck parking blocking school gates in Lalmatia Block C',
    relatedTitleBn: 'লালমাটিয়া সি ব্লকে স্কুলের গেট আটকে বাণিজ্যিক ট্রাক পার্কিং',
    categoryId: 'roads_traffic',
    categoryEn: 'Roads & Traffic',
    categoryBn: 'রাস্তাঘাট ও ট্রাফিক',
    ward: 'Ward 32',
    author: {
      id: 'auth-cit-01',
      name: 'Rahim Chowdhury',
      nameBn: 'রহিম চৌধুরী',
      role: 'citizen',
      roleTitleEn: 'Verified Resident',
      roleTitleBn: 'যাচাইকৃত বাসিন্দা',
      isVerified: true,
      isOfficial: false,
    },
    contentEn:
      'The local police patrol visited around 3 PM today and issued fines to two trucks. However, unauthorized parking resumes after 9 PM. Stricter night monitoring needed.',
    contentBn:
      'আজ বিকেল ৩টায় ট্রাফিক পুলিশ টহল দিয়ে দুটি ট্রাককে জরিমানা করেছে। তবে রাত ৯টার পর আবারও অবৈধ পার্কিং শুরু হয়। রাতের বেলা কঠোর নজরদারি প্রয়োজন।',
    status: 'pending_review',
    isOfficial: false,
    isPubliclyVisible: false,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'RSP-20405',
    relatedType: 'complaint',
    relatedId: 'CMP-10488',
    relatedTitleEn: 'Fallen electric wire across residential street in Uttara Sector 4',
    relatedTitleBn: 'উত্তরা ৪ নম্বর সেক্টরে আবাসিক রাস্তায় ছিঁড়ে পড়া বিদ্যুতের তার',
    categoryId: 'electricity_gas',
    categoryEn: 'Electricity & Utilities',
    categoryBn: 'বিদ্যুৎ ও জ্বালানি',
    ward: 'Ward 01',
    author: {
      id: 'auth-desco-01',
      name: 'Ashraful Haque',
      nameBn: 'আশরাফুল হক',
      role: 'official',
      roleTitleEn: 'Assistant Engineer',
      roleTitleBn: 'সহকারী প্রকৌশলী',
      departmentEn: 'Uttara Sub-division',
      departmentBn: 'উত্তরা উপ-বিভাগ',
      organizationEn: 'DESCO',
      organizationBn: 'ডেসকো',
      designationEn: 'Emergency Response Lead',
      designationBn: 'জরুরি দলনেতা',
      isVerified: true,
      isOfficial: true,
    },
    contentEn:
      'Emergency maintenance line cut off immediately. New insulated LT cable installed and electricity restored safely at 4:15 PM.',
    contentBn:
      'জরুরি ভিত্তিতে লাইন বন্ধ করা হয়েছিল। নতুন ইন্সুলেটেড এলটি ক্যাবল টেনে বিকেল ৪:১৫ মিনিটে নিরাপদভাবে বিদ্যুৎ সংযোগ পুনঃস্থাপন করা হয়েছে।',
    publicContentEn:
      'DESCO emergency crew replaced snapped cable and restored power safely.',
    publicContentBn:
      'ডেসকো জরুরি টিম তার মেরামত করে নিরাপদভাবে বিদ্যুৎ সংযোগ স্বাভাবিক করেছে।',
    status: 'published',
    isOfficial: true,
    isPubliclyVisible: true,
    reviewedBy: 'Admin Supervisor',
    reviewedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    publishedAt: new Date(Date.now() - 86400000 * 4 + 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'RSP-20406',
    relatedType: 'complaint',
    relatedId: 'CMP-10477',
    relatedTitleEn: 'Broken street lamps in Dhanmondi Road 8A leaving street pitch black',
    relatedTitleBn: 'ধানমন্ডি ৮/এ রোডে সড়কবাতি বিকল থাকায় সম্পূর্ণ অন্ধকার',
    categoryId: 'street_lighting',
    categoryEn: 'Street Lighting & Signals',
    categoryBn: 'সড়ক বাতি ও সংকেত',
    ward: 'Ward 15',
    author: {
      id: 'auth-unv-01',
      name: 'Unverified Anonymous',
      role: 'citizen',
      roleTitleEn: 'Anonymous Citizen',
      roleTitleBn: 'নাম প্রকাশে অনিচ্ছুক',
      isVerified: false,
      isOfficial: false,
    },
    contentEn:
      'Promotional text offering electrical repair private services for fee. Call 01700-XXXXXX for private wiring work.',
    contentBn:
      'ব্যক্তিগত বৈদ্যুতিক কাজের বিজ্ঞাপন। প্রাইভেট কাজের জন্য কল করুন।',
    status: 'rejected',
    isOfficial: false,
    isPubliclyVisible: false,
    rejectionReason: 'commercial_spam',
    rejectionExplanation:
      'The submission contains commercial advertising and spam unrelated to official civic remediation.',
    reviewedBy: 'Moderator Farhan',
    reviewedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3 - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'RSP-20407',
    relatedType: 'post',
    relatedId: 'PST-104',
    relatedTitleEn: 'Aggressive stray dog pack near Banani cemetery road',
    relatedTitleBn: 'বনানী কবরস্থান সড়কে বেপরোয়া কুকুরের উপদ্রব',
    categoryId: 'civic_issues',
    categoryEn: 'Civic Issues',
    categoryBn: 'নাগরিক সেবা ও অন্যান্য',
    ward: 'Ward 19',
    author: {
      id: 'auth-dncc-03',
      name: 'Dr. Mahmudul Hasan',
      nameBn: 'ডা. মাহমুদুল হাসান',
      role: 'official',
      roleTitleEn: 'Veterinary Officer',
      roleTitleBn: 'ভেটেরিনারি কর্মকর্তা',
      departmentEn: 'Health & Animal Control',
      departmentBn: 'স্বাস্থ্য ও প্রাণিসম্পদ',
      organizationEn: 'DNCC',
      organizationBn: 'ডিএনসিসি',
      designationEn: 'Veterinary Officer',
      designationBn: 'ভেটেরিনারি সার্জন',
      isVerified: true,
      isOfficial: true,
    },
    contentEn:
      'Canine vaccination and sterilization drive scheduled in Banani Zone 3 on Thursday in coordination with local animal welfare organizations.',
    contentBn:
      'স্থানীয় প্রাণীকল্যাণ সংস্থার সমন্বয়ে আগামী বৃহস্পতিবার বনানী অঞ্চল ৩ এ জলাতঙ্ক টিকাদান ও জন্মনিয়ন্ত্রণ কার্যক্রম পরিচালিত হবে।',
    publicContentEn:
      'DNCC animal welfare team scheduled vaccination drive in Banani Zone 3 on Thursday.',
    publicContentBn:
      'ডিএনসিসি টিম আগামী বৃহস্পতিবার বনানী এলাকায় টিকাদান কার্যক্রম পরিচালনা করবে।',
    status: 'unpublished',
    isOfficial: true,
    isPubliclyVisible: false,
    unpublishReason: 'Rescheduled date to next week due to inclement weather forecast.',
    reviewedBy: 'Admin Supervisor',
    reviewedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

class ResponseFallbackStore {
  private responses: ResponseItem[] = [...INITIAL_MOCK_RESPONSES];
  private timelineMap: Map<string, ResponseTimelineEvent[]> = new Map();

  constructor() {
    this.initTimelines();
  }

  private initTimelines() {
    this.responses.forEach((rsp) => {
      const events: ResponseTimelineEvent[] = [
        {
          id: `tl-${rsp.id}-1`,
          responseId: rsp.id,
          action: 'submitted',
          titleEn: 'Response Submitted',
          titleBn: 'প্রতিক্রিয়া দাখিল করা হয়েছে',
          descriptionEn: `Submitted by ${rsp.author.name} (${rsp.author.roleTitleEn})`,
          descriptionBn: `${rsp.author.nameBn || rsp.author.name} কর্তৃক দাখিল করা হয়েছে`,
          actor: {
            name: rsp.author.name,
            role: rsp.author.role,
          },
          timestamp: rsp.createdAt,
        },
      ];

      if (rsp.status === 'approved' || rsp.status === 'published') {
        events.push({
          id: `tl-${rsp.id}-2`,
          responseId: rsp.id,
          action: 'approved',
          titleEn: 'Response Approved',
          titleBn: 'প্রতিক্রিয়া অনুমোদিত হয়েছে',
          descriptionEn: `Approved by ${rsp.reviewedBy || 'Moderator'}`,
          descriptionBn: `${rsp.reviewedBy || 'মডারেটর'} কর্তৃক অনুমোদিত`,
          actor: {
            name: rsp.reviewedBy || 'Moderator',
            role: 'moderator',
          },
          timestamp: rsp.reviewedAt || rsp.createdAt,
        });
      }

      if (rsp.status === 'published') {
        events.push({
          id: `tl-${rsp.id}-3`,
          responseId: rsp.id,
          action: 'published',
          titleEn: 'Response Published to Public View',
          titleBn: 'সর্বসাধারণের জন্য প্রকাশিত',
          descriptionEn: 'Published to the live public citizen platform',
          descriptionBn: 'লাইভ নাগরিক প্ল্যাটফর্মে উন্মুক্ত করা হয়েছে',
          actor: {
            name: rsp.reviewedBy || 'Admin',
            role: 'admin',
          },
          timestamp: rsp.publishedAt || rsp.updatedAt,
        });
      }

      if (rsp.status === 'rejected') {
        events.push({
          id: `tl-${rsp.id}-rej`,
          responseId: rsp.id,
          action: 'rejected',
          titleEn: 'Response Rejected',
          titleBn: 'প্রতিক্রিয়া প্রত্যাখ্যান করা হয়েছে',
          descriptionEn: rsp.rejectionExplanation || 'Rejected during moderation',
          descriptionBn: rsp.rejectionExplanation || 'মডারেশন পর্যায়ে বাতিল করা হয়েছে',
          actor: {
            name: rsp.reviewedBy || 'Moderator',
            role: 'moderator',
          },
          timestamp: rsp.reviewedAt || rsp.updatedAt,
        });
      }

      if (rsp.status === 'unpublished') {
        events.push({
          id: `tl-${rsp.id}-unp`,
          responseId: rsp.id,
          action: 'unpublished',
          titleEn: 'Response Unpublished',
          titleBn: 'প্রতিক্রিয়া অপ্রকাশিত করা হয়েছে',
          descriptionEn: rsp.unpublishReason || 'Unpublished by administrator',
          descriptionBn: rsp.unpublishReason || 'অ্যাডমিন কর্তৃক অপ্রকাশিত',
          actor: {
            name: 'Administrator',
            role: 'admin',
          },
          timestamp: rsp.updatedAt,
        });
      }

      this.timelineMap.set(rsp.id, events);
    });
  }

  async getResponses(
    filters: Partial<ResponseFilterState> = {},
    page = 1,
    limit = 10
  ): Promise<ResponseListResponse> {
    let filtered = [...this.responses];

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    // Related type filter
    if (filters.relatedType && filters.relatedType !== 'all') {
      filtered = filtered.filter((r) => r.relatedType === filters.relatedType);
    }

    // Author role filter
    if (filters.authorRole && filters.authorRole !== 'all') {
      filtered = filtered.filter((r) =>
        filters.authorRole === 'official' ? r.author.role === 'official' : r.author.role !== 'official'
      );
    }

    // Category filter
    if (filters.categoryId && filters.categoryId !== 'all') {
      filtered = filtered.filter((r) => r.categoryId === filters.categoryId);
    }

    // Search query
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.relatedId.toLowerCase().includes(q) ||
          r.relatedTitleEn.toLowerCase().includes(q) ||
          r.relatedTitleBn.toLowerCase().includes(q) ||
          r.contentEn.toLowerCase().includes(q) ||
          r.contentBn.toLowerCase().includes(q) ||
          r.author.name.toLowerCase().includes(q) ||
          (r.author.nameBn && r.author.nameBn.toLowerCase().includes(q)) ||
          (r.author.organizationEn && r.author.organizationEn.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate status counts
    const statusCounts = this.calculateCounts();

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      responses: paginated,
      total,
      page,
      limit,
      totalPages,
      statusCounts,
    };
  }

  private calculateCounts(): Record<ResponseStatusFilter, number> {
    const counts: Record<ResponseStatusFilter, number> = {
      all: this.responses.length,
      pending_review: 0,
      approved: 0,
      published: 0,
      rejected: 0,
      unpublished: 0,
    };

    this.responses.forEach((r) => {
      if (counts[r.status] !== undefined) {
        counts[r.status] += 1;
      }
    });

    return counts;
  }

  async getResponseById(id: string): Promise<ResponseItem | null> {
    const found = this.responses.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    return this.calculateCounts();
  }

  async approveResponse(responseId: string, notes?: string): Promise<ResponseWorkflowResult> {
    const index = this.responses.findIndex((r) => r.id === responseId);
    if (index === -1) {
      throw new Error(`Response ${responseId} not found.`);
    }

    const updated: ResponseItem = {
      ...this.responses[index],
      status: 'approved',
      reviewedBy: 'Active Admin',
      reviewedAt: new Date().toISOString(),
      moderatorNotes: notes || this.responses[index].moderatorNotes,
      updatedAt: new Date().toISOString(),
    };

    this.responses[index] = updated;

    // Timeline event
    const events = this.timelineMap.get(responseId) || [];
    events.push({
      id: `tl-${responseId}-${Date.now()}`,
      responseId,
      action: 'approved',
      titleEn: 'Response Approved',
      titleBn: 'প্রতিক্রিয়া অনুমোদিত হয়েছে',
      descriptionEn: notes ? `Approved with notes: "${notes}"` : 'Approved for publication',
      descriptionBn: notes ? `মন্তব্যসহ অনুমোদিত: "${notes}"` : 'প্রকাশের জন্য অনুমোদিত',
      actor: {
        name: 'Active Admin',
        role: 'admin',
      },
      timestamp: new Date().toISOString(),
    });
    this.timelineMap.set(responseId, events);

    return {
      success: true,
      message: 'Response approved successfully.',
      response: updated,
    };
  }

  async publishResponse(
    responseId: string,
    options?: { notes?: string }
  ): Promise<ResponseWorkflowResult> {
    const index = this.responses.findIndex((r) => r.id === responseId);
    if (index === -1) {
      throw new Error(`Response ${responseId} not found.`);
    }

    const updated: ResponseItem = {
      ...this.responses[index],
      status: 'published',
      isPubliclyVisible: true,
      publishedAt: new Date().toISOString(),
      moderatorNotes: options?.notes || this.responses[index].moderatorNotes,
      updatedAt: new Date().toISOString(),
    };

    this.responses[index] = updated;

    const events = this.timelineMap.get(responseId) || [];
    events.push({
      id: `tl-${responseId}-${Date.now()}`,
      responseId,
      action: 'published',
      titleEn: 'Response Published to Live Feed',
      titleBn: 'লাইভ ফিডে প্রকাশিত হয়েছে',
      descriptionEn: options?.notes ? `Published: "${options.notes}"` : 'Published to public feed',
      descriptionBn: options?.notes ? `প্রকাশিত: "${options.notes}"` : 'সর্বসাধারণের জন্য প্রকাশিত',
      actor: {
        name: 'Active Admin',
        role: 'admin',
      },
      timestamp: new Date().toISOString(),
    });
    this.timelineMap.set(responseId, events);

    return {
      success: true,
      message: 'Response published to citizen platform.',
      response: updated,
    };
  }

  async unpublishResponse(responseId: string, reason: string): Promise<ResponseWorkflowResult> {
    const index = this.responses.findIndex((r) => r.id === responseId);
    if (index === -1) {
      throw new Error(`Response ${responseId} not found.`);
    }

    const updated: ResponseItem = {
      ...this.responses[index],
      status: 'unpublished',
      isPubliclyVisible: false,
      unpublishReason: reason,
      updatedAt: new Date().toISOString(),
    };

    this.responses[index] = updated;

    const events = this.timelineMap.get(responseId) || [];
    events.push({
      id: `tl-${responseId}-${Date.now()}`,
      responseId,
      action: 'unpublished',
      titleEn: 'Response Unpublished',
      titleBn: 'প্রতিক্রিয়া অপ্রকাশিত করা হয়েছে',
      descriptionEn: `Reason: ${reason}`,
      descriptionBn: `কারণ: ${reason}`,
      actor: {
        name: 'Active Admin',
        role: 'admin',
      },
      timestamp: new Date().toISOString(),
    });
    this.timelineMap.set(responseId, events);

    return {
      success: true,
      message: 'Response unpublished from public feed.',
      response: updated,
    };
  }

  async rejectResponse(
    responseId: string,
    reason: string,
    explanation: string
  ): Promise<ResponseWorkflowResult> {
    const index = this.responses.findIndex((r) => r.id === responseId);
    if (index === -1) {
      throw new Error(`Response ${responseId} not found.`);
    }

    const updated: ResponseItem = {
      ...this.responses[index],
      status: 'rejected',
      isPubliclyVisible: false,
      rejectionReason: reason,
      rejectionExplanation: explanation,
      reviewedBy: 'Active Admin',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.responses[index] = updated;

    const events = this.timelineMap.get(responseId) || [];
    events.push({
      id: `tl-${responseId}-${Date.now()}`,
      responseId,
      action: 'rejected',
      titleEn: 'Response Rejected',
      titleBn: 'প্রতিক্রিয়া প্রত্যাখ্যান করা হয়েছে',
      descriptionEn: `Reason: ${reason}. Details: ${explanation}`,
      descriptionBn: `কারণ: ${reason}। বিবরণ: ${explanation}`,
      actor: {
        name: 'Active Admin',
        role: 'admin',
      },
      timestamp: new Date().toISOString(),
    });
    this.timelineMap.set(responseId, events);

    return {
      success: true,
      message: 'Response marked as rejected.',
      response: updated,
    };
  }

  async updatePublicVersion(
    responseId: string,
    publicContentEn: string,
    publicContentBn: string
  ): Promise<ResponseWorkflowResult> {
    const index = this.responses.findIndex((r) => r.id === responseId);
    if (index === -1) {
      throw new Error(`Response ${responseId} not found.`);
    }

    const updated: ResponseItem = {
      ...this.responses[index],
      publicContentEn,
      publicContentBn,
      updatedAt: new Date().toISOString(),
    };

    this.responses[index] = updated;

    const events = this.timelineMap.get(responseId) || [];
    events.push({
      id: `tl-${responseId}-${Date.now()}`,
      responseId,
      action: 'updated',
      titleEn: 'Public Version Copy Edited',
      titleBn: 'পাবলিক ভার্সনের কপি সম্পাদিত হয়েছে',
      descriptionEn: 'Updated customer-facing summary in bilingual format',
      descriptionBn: 'দ্বিভাষিক পাবলিক সামারি আপডেট করা হয়েছে',
      actor: {
        name: 'Active Admin',
        role: 'admin',
      },
      timestamp: new Date().toISOString(),
    });
    this.timelineMap.set(responseId, events);

    return {
      success: true,
      message: 'Public version updated successfully.',
      response: updated,
    };
  }

  async getResponseTimeline(responseId: string): Promise<ResponseTimelineEvent[]> {
    const events = this.timelineMap.get(responseId) || [];
    return [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const responseFallback = new ResponseFallbackStore();
export default responseFallback;
