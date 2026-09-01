/**
 * Response Timeline Service
 * Tracks audit events and lifecycle progression for responses/comments.
 */

import { ResponseTimelineEvent } from '@/types/Response';

const INITIAL_RESPONSE_TIMELINES: Record<string, ResponseTimelineEvent[]> = {
  'RSP-901': [
    {
      id: 'RTL-101',
      responseId: 'RSP-901',
      action: 'submitted',
      titleEn: 'Official Response Submitted',
      titleBn: 'দাপ্তরিক প্রতিক্রিয়া দাখিল করা হয়েছে',
      descriptionEn: 'Zone 4 Engineering Sub-Divisional Officer submitted emergency road repair schedule and contractor mobilization notice.',
      descriptionBn: 'জোন ৪ প্রকৌশল উপ-বিভাগীয় কর্মকর্তা জরুরি রাস্তা মেরামত কর্মসূচি ও ঠিকাদার নিয়োগের তথ্য জমা দিয়েছেন।',
      actor: {
        name: 'Engr. Mahbubur Rahman',
        role: 'Zone 4 Executive Engineer',
      },
      timestamp: '2026-08-28T09:15:00Z',
    },
    {
      id: 'RTL-102',
      responseId: 'RSP-901',
      action: 'reviewed',
      titleEn: 'Compliance & Safety Verification',
      titleBn: 'নীতিমালা ও নাগরিক নিরাপত্তা যাচাই সম্পন্ন',
      descriptionEn: 'Senior Content Moderator reviewed response for official accuracy, verified contractor safety measures, and cleared for approval.',
      descriptionBn: 'সিনিয়র মডারেটর প্রতিক্রিয়াটির দাপ্তরিক সত্যতা এবং নাগরিক নিরাপত্তা সতর্কতা যাচাই করে অনুমোদনের জন্য প্রস্তুত করেছেন।',
      actor: {
        name: 'Farhana Yasmin',
        role: 'Senior Civic Moderator',
      },
      timestamp: '2026-08-28T09:30:00Z',
    },
  ],
  'RSP-902': [
    {
      id: 'RTL-201',
      responseId: 'RSP-902',
      action: 'submitted',
      titleEn: 'Citizen Feedback Submitted',
      titleBn: 'নাগরিক মতামত ও সম্পূরক তথ্য প্রদান',
      descriptionEn: 'Local resident submitted supplementary photos and notice that waterlogging has worsened near the school zone.',
      descriptionBn: 'স্থানীয় বাসিন্দা স্কুলের নিকট জলাবদ্ধতা বৃদ্ধির অতিরিক্ত ছবি ও তথ্য প্রদান করেছেন।',
      actor: {
        name: 'Sadia Jahan',
        role: 'Verified Resident (Ward 12)',
      },
      timestamp: '2026-08-28T08:45:00Z',
    },
    {
      id: 'RTL-202',
      responseId: 'RSP-902',
      action: 'approved',
      titleEn: 'Response Approved for Public Stream',
      titleBn: 'পাবলিক স্ট্রিমে প্রকাশের জন্য অনুমোদিত',
      descriptionEn: 'Moderator confirmed photos do not contain private license plates or face PII and approved the citizen clarification.',
      descriptionBn: 'মডারেটর নিশ্চিত করেছেন যে ছবিতে কোনো ব্যক্তিগত লাইসেন্স প্লেট বা সংবেদনশীল তথ্য নেই এবং প্রতিক্রিয়া অনুমোদন করেছেন।',
      actor: {
        name: 'Farhana Yasmin',
        role: 'Civic Moderator',
      },
      timestamp: '2026-08-28T09:05:00Z',
    },
    {
      id: 'RTL-203',
      responseId: 'RSP-902',
      action: 'published',
      titleEn: 'Published to Public Post Thread',
      titleBn: 'পাবলিক পোস্ট থ্রেডে প্রকাশিত',
      descriptionEn: 'Response is now live and viewable by citizens on the public Sobaike transparency platform.',
      descriptionBn: 'প্রতিক্রিয়াটি এখন সবার জন্য উন্মুক্ত এবং নাগরিকরা পাবলিক প্ল্যাটফর্মে দেখতে পারছেন।',
      actor: {
        name: 'Automated Broadcast Engine',
        role: 'System Publisher',
      },
      timestamp: '2026-08-28T09:06:00Z',
    },
  ],
  'RSP-903': [
    {
      id: 'RTL-301',
      responseId: 'RSP-903',
      action: 'submitted',
      titleEn: 'Waste Management Fleet Dispatch Notice',
      titleBn: 'বর্জ্য ব্যবস্থাপনা ইউনিট প্রেরণ নোটিশ',
      descriptionEn: 'DNCC Conservancy Department submitted compactor truck schedule for secondary disposal clearance.',
      descriptionBn: 'ডিএনসিসি পরিচ্ছন্নতা বিভাগ সেকেন্ডারি বর্জ্য অপসারণের জন্য কম্প্যাক্টর ট্রাক প্রেরণের সময়সূচি জমা দিয়েছে।',
      actor: {
        name: 'Dr. Tariqul Islam',
        role: 'Conservancy Inspector',
      },
      timestamp: '2026-08-28T07:20:00Z',
    },
    {
      id: 'RTL-302',
      responseId: 'RSP-903',
      action: 'approved',
      titleEn: 'Approved for Live Broadcast',
      titleBn: 'লাইভ সম্প্রচারের জন্য অনুমোদিত',
      descriptionEn: 'Verified against department vehicle tracking feed and approved for citizen visibility.',
      descriptionBn: 'বিভাগীয় যানবাহন ট্র্যাকিং তথ্যের সাথে যাচাই করে নাগরিক প্রদর্শনের জন্য অনুমোদন করা হয়েছে।',
      actor: {
        name: 'Shakil Ahmed',
        role: 'Operations Lead',
      },
      timestamp: '2026-08-28T07:40:00Z',
    },
    {
      id: 'RTL-303',
      responseId: 'RSP-903',
      action: 'published',
      titleEn: 'Published Live',
      titleBn: 'সরাসরি প্রকাশিত',
      descriptionEn: 'Published with Official Authority badge onto Complaint #CMP-10491.',
      descriptionBn: 'অভিযোগ #CMP-10491 এ অফিশিয়াল ব্যাজসহ সরাসরি প্রকাশ করা হয়েছে।',
      actor: {
        name: 'Shakil Ahmed',
        role: 'Operations Lead',
      },
      timestamp: '2026-08-28T07:42:00Z',
    },
  ],
  'RSP-904': [
    {
      id: 'RTL-401',
      responseId: 'RSP-904',
      action: 'submitted',
      titleEn: 'Third-Party Commercial Response Submitted',
      titleBn: 'তৃতীয় পক্ষের বাণিজ্যিক মন্তব্য দাখিল',
      descriptionEn: 'User submitted promotional comment offering private drainage pump services with phone number.',
      descriptionBn: 'ব্যবহারকারী ব্যক্তিগত ড্রেনেজ পাম্প সেবার প্রচার ও যোগাযোগের নম্বর সম্বলিত মন্তব্য জমা দিয়েছেন।',
      actor: {
        name: 'Plumbing Solutions BD',
        role: 'Public User',
      },
      timestamp: '2026-08-28T06:10:00Z',
    },
    {
      id: 'RTL-402',
      responseId: 'RSP-904',
      action: 'rejected',
      titleEn: 'Response Rejected by Moderation',
      titleBn: 'মডারেশন টিম কর্তৃক মন্তব্য বাতিল',
      descriptionEn: 'Rejected due to Commercial Solicitation & Spam policy violation (Section 4.2).',
      descriptionBn: 'বাণিজ্যিক প্রচারণা এবং স্প্যাম নীতিমালা লঙ্ঘনের (ধারা ৪.২) কারণে বাতিল করা হয়েছে।',
      actor: {
        name: 'Farhana Yasmin',
        role: 'Senior Civic Moderator',
      },
      timestamp: '2026-08-28T06:25:00Z',
    },
  ],
  'RSP-905': [
    {
      id: 'RTL-501',
      responseId: 'RSP-905',
      action: 'submitted',
      titleEn: 'DESCO Feeder Restoration Status',
      titleBn: 'ডেসকো ফিডার সংযোগ পুনর্বহাল স্থিতি',
      descriptionEn: 'Control room dispatcher logged temporary grid isolation for tree branch trimming along Sector 7 line.',
      descriptionBn: 'কন্ট্রোল রুম ডিসপ্যাচার সেক্টর ৭ লাইনে গাছের ডাল কাটার জন্য সাময়িক গ্রিড বিচ্ছিন্নকরণের তথ্য লিপিবদ্ধ করেছেন।',
      actor: {
        name: 'Engr. Asif Karim',
        role: 'DESCO Sub-Station Engineer',
      },
      timestamp: '2026-08-28T05:50:00Z',
    },
    {
      id: 'RTL-502',
      responseId: 'RSP-905',
      action: 'approved',
      titleEn: 'Approved by Utilities Desk',
      titleBn: 'ইউটিলিটি ডেস্ক কর্তৃক অনুমোদিত',
      descriptionEn: 'Approved and formatted for citizen notice board.',
      descriptionBn: 'অনুমোদিত এবং নাগরিক নোটিশ বোর্ডের জন্য প্রস্তুত করা হয়েছে।',
      actor: {
        name: 'Farhana Yasmin',
        role: 'Senior Civic Moderator',
      },
      timestamp: '2026-08-28T06:00:00Z',
    },
    {
      id: 'RTL-503',
      responseId: 'RSP-905',
      action: 'published',
      titleEn: 'Published Live',
      titleBn: 'লাইভ প্রকাশিত',
      descriptionEn: 'Broadcasted to live complaint tracker and ward feed.',
      descriptionBn: 'লাইভ অভিযোগ ট্র্যাকার এবং ওয়ার্ড ফিডে সম্প্রচারিত।',
      actor: {
        name: 'Farhana Yasmin',
        role: 'Senior Civic Moderator',
      },
      timestamp: '2026-08-28T06:02:00Z',
    },
  ],
};

class ResponseTimelineService {
  private timelines: Record<string, ResponseTimelineEvent[]> = { ...INITIAL_RESPONSE_TIMELINES };

  public async getTimeline(responseId: string): Promise<ResponseTimelineEvent[]> {
    return [...(this.timelines[responseId] || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public async addEvent(
    responseId: string,
    event: Omit<ResponseTimelineEvent, 'id' | 'responseId' | 'timestamp'>
  ): Promise<ResponseTimelineEvent> {
    const newEvent: ResponseTimelineEvent = {
      ...event,
      id: `RTL-${Date.now().toString().slice(-4)}`,
      responseId,
      timestamp: new Date().toISOString(),
    };

    if (!this.timelines[responseId]) {
      this.timelines[responseId] = [];
    }

    this.timelines[responseId].push(newEvent);
    return newEvent;
  }
}

export const mockResponseTimelineService = new ResponseTimelineService();
