/**
 * Timeline Mock Service
 * Manages timeline event logging and retrieval for complaint audit logs.
 * API-ready architecture for backend logging endpoints.
 */

import { ComplaintTimelineEvent, TimelineEventType, ComplaintLifecycleStatus } from '@/types/Complaint';

const INITIAL_TIMELINES: Record<string, ComplaintTimelineEvent[]> = {
  'CMP-10492': [
    {
      id: 'TL-101',
      complaintId: 'CMP-10492',
      type: 'submitted',
      actorName: 'Tanvir Hossain',
      actorRole: 'Citizen Reporter',
      timestamp: '2026-08-28T08:55:00Z',
      titleEn: 'Complaint Submitted',
      titleBn: 'অভিযোগ দাখিল সম্পন্ন',
      descriptionEn: 'Citizen submitted report with photographic evidence of collapsed concrete manhole cover.',
      descriptionBn: 'নাগরিক উন্মুক্ত ম্যানহোলের স্থিরচিত্র প্রমাণসহ রিপোর্ট জমা দিয়েছেন।',
      toStatus: 'submitted',
    },
    {
      id: 'TL-102',
      complaintId: 'CMP-10492',
      type: 'status_change',
      actorName: 'System Gatekeeper',
      actorRole: 'Automated Triaging Engine',
      timestamp: '2026-08-28T08:56:15Z',
      titleEn: 'Triaged to Roads & Traffic Queue',
      titleBn: 'রাস্তাঘাট ও ট্রাফিক ট্রায়াজে স্থানান্তর',
      descriptionEn: 'Geo-spatial routing linked issue to Mirpur Zone 4 and marked urgency as URGENT due to pedestrian fall risk.',
      descriptionBn: 'ভৌগোলিক তথ্য অনুযায়ী মিরপুর জোন ৪ এ অন্তর্ভুক্ত এবং ঝুঁকির বিবেচনায় জরুরি হিসেবে চিহ্নিত করা হয়েছে।',
      fromStatus: 'submitted',
      toStatus: 'submitted',
    },
  ],
  'CMP-10491': [
    {
      id: 'TL-201',
      complaintId: 'CMP-10491',
      type: 'submitted',
      actorName: 'Anonymous Citizen',
      actorRole: 'Citizen Reporter',
      timestamp: '2026-08-28T08:15:00Z',
      titleEn: 'Complaint Submitted Anonymously',
      titleBn: 'বেনামে অভিযোগ দাখিল সম্পন্ন',
      descriptionEn: 'Citizen reported secondary garbage container overflow blocking vehicular traffic.',
      descriptionBn: 'সেকেন্ডারি বর্জ্য কনটেইনার উপচে যানবাহন চলাচল বন্ধ সংক্রান্ত অভিযোগ জমা দেওয়া হয়েছে।',
      toStatus: 'submitted',
    },
    {
      id: 'TL-202',
      complaintId: 'CMP-10491',
      type: 'status_change',
      actorName: 'Moderator Farhana Yasmin',
      actorRole: 'Civic Moderator',
      timestamp: '2026-08-28T08:35:00Z',
      titleEn: 'Complaint Published',
      titleBn: 'অভিযোগ প্রকাশ করা হয়েছে',
      descriptionEn: 'Assigned to DNCC Waste Management Ward Inspector for on-ground site verification.',
      descriptionBn: 'মাঠপর্যায়ে তদন্তের জন্য ডিএনসিসি বর্জ্য ব্যবস্থাপনা পরিদর্শকের নিকট পাঠানো হয়েছে।',
      fromStatus: 'submitted',
      toStatus: 'published',
    },
  ],
  'CMP-10490': [
    {
      id: 'TL-301',
      complaintId: 'CMP-10490',
      type: 'submitted',
      actorName: 'Rahim Bepari',
      actorRole: 'Citizen Reporter',
      timestamp: '2026-08-28T07:30:00Z',
      titleEn: 'Extortion Complaint Lodged',
      titleBn: 'চাঁদাবাজির অভিযোগ জমা হয়েছে',
      descriptionEn: 'Vendor reported organized extortion demands at Mohammadpur Town Hall Market.',
      descriptionBn: 'মোহাম্মদপুর টাউন হল বাজারে অবৈধ চাঁদা দাবির বিরুদ্ধে অভিযোগ দায়ের।',
      toStatus: 'submitted',
    },
    {
      id: 'TL-302',
      complaintId: 'CMP-10490',
      type: 'status_change',
      actorName: 'Officer Kamal Hossain',
      actorRole: 'Zonal Inspector',
      timestamp: '2026-08-28T08:10:00Z',
      titleEn: 'Complaint Rejected',
      titleBn: 'অভিযোগ বাতিল করা হয়েছে',
      descriptionEn: 'Insufficient evidence provided for official investigation.',
      descriptionBn: 'তদন্ত পরিচালনার জন্য যথেষ্ট প্রমাণ পাওয়া যায়নি।',
      fromStatus: 'submitted',
      toStatus: 'rejected',
    },
  ],
  'CMP-10488': [
    {
      id: 'TL-401',
      complaintId: 'CMP-10488',
      type: 'submitted',
      actorName: 'Anonymous Citizen',
      actorRole: 'Citizen Reporter',
      timestamp: '2026-08-28T05:15:00Z',
      titleEn: 'Complaint Submitted',
      titleBn: 'অভিযোগ দাখিল সম্পন্ন',
      descriptionEn: 'Report on heavy sand trucks violating curfew and breaking pavement culverts.',
      descriptionBn: 'ভারী বালুর ট্রাকের চলাচলে কালভার্ট ও নর্দমা ক্ষতিগ্রস্ত হওয়ার অভিযোগ।',
      toStatus: 'submitted',
    },
    {
      id: 'TL-402',
      complaintId: 'CMP-10488',
      type: 'status_change',
      actorName: 'Moderator Mahmudul',
      actorRole: 'Senior Moderator',
      timestamp: '2026-08-28T06:20:00Z',
      titleEn: 'Complaint Edited',
      titleBn: 'অভিযোগ সম্পাদিত হয়েছে',
      descriptionEn: 'Verified by zone engineering team and details updated.',
      descriptionBn: 'জোনাল ইঞ্জিনিয়ারিং টিম কর্তৃক তথ্য যাচাই ও হালনাগাদ।',
      fromStatus: 'submitted',
      toStatus: 'edited',
    },
    {
      id: 'TL-403',
      complaintId: 'CMP-10488',
      type: 'status_change',
      actorName: 'Public Relations Officer',
      actorRole: 'Admin Publisher',
      timestamp: '2026-08-28T07:00:00Z',
      titleEn: 'Complaint Published to Public Feed',
      titleBn: 'পাবলিক ফিডে প্রকাশিত হয়েছে',
      descriptionEn: 'Published onto the Sobaike citizen feed with active upvoting and community comment stream.',
      descriptionBn: 'সবার মতামত ও সমর্থনের জন্য সবার প্ল্যাটফর্মের পাবলিক ফিডে উন্মুক্ত করা হয়েছে।',
      fromStatus: 'edited',
      toStatus: 'published',
    },
  ],
  'CMP-10487': [
    {
      id: 'TL-501',
      complaintId: 'CMP-10487',
      type: 'submitted',
      actorName: 'Kazi Moinuddin',
      actorRole: 'Citizen Reporter',
      timestamp: '2026-08-27T14:30:00Z',
      titleEn: 'WASA Pipeline Leakage Reported',
      titleBn: 'ওয়াসা পাইপলাইন লিকেজের অভিযোগ',
      descriptionEn: 'Reported high-pressure pipe burst flooding Farmgate residential gate.',
      descriptionBn: 'ফার্মগেটে ওয়াসা পাইপ ফেটে পানির অপচয় ও গেট প্লাবিত হওয়ার রিপোর্ট।',
      toStatus: 'submitted',
    },
    {
      id: 'TL-502',
      complaintId: 'CMP-10487',
      type: 'status_change',
      actorName: 'Control Desk',
      actorRole: 'Duty Manager',
      timestamp: '2026-08-27T16:00:00Z',
      titleEn: 'Complaint Edited',
      titleBn: 'অভিযোগের তথ্য সম্পাদিত',
      descriptionEn: 'Emergency repair details appended to complaint.',
      descriptionBn: 'জরুরি মেরামতের তথ্য অভিযোগের সঙ্গে যুক্ত করা হয়েছে।',
      fromStatus: 'submitted',
      toStatus: 'edited',
    },
    {
      id: 'TL-503',
      complaintId: 'CMP-10487',
      type: 'status_change',
      actorName: 'Engr. Saiful Islam',
      actorRole: 'WASA Sub-Divisional Engineer',
      timestamp: '2026-08-28T04:20:00Z',
      titleEn: 'Complaint Published',
      titleBn: 'অভিযোগ প্রকাশিত',
      descriptionEn: 'Main distribution valve replaced and surrounding pavement patched.',
      descriptionBn: 'মূল বিতরণ ভালভ প্রতিস্থাপন ও ফুটপাত সংস্কার সম্পন্ন।',
      fromStatus: 'edited',
      toStatus: 'published',
    },
  ],
};

