/**
 * Response Mock Data and Retrieval Service
 * Handles query processing, filtering, search, and pagination for responses.
 */

import {
  ResponseItem,
  ResponseFilterState,
  ResponseListResponse,
  ResponseStatusFilter,
} from '@/types/Response';

export const INITIAL_MOCK_RESPONSES: ResponseItem[] = [
  {
    id: 'RSP-901',
    relatedType: 'complaint',
    relatedId: 'CMP-10492',
    relatedTitleEn: 'Severe Road Subsidence & Broken Manhole near Mirpur 10',
    relatedTitleBn: 'মিরপুর ১০ গোলচত্বরে বিপজ্জনক ভাঙা ম্যানহোল ও রাস্তা দেবে যাওয়া',
    categoryId: 'roads_traffic',
    categoryEn: 'Roads & Traffic',
    categoryBn: 'রাস্তা ও ট্রাফিক',
    ward: 'Ward 14 (Mirpur)',
    author: {
      id: 'USR-ENG-402',
      name: 'Engr. Mahbubur Rahman',
      nameBn: 'প্রকৌ. মাহবুবুর রহমান',
      role: 'official',
      roleTitleEn: 'Executive Engineer',
      roleTitleBn: 'নির্বাহী প্রকৌশলী',
      departmentEn: 'Civil Engineering Division',
      departmentBn: 'পুরকৌশল বিভাগ',
      organizationEn: 'Dhaka North City Corporation (DNCC)',
      organizationBn: 'ঢাকা উত্তর সিটি কর্পোরেশন',
      designationEn: 'Zone 4 Head',
      designationBn: 'জোন ৪ প্রধান',
      isVerified: true,
      isOfficial: true,
    },
    contentEn: 'Emergency inspection completed by Zone 4 maintenance squad at 08:30 AM. Concrete reinforced ring slab has been dispatched from Mirpur central yard. Traffic redirection barricades placed around the depression. Complete replacement and bituminous patch scheduled by 4:00 PM today.',
    contentBn: 'সকাল ৮:৩০ মিনিটে জোন ৪ রক্ষণাবেক্ষণ দল ঘটনাস্থল পরিদর্শন সম্পন্ন করেছে। মিরপুর সেন্ট্রাল ইয়ার্ড থেকে আরসিসি রিং স্ল্যাব পাঠানো হয়েছে। দেবে যাওয়া স্থানের চারদিকে ব্যারিকেড স্থাপন করা হয়েছে। আজ বিকেল ৪টার মধ্যে প্রতিস্থাপন ও বিটুমিনাস প্যাচওয়ার্ক সম্পন্ন হবে।',
    publicContentEn: 'Emergency inspection completed by DNCC maintenance squad. Barricades placed around the manhole depression. Concrete ring replacement and road patching scheduled by 4:00 PM today.',
    publicContentBn: 'ডিএনসিসি রক্ষণাবেক্ষণ দল দ্বারা জরুরি পরিদর্শন সম্পন্ন হয়েছে। ম্যানহোলের চারপাশে নিরাপত্তা ব্যারিকেড দেওয়া হয়েছে। আজ বিকেল ৪টার মধ্যে নতুন স্ল্যাব স্থাপন ও রাস্তা মেরামত সম্পন্ন হবে।',
    media: [
      {
        id: 'MED-RSP-1',
        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=300&q=80',
        type: 'image',
        caption: 'DNCC Emergency Maintenance Team inspecting sub-base and placing safety bollards',
      },
    ],
    status: 'pending_review',
    isOfficial: true,
    isPubliclyVisible: false,
    createdAt: '2026-08-28T09:15:00Z',
    updatedAt: '2026-08-28T09:30:00Z',
  },
  {
    id: 'RSP-902',
    relatedType: 'post',
    relatedId: 'PST-101',
    relatedTitleEn: 'Broken Drain Cover and Road Hazard on Mirpur Road',
    relatedTitleBn: 'মিরপুর রোডে উন্মুক্ত ম্যানহোল ও নাগরিক নিরাপত্তা ঝুঁকি',
    categoryId: 'roads_traffic',
    categoryEn: 'Roads & Traffic',
    categoryBn: 'রাস্তা ও ট্রাফিক',
    ward: 'Ward 14 (Mirpur)',
    author: {
      id: 'USR-CIT-781',
      name: 'Sadia Jahan',
      nameBn: 'সাদিয়া জাহান',
      role: 'citizen',
      roleTitleEn: 'Verified Resident',
      roleTitleBn: 'যাচাইকৃত নাগরিক',
      departmentEn: 'Community Watch Mirpur',
      departmentBn: 'কমিউনিটি ওয়াচ মিরপুর',
      isVerified: true,
      isOfficial: false,
    },
    contentEn: 'Thank you for prioritizing this. The water accumulation was causing students from Mirpur Girls Ideal School to walk on the main vehicular carriageway. We will monitor the progress this afternoon.',
    contentBn: 'দ্রুত পদক্ষেপ গ্রহণের জন্য আন্তরিক ধন্যবাদ। পানি জমার কারণে মিরপুর গার্লস আইডিয়াল স্কুলের শিক্ষার্থীদের মূল রাস্তায় হাঁটতে হচ্ছিল। আমরা বিকেলে কাজের অগ্রগতি লক্ষ্য রাখব।',
    publicContentEn: 'Thank you for prioritizing this. The water accumulation was causing students to walk on the main vehicular carriageway. We appreciate the quick response from the ward office.',
    publicContentBn: 'দ্রুত পদক্ষেপ গ্রহণের জন্য ধন্যবাদ। জলাবদ্ধতার কারণে শিক্ষার্থীদের চলাচলে সমস্যা হচ্ছিল। ওয়ার্ড কার্যালয়ের দ্রুত সাড়া প্রশংসনীয়।',
    status: 'published',
    isOfficial: false,
    isPubliclyVisible: true,
    publishedAt: '2026-08-28T09:06:00Z',
    createdAt: '2026-08-28T08:45:00Z',
    updatedAt: '2026-08-28T09:06:00Z',
  },
  {
    id: 'RSP-903',
    relatedType: 'complaint',
    relatedId: 'CMP-10491',
    relatedTitleEn: 'Overflowing Secondary Garbage Transfer Station at Dhanmondi 27',
    relatedTitleBn: 'ধানমন্ডি ২৭ নম্বরে বর্জ্য উপচে পরিবেশ দূষণ ও দুর্গন্ধে পথচারীদের ভোগান্তি',
    categoryId: 'waste_management',
    categoryEn: 'Waste Management',
    categoryBn: 'বর্জ্য ব্যবস্থাপনা',
    ward: 'Ward 15 (Dhanmondi)',
    author: {
      id: 'USR-OFF-512',
      name: 'Dr. Tariqul Islam',
      nameBn: 'ড. তরিকুল ইসলাম',
      role: 'official',
      roleTitleEn: 'Chief Conservancy Inspector',
      roleTitleBn: 'প্রধান পরিচ্ছন্নতা পরিদর্শক',
      departmentEn: 'Waste Management Department',
      departmentBn: 'বর্জ্য ব্যবস্থাপনা বিভাগ',
      organizationEn: 'Dhaka South City Corporation (DSCC)',
      organizationBn: 'ঢাকা দক্ষিণ সিটি কর্পোরেশন',
      isVerified: true,
      isOfficial: true,
    },
    contentEn: 'Two hydraulic compactor trucks have arrived on site at 07:15 AM. Cleared 14 metric tons of mixed urban solid waste. Disinfectant bleaching powder and lime mixture sprayed around perimeter to neutralize odor.',
    contentBn: 'সকাল ৭:১৫ মিনিটে দুটি হাইড্রোলিক কম্প্যাক্টর ট্রাক ঘটনাস্থলে পৌঁছেছে। মোট ১৪ মেট্রিক টন কঠিন বর্জ্য অপসারণ করা হয়েছে। দুর্গন্ধ দূরীকরণে চারদিকে ব্লিচিং পাউডার ও চুন মিশ্রণ ছিটানো হয়েছে।',
    publicContentEn: 'Two compactor trucks cleared 14 metric tons of waste from the Dhanmondi 27 STS site. Disinfectant spray applied.',
    publicContentBn: 'ধানমন্ডি ২৭ এসটিএস সাইট থেকে ১৪ টন বর্জ্য সম্পূর্ণ অপসারণ করা হয়েছে এবং দুর্গন্ধমুক্ত করতে জীবাণুনাশক ছিটানো হয়েছে।',
    media: [
      {
        id: 'MED-RSP-2',
        url: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=800&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=300&q=80',
        type: 'image',
        caption: 'Compactor vehicle loading completed and container sanitized',
      },
    ],
    status: 'published',
    isOfficial: true,
    isPubliclyVisible: true,
    publishedAt: '2026-08-28T07:42:00Z',
    createdAt: '2026-08-28T07:20:00Z',
    updatedAt: '2026-08-28T07:42:00Z',
  },
  {
    id: 'RSP-904',
    relatedType: 'complaint',
    relatedId: 'CMP-10490',
    relatedTitleEn: 'Major Waterlogging and Submerged Footpaths along DIT Road',
    relatedTitleBn: 'ডিআইটি রোডে টানা বৃষ্টিতে ভয়াবহ জলাবদ্ধতা ও ড্রেনেজ ব্লকেজ',
    categoryId: 'water_drainage',
    categoryEn: 'Water & Drainage',
    categoryBn: 'পানি ও পয়ঃনিষ্কাশন',
    ward: 'Ward 22 (Malibagh)',
    author: {
      id: 'USR-PUB-992',
      name: 'Plumbing Solutions BD',
      nameBn: 'প্লাম্বিং সলিউশনস বিডি',
      role: 'citizen',
      roleTitleEn: 'Commercial User',
      roleTitleBn: 'বাণিজ্যিক ব্যবহারকারী',
      isVerified: false,
      isOfficial: false,
    },
    contentEn: 'Call 01700-XXXXXX for emergency diesel water pumps and private drainage cleaning. We operate 24/7 across Dhaka city with affordable rates.',
    contentBn: 'জরুরি ডিজেল ওয়াটার পাম্প ও ড্রেনেজ পরিষ্কারের জন্য যোগাযোগ করুন ০১৭১১-XXXXXX নম্বরে। সুলভ মূল্যে ২৪ ঘণ্টা সেবা প্রদান করা হয়।',
    status: 'rejected',
    isOfficial: false,
    isPubliclyVisible: false,
    rejectionReason: 'commercial_spam',
    rejectionExplanation: 'Commercial advertising, private vendor promotion, and phone numbers are strictly prohibited under Sobaike Community Guideline Section 4.2.',
    createdAt: '2026-08-28T06:10:00Z',
    updatedAt: '2026-08-28T06:25:00Z',
  },
  {
    id: 'RSP-905',
    relatedType: 'complaint',
    relatedId: 'CMP-10488',
    relatedTitleEn: 'Complete Blackout on Residential Feeder 3 in Uttara Sector 7',
    relatedTitleBn: 'উত্তরা সেক্টর ৭ এ আবাসিক ফিডার ৩ এ দীর্ঘস্থায়ী বিদ্যুৎ বিভ্রাট',
    categoryId: 'electricity_gas',
    categoryEn: 'Electricity & Utilities',
    categoryBn: 'বিদ্যুৎ ও জ্বালানি',
    ward: 'Ward 1 (Uttara)',
    author: {
      id: 'USR-ENG-118',
      name: 'Engr. Asif Karim',
      nameBn: 'প্রকৌ. আসিফ করিম',
      role: 'official',
      roleTitleEn: 'Assistant Engineer (Distribution)',
      roleTitleBn: 'সহকারী প্রকৌশলী (বিতরণ)',
      departmentEn: 'Distribution & Maintenance Desk',
      departmentBn: 'বিতরণ ও রক্ষণাবেক্ষণ ডেস্ক',
      organizationEn: 'Dhaka Electric Supply Company (DESCO)',
      organizationBn: 'ঢাকা ইলেকট্রিক সাপ্লাই কোম্পানি (ডেসকো)',
      isVerified: true,
      isOfficial: true,
    },
    contentEn: '11kV feeder line tripped due to thunderstorm tree branch rupture on Road 12. DESCO emergency line crew on site. Line testing in progress. Full restoration expected by 10:30 AM.',
    contentBn: 'রোড ১২ তে ঝড়ে গাছের ডাল ভেঙে ১১ কেভি ফিডার লাইনে ত্রুটি দেখা দেয়। ডেসকো জরুরি লাইন দল মেরামত কাজ সম্পন্ন করেছে। সকাল ১০:৩০ মিনিটের মধ্যে বিদ্যুৎ স্বাভাবিক হবে।',
    publicContentEn: '11kV feeder line repaired following tree branch obstruction on Road 12. Power supply restored to Sector 7.',
    publicContentBn: 'রোড ১২ তে গাছের ডাল পড়ে বিদ্যুৎ লাইনে ত্রুটি মেরামত সম্পন্ন হয়েছে। সেক্টর ৭ এ বিদ্যুৎ সংযোগ পুনর্বহাল করা হয়েছে।',
    status: 'approved',
    isOfficial: true,
    isPubliclyVisible: false,
    reviewedBy: 'Farhana Yasmin',
    reviewedAt: '2026-08-28T06:00:00Z',
    createdAt: '2026-08-28T05:50:00Z',
    updatedAt: '2026-08-28T06:00:00Z',
  },
  {
    id: 'RSP-906',
    relatedType: 'post',
    relatedId: 'PST-103',
    relatedTitleEn: 'Streetlights Inoperative on Main Commercial Avenue in Gulshan 2',
    relatedTitleBn: 'গুলশান ২ বাণিজ্যিক সড়কে দীর্ঘদিনের অকেজো স্ট্রিটলাইট',
    categoryId: 'street_lighting',
    categoryEn: 'Street Lighting & Signals',
    categoryBn: 'সড়ক বাতি ও সংকেত',
    ward: 'Ward 19 (Gulshan)',
    author: {
      id: 'USR-CIT-339',
      name: 'Tanvir Hossain',
      nameBn: 'তানভীর হোসেন',
      role: 'citizen',
      roleTitleEn: 'Resident & Community Advocate',
      roleTitleBn: 'নাগরিক প্রতিনিধি',
      isVerified: true,
      isOfficial: false,
    },
    contentEn: 'Electricians from DNCC lighting division inspected the junction today at 11 AM and identified burnt underground junction box. Replacement underway.',
    contentBn: 'ডিএনসিসি বিদ্যুৎ শাখার কর্মীরা আজ সকাল ১১টায় মোড় পরিদর্শন করে আন্ডারগ্রাউন্ড জংশন বক্সে ত্রুটি শনাক্ত করেছেন। তার পরিবর্তনের কাজ চলছে।',
    status: 'pending_review',
    isOfficial: false,
    isPubliclyVisible: false,
    createdAt: '2026-08-27T16:40:00Z',
    updatedAt: '2026-08-27T16:40:00Z',
  },
  {
    id: 'RSP-907',
    relatedType: 'complaint',
    relatedId: 'CMP-10486',
    relatedTitleEn: 'Potholes and Exposed Reinforcement Rods on Banani 11 Bridge Ramp',
    relatedTitleBn: 'বনানী ১১ ব্রিজ রॅम्प সংলগ্ন রাস্তায় গভীর খানাখন্দ ও বিপজ্জনক রড উন্মুক্ত',
    categoryId: 'roads_traffic',
    categoryEn: 'Roads & Traffic',
    categoryBn: 'রাস্তা ও ট্রাফিক',
    ward: 'Ward 19 (Banani)',
    author: {
      id: 'USR-OFF-708',
      name: 'Nazmul Huda',
      nameBn: 'নাজমুল হুদা',
      role: 'official',
      roleTitleEn: 'Assistant Director (Bridges & Culverts)',
      roleTitleBn: 'সহকারী পরিচালক (সেতু ও কালভার্ট)',
      departmentEn: 'Roads and Highways Department (RHD)',
      departmentBn: 'সড়ক ও জনপথ অধিদপ্তর',
      organizationEn: 'Ministry of Road Transport and Bridges',
      organizationBn: 'সড়ক পরিবহন ও সেতু মন্ত্রণালয়',
      isVerified: true,
      isOfficial: true,
    },
    contentEn: 'Cold-mix asphalt temporarily applied to prevent tire punctures. Structural expansion joint overhaul scheduled for weekend night shift (Friday 11:00 PM).',
    contentBn: 'যানবাহনের টায়ার ক্ষতিগ্রস্ত হওয়া রোধে কোল্ড-মিক্স অ্যাসফল্ট দিয়ে সাময়িক সমাধান করা হয়েছে। আগামী শুক্রবার রাত ১১টায় স্থায়ী ওভারহলিং সম্পন্ন হবে।',
    status: 'unpublished',
    isOfficial: true,
    isPubliclyVisible: false,
    unpublishReason: 'Contractor schedule delayed by 48 hours; waiting for revised mobilization date before public release.',
    createdAt: '2026-08-27T14:10:00Z',
    updatedAt: '2026-08-27T15:20:00Z',
  },
];

class ResponseService {
  private responses: ResponseItem[] = [...INITIAL_MOCK_RESPONSES];

  public async getResponses(
    filters: ResponseFilterState,
    page: number = 1,
    limit: number = 10
  ): Promise<ResponseListResponse> {
    // Simulate async network request
    await new Promise((resolve) => setTimeout(resolve, 150));

    let filtered = [...this.responses];

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    // Related Content Type filter
    if (filters.relatedType && filters.relatedType !== 'all') {
      filtered = filtered.filter((r) => r.relatedType === filters.relatedType);
    }

    // Author Role filter
    if (filters.authorRole && filters.authorRole !== 'all') {
      if (filters.authorRole === 'official') {
        filtered = filtered.filter((r) => r.isOfficial);
      } else {
        filtered = filtered.filter((r) => !r.isOfficial);
      }
    }

    // Category filter
    if (filters.categoryId && filters.categoryId !== 'all') {
      filtered = filtered.filter((r) => r.categoryId === filters.categoryId);
    }

    // Search query
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        return (
          r.id.toLowerCase().includes(q) ||
          r.relatedId.toLowerCase().includes(q) ||
          r.relatedTitleEn.toLowerCase().includes(q) ||
          r.relatedTitleBn.toLowerCase().includes(q) ||
          r.contentEn.toLowerCase().includes(q) ||
          r.contentBn.toLowerCase().includes(q) ||
          r.author.name.toLowerCase().includes(q) ||
          (r.author.nameBn && r.author.nameBn.toLowerCase().includes(q)) ||
          r.categoryEn.toLowerCase().includes(q) ||
          r.categoryBn.toLowerCase().includes(q) ||
          (r.ward && r.ward.toLowerCase().includes(q))
        );
      });
    }

    // Sort by latest created/updated
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Compute status counts
    const statusCounts: Record<ResponseStatusFilter, number> = {
      all: this.responses.length,
      pending_review: this.responses.filter((r) => r.status === 'pending_review').length,
      approved: this.responses.filter((r) => r.status === 'approved').length,
      published: this.responses.filter((r) => r.status === 'published').length,
      unpublished: this.responses.filter((r) => r.status === 'unpublished').length,
      rejected: this.responses.filter((r) => r.status === 'rejected').length,
    };

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedResponses = filtered.slice(startIndex, startIndex + limit);

    return {
      responses: paginatedResponses,
      total,
      page,
      limit,
      totalPages,
      statusCounts,
    };
  }

  public async getResponseById(id: string): Promise<ResponseItem | null> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return this.responses.find((r) => r.id === id) || null;
  }

  public async getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    return {
      all: this.responses.length,
      pending_review: this.responses.filter((r) => r.status === 'pending_review').length,
      approved: this.responses.filter((r) => r.status === 'approved').length,
      published: this.responses.filter((r) => r.status === 'published').length,
      unpublished: this.responses.filter((r) => r.status === 'unpublished').length,
      rejected: this.responses.filter((r) => r.status === 'rejected').length,
    };
  }

  // Internal mutation helper for workflow service
  public _updateResponseInMemory(updated: ResponseItem): void {
    const idx = this.responses.findIndex((r) => r.id === updated.id);
    if (idx !== -1) {
      this.responses[idx] = updated;
    } else {
      this.responses.unshift(updated);
    }
  }
}

export const mockResponseService = new ResponseService();