class TimelineService {
  private timelineStore: Record<string, ComplaintTimelineEvent[]> = { ...INITIAL_TIMELINES };

  /**
   * Get all timeline events for a complaint in chronological order
   */
  async getComplaintTimeline(complaintId: string): Promise<ComplaintTimelineEvent[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    if (this.timelineStore[complaintId]) {
      return [...this.timelineStore[complaintId]];
    }

    // Default fallback if not pre-seeded
    return [
      {
        id: `TL-${complaintId}-init`,
        complaintId,
        type: 'submitted',
        actorName: 'Citizen Reporter',
        actorRole: 'Citizen Reporter',
        timestamp: new Date().toISOString(),
        titleEn: 'Complaint Submitted',
        titleBn: 'অভিযোগ দাখিল সম্পন্ন',
        descriptionEn: 'Citizen lodged report into the civic accountability registry.',
        descriptionBn: 'নাগরিক কর্তৃক প্ল্যাটফর্মে অভিযোগের বিবরণ লিপিবদ্ধ করা হয়েছে।',
        toStatus: 'submitted',
      },
    ];
  }

  /**
   * Append a new audit event to the timeline
   */
  async addTimelineEvent(
    event: Omit<ComplaintTimelineEvent, 'id' | 'timestamp'> & {
      id?: string;
      timestamp?: string;
    }
  ): Promise<ComplaintTimelineEvent> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const newEvent: ComplaintTimelineEvent = {
      id: event.id || `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      complaintId: event.complaintId,
      type: event.type,
      actorName: event.actorName,
      actorRole: event.actorRole,
      actorAvatar: event.actorAvatar,
      titleEn: event.titleEn,
      titleBn: event.titleBn,
      descriptionEn: event.descriptionEn,
      descriptionBn: event.descriptionBn,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      metadata: event.metadata,
    };

    if (!this.timelineStore[event.complaintId]) {
      this.timelineStore[event.complaintId] = [];
    }

    this.timelineStore[event.complaintId].push(newEvent);
    return newEvent;
  }
}

export const mockTimelineService = new TimelineService();
export default mockTimelineService;
