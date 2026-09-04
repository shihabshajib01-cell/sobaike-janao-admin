/**
 * Complaint Mock Service
 * API-ready service for complaint listing, filtering, searching, and pagination.
 * Replaceable with real HTTP/REST/gRPC endpoints in production.
 */

import {
  Complaint,
  ComplaintFilterState,
  ComplaintListResponse,
  ComplaintStatusTabCount,
  ComplaintLifecycleStatus,
} from '@/types/Complaint';

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'SJ-2026-920421',
    titleEn: 'Road repair pending after utility excavation',
    titleBn: '',
    descriptionEn: 'The road was excavated for utility pipeline work two weeks ago and has been left open, causing severe traffic jams and hazard for pedestrians.',
    descriptionBn: '',
    categoryId: 'roads_traffic',
    categoryEn: 'Roads & Traffic',
    categoryBn: 'রাস্তাঘাট ও ট্রাফিক',
    subcategoryId: 'road_damage',
    subcategoryEn: 'Road Surface Damage',
    subcategoryBn: 'রাস্তা ক্ষতিগ্রস্ত',
    location: {
      addressEn: 'Mirpur-10 Circle, Section 6, Mirpur',
      addressBn: 'মিরপুর-১০ গোলচত্বর, সেকশন ৬, মিরপুর',
      ward: 'Ward 03',
      zone: 'Mirpur (Zone 4)',
      coordinates: [23.807, 90.368],
    },
    media: [],
    hasSupportingInfo: false,
    evidenceTypes: [],
    availableLanguages: ['en'],
    sourceLanguage: 'en',
    status: 'submitted',
    urgency: 'medium',
    citizenName: 'Anonymous Citizen',
    isAnonymous: true,
    upvotesCount: 14,
    commentsCount: 2,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'CMP-10492',
    titleEn: 'Severe open manhole hazard near Mirpur-10 round intersection',
    titleBn: 'মিরপুর-১০ গোলচত্বরের কাছে উন্মুক্ত ম্যানহোলের মারাত্মক ঝুঁকি',
    descriptionEn: 'The concrete manhole cover has collapsed into the sewer line on the busy pedestrian walkway. Heavy pedestrian flow causes high risk of lethal falls at night.',
    descriptionBn: 'ব্যস্ত পথচারী ফুটপাতে কংক্রিটের ম্যানহোল ঢাকনা নর্দমায় ভেঙে পড়েছে। রাতের বেলায় তীব্র অন্ধকারের কারণে পথচারীদের মারাত্মক দুর্ঘটনার চরম ঝুঁকি রয়েছে।',
    categoryId: 'roads_traffic',
    categoryEn: 'Roads & Traffic',
    categoryBn: 'রাস্তাঘাট ও ট্রাফিক',
    subcategoryId: 'open_manhole',
    subcategoryEn: 'Open Manhole',
    subcategoryBn: 'উন্মুক্ত ম্যানহোল',
    location: {
      addressEn: 'Near Mirpur-10 Metro Pillar 42',
      addressBn: 'মিরপুর-১০ মেট্রো পিলার ৪২ এর নিকট',
      ward: 'Ward 14',
      zone: 'Mirpur (Zone 4)',
      coordinates: [23.807, 90.3686],
    },
    media: [
      { id: 'm1', type: 'image', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80', caption: 'Collapsed manhole edge' },
    ],
    status: 'submitted',
    urgency: 'urgent',
    citizenName: 'Tanvir Hossain',
    citizenPhone: '+8801711223344',
    isAnonymous: false,
    upvotesCount: 54,
    commentsCount: 12,
    createdAt: '2026-08-28T08:55:00Z',
    updatedAt: '2026-08-28T08:55:00Z',
  },
  {
    id: 'CMP-10491',
    titleEn: 'Uncollected domestic waste pile blocking residential road for 3 days',
    titleBn: '৩ দিন ধরে প্রধান সড়কে উপচে পড়া গৃহস্থালি ময়লা আবর্জনা',
    descriptionEn: 'Secondary transfer container overflowing across road 12/A, foul stench preventing residential movement and school commute.',
    descriptionBn: '১২/এ নম্বর সড়কে সেকেন্ডারি ট্রান্সফার কনটেইনার উপচে বর্জ্য ছড়িয়ে পড়েছে। তীব্র দুর্গন্ধ ও দূষণে আবাসিক চলাচল ও স্কুলের পথ বন্ধ হয়ে যাচ্ছে।',
    categoryId: 'waste_management',
    categoryEn: 'Waste Management',
    categoryBn: 'বর্জ্য ব্যবস্থাপনা',
    subcategoryId: 'uncollected_garbage',
    subcategoryEn: 'Uncollected Garbage',
    subcategoryBn: 'অনপসারিত বর্জ্য',
    location: {
      addressEn: 'Road 12/A, Dhanmondi Residential Area',
      addressBn: 'রোড ১২/এ, ধানমন্ডি আবাসিক এলাকা',
      ward: 'Ward 22',
      zone: 'Dhanmondi (Zone 3)',
      coordinates: [23.7465, 90.376],
    },
    media: [
      { id: 'm2', type: 'image', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80', caption: 'Overflowing dump' },
    ],
    status: 'submitted',
    urgency: 'high',
    citizenName: 'Anonymous Citizen',
    isAnonymous: true,
    upvotesCount: 38,
    commentsCount: 8,
    createdAt: '2026-08-28T08:15:00Z',
    updatedAt: '2026-08-28T08:35:00Z',
  },
  {
    id: 'CMP-10490',
    titleEn: 'Extortion demand at localized vegetable vendor marketplace [Updated]',
    titleBn: 'স্থানীয় কাঁচাবাজারে ক্ষুদ্র ব্যবসায়ীদের নিকট অবৈধ চাঁদা দাবি [সম্পাদিত]',
    descriptionEn: 'Organized syndicate demanding 500 BDT daily from street vegetable sellers under threat of physical assault and property confiscation.',
    descriptionBn: 'সংগঠিত চক্র ফুটপাতের সবজি বিক্রেতাদের কাছ থেকে দৈনিক ৫০০ টাকা হারে জোরপূর্বক চাঁদা দাবি করছে এবং শারীরিক আক্রমণ ও মালামাল ফেলে দেওয়ার হুমকি দিচ্ছে।',
    categoryId: 'extortion',
    categoryEn: 'Extortion',
    categoryBn: 'চাঁদাবাজি',
    subcategoryId: 'market_toll',
    subcategoryEn: 'Unlawful Market Toll',
    subcategoryBn: 'অবৈধ বাজার টোল',
    location: {
      addressEn: 'Town Hall Market Perimeter, Mohammadpur',
      addressBn: 'টাউন হল মার্কেট চত্বর, মোহাম্মদপুর',
      ward: 'Ward 31',
      zone: 'Mohammadpur (Zone 5)',
      coordinates: [23.7588, 90.3598],
    },
    media: [],
    status: 'edited',
    urgency: 'high',
    citizenName: 'Rahim Bepari',
    citizenPhone: '+8801812345678',
    isAnonymous: false,
    upvotesCount: 65,
    commentsCount: 19,
    versions: [
      {
        versionNumber: 1,
        titleEn: 'Extortion demand at localized vegetable vendor marketplace',
        titleBn: 'স্থানীয় কাঁচাবাজারে ক্ষুদ্র ব্যবসায়ীদের নিকট অবৈধ চাঁদা দাবি',
        descriptionEn: 'Organized syndicate demanding 500 BDT daily from street vegetable sellers under threat of property confiscation.',
        descriptionBn: 'সংগঠিত চক্র ফুটপাতের সবজি বিক্রেতাদের কাছ থেকে দৈনিক ৫০০ টাকা হারে জোরপূর্বক চাঁদা দাবি করছে এবং মালামাল ফেলে দেওয়ার হুমকি দিচ্ছে।',
        categoryId: 'extortion',
        categoryEn: 'Extortion',
        categoryBn: 'চাঁদাবাজি',
        subcategoryId: 'market_toll',
        subcategoryEn: 'Unlawful Market Toll',
        subcategoryBn: 'অবৈধ বাজার টোল',
        location: {
          addressEn: 'Town Hall Market Perimeter, Mohammadpur',
          addressBn: 'টাউন হল মার্কেট চত্বর, মোহাম্মদপুর',
          ward: 'Ward 31',
          zone: 'Mohammadpur (Zone 5)',
          coordinates: [23.7588, 90.3598],
        },
        media: [],
        urgency: 'high',
        editedAt: '2026-08-28T07:30:00Z',
        editedBy: {
          name: 'Rahim Bepari',
          role: 'Citizen (Original Submitter)',
        },
        editNotes: 'Initial citizen submission',
      },
      {
        versionNumber: 2,
        titleEn: 'Extortion demand at localized vegetable vendor marketplace [Updated]',
        titleBn: 'স্থানীয় কাঁচাবাজারে ক্ষুদ্র ব্যবসায়ীদের নিকট অবৈধ চাঁদা দাবি [সম্পাদিত]',
        descriptionEn: 'Organized syndicate demanding 500 BDT daily from street vegetable sellers under threat of physical assault and property confiscation.',
        descriptionBn: 'সংগঠিত চক্র ফুটপাতের সবজি বিক্রেতাদের কাছ থেকে দৈনিক ৫০০ টাকা হারে জোরপূর্বক চাঁদা দাবি করছে এবং শারীরিক আক্রমণ ও মালামাল ফেলে দেওয়ার হুমকি দিচ্ছে।',
        categoryId: 'extortion',
        categoryEn: 'Extortion',
        categoryBn: 'চাঁদাবাজি',
        subcategoryId: 'market_toll',
        subcategoryEn: 'Unlawful Market Toll',
        subcategoryBn: 'অবৈধ বাজার টোল',
        location: {
          addressEn: 'Town Hall Market Perimeter, Mohammadpur',
          addressBn: 'টাউন হল মার্কেট চত্বর, মোহাম্মদপুর',
          ward: 'Ward 31',
          zone: 'Mohammadpur (Zone 5)',
          coordinates: [23.7588, 90.3598],
        },
        media: [],
        urgency: 'high',
        editedAt: '2026-08-28T08:10:00Z',
        editedBy: {
          name: 'Farhana Ahmed',
          role: 'Triage Moderator',
        },
        editNotes: 'Clarified incident scope with additional details regarding physical threat severity.',
      },
    ],
    createdAt: '2026-08-28T07:30:00Z',
    updatedAt: '2026-08-28T08:10:00Z',
  },
  {
    id: 'CMP-10489',
    titleEn: 'Street lights non-functional along Uttara Sector 7 avenue',
    titleBn: 'উত্তরা সেক্টর ৭ প্রধান সড়কের সকল স্ট্রিট লাইট বিকল',
    descriptionEn: 'Over 14 consecutive LED poles dark since Sunday storm, making night commuting unsafe for working women and residents.',
    descriptionBn: 'রোববারের ঝড়ের পর থেকে ১৪টি এলইডি পোল সম্পূর্ণ বন্ধ। কর্মজীবী নারী ও পথচারীদের জন্য রাতের চলাচল মারাত্মক অনিরাপদ হয়ে উঠেছে।',
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
    status: 'published',
    urgency: 'medium',
    citizenName: 'Dr. Shahriar Alam',
    isAnonymous: false,
    assignedDepartment: 'DNCC Electrical Engineering',
    upvotesCount: 29,
    commentsCount: 4,
    createdAt: '2026-08-28T06:00:00Z',
    updatedAt: '2026-08-28T07:45:00Z',
  },
  {
    id: 'CMP-10488',
    titleEn: 'Illegal heavy sand vehicle movement damaging neighborhood pavement',
    titleBn: 'অননুমোদিত ভারী বালুর ট্রাকের যাতায়াতে গলির রাস্তা মারাত্মক ক্ষতিগ্রস্ত',
    descriptionEn: '10-wheeler trucks transporting construction sand violating daytime curfew and breaking storm drain culverts.',
    descriptionBn: 'দিনের নির্ধারিত সময় অমান্য করে ১০ চাকার বালুর ট্রাকের চলাচলে কালভার্ট ও নর্দমার স্লাব ভেঙে ড্রেন বন্ধ হয়ে গেছে।',
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
      { id: 'm3', type: 'image', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80', caption: 'Damaged pavement slab' },
    ],
    status: 'published',
    urgency: 'medium',
    citizenName: 'Anonymous Citizen',
    isAnonymous: true,
    assignedDepartment: 'Traffic Police & DNCC PWD',
    upvotesCount: 84,
    commentsCount: 22,
    createdAt: '2026-08-28T05:15:00Z',
    updatedAt: '2026-08-28T07:00:00Z',
  },
  {
    id: 'CMP-10487',
    titleEn: 'WASA main water supply pipeline leakage flooding building entrance',
    titleBn: 'ওয়াসা পাইপলাইন ফেটে আবাসিক ভবনের গেটে তীব্র জলাবদ্ধতা',
    descriptionEn: 'High-pressure potable water pipe burst creating potable water loss and submerging ground floor parking.',
    descriptionBn: 'উচ্চচাপের খাবার পানির মূল লাইন ফেটে তীব্র পানির অপচয় হচ্ছে এবং গ্রাউন্ড ফ্লোরের পার্কিং প্লাবিত হয়েছে।',
    categoryId: 'civic_issues',
    categoryEn: 'Civic Problems',
    categoryBn: 'নাগরিক সমস্যা',
    subcategoryId: 'water_leakage',
    subcategoryEn: 'Water Pipeline Leakage',
    subcategoryBn: 'পানির পাইপলাইন লিকেজ',
    location: {
      addressEn: 'Near Indira Road Junction, Farmgate',
      addressBn: 'ইন্দিরা রোড মোড়ের কাছে, ফার্মগেট',
      ward: 'Ward 09',
      zone: 'Farmgate (Zone 5)',
      coordinates: [23.757, 90.388],
    },
    media: [],
    status: 'published',
    urgency: 'low',
    citizenName: 'Kazi Moinuddin',
    isAnonymous: false,
    assignedDepartment: 'Dhaka WASA MODS Zone 2',
    upvotesCount: 112,
    commentsCount: 31,
    createdAt: '2026-08-27T14:30:00Z',
    updatedAt: '2026-08-28T04:20:00Z',
  },
  {
    id: 'CMP-10486',
    titleEn: 'Repeated harassment of female commuters at bus terminal footbridge',
    titleBn: 'বাস টার্মিনাল ফুটওভার ব্রিজে নারী যাত্রীদের নিয়মিত উত্ত্যক্তকরণ',
    descriptionEn: 'Loitering groups harassing female garment workers during morning and evening rush shifts. Urgent security presence needed.',
    descriptionBn: 'সকাল ও সন্ধ্যার শিফটে ফুটওভার ব্রিজে বখাটে দল কর্মজীবী নারী ও শিক্ষার্থীদের প্রতিনিয়ত উত্ত্যক্ত করছে। পুলিশি টহল আবশ্যক।',
    categoryId: 'harassment',
    categoryEn: 'Public Harassment',
    categoryBn: 'পাবলিক হয়রানি',
    subcategoryId: 'stalking_eve_teasing',
    subcategoryEn: 'Public Harassment',
    subcategoryBn: 'উত্ত্যক্তকরণ ও হয়রানি',
    location: {
      addressEn: 'Mohakhali Bus Terminal Overbridge',
      addressBn: 'মহাখালী বাস টার্মিনাল ওভারব্রিজ',
      ward: 'Ward 20',
      zone: 'Mohakhali (Zone 3)',
      coordinates: [23.7778, 90.4054],
    },
    media: [],
    status: 'submitted',
    urgency: 'urgent',
    citizenName: 'Anonymous Citizen',
    isAnonymous: true,
    assignedDepartment: 'DMP Community Policing',
    upvotesCount: 142,
    commentsCount: 45,
    createdAt: '2026-08-27T11:20:00Z',
    updatedAt: '2026-08-27T16:10:00Z',
  },
  {
    id: 'CMP-10485',
    titleEn: 'Spam submission containing commercial advertising flyer',
    titleBn: 'বাণিজ্যিক কোচিং সেন্টারের প্রচারপত্র আপলোড সম্বলিত স্প্যাম আবেদন',
    descriptionEn: 'The submission contained promotional advertising material for a private coaching center rather than a genuine civic complaint.',
    descriptionBn: 'আবেদনে কোনো নাগরিক সমস্যা নেই, বরং একটি বেসরকারি কোচিং সেন্টারের প্রচারমূলক পোস্টার যুক্ত করে স্প্যাম করা হয়েছে।',
    categoryId: 'civic_issues',
    categoryEn: 'Civic Problems',
    categoryBn: 'নাগরিক সমস্যা',
    subcategoryId: 'spam_invalid',
    subcategoryEn: 'Invalid / Spam',
    subcategoryBn: 'অবৈধ / স্প্যাম',
    location: {
      addressEn: 'Kakrail Intersection',
      addressBn: 'কাকরাইল মোড়',
      ward: 'Ward 19',
      zone: 'Ramna (Zone 1)',
      coordinates: [23.738, 90.407],
    },
    media: [],
    status: 'rejected',
    urgency: 'low',
    citizenName: 'Unknown',
    isAnonymous: true,
    upvotesCount: 2,
    commentsCount: 1,
    createdAt: '2026-08-27T09:10:00Z',
    updatedAt: '2026-08-27T10:00:00Z',
  },
  {
    id: 'CMP-10484',
    titleEn: 'Public passport office speed-money harassment allegation [Refined]',
    titleBn: 'পাসপোর্ট অফিসে দ্রুত ফাইল ছাড়ার নামে ঘুষ দাবির অভিযোগ [সংশোধিত]',
    descriptionEn: 'Broker syndicate inside premises asking 3,000 BDT for biometric counter priority access. Documented with counter number and desk details.',
    descriptionBn: 'অফিস প্রাঙ্গণে দালাল চক্র বায়োমেট্রিক কাউন্টারে দ্রুত কাজ করিয়ে দেওয়ার নামে ৩,০০০ টাকা দাবি করছে। কাউন্টার ও রুম নম্বর সহ বিস্তারিত বিবরণ যুক্ত।',
    categoryId: 'corruption',
    categoryEn: 'Corruption & Irregularity',
    categoryBn: 'সরকারি দপ্তরের অনিয়ম',
    subcategoryId: 'bribe_harassment',
    subcategoryEn: 'Bribery Allegation',
    subcategoryBn: 'ঘুষ দাবি',
    location: {
      addressEn: 'Agargaon Passport Complex',
      addressBn: 'আগারগাঁও পাসপোর্ট কমপ্লেক্স',
      ward: 'Ward 28',
      zone: 'Agargaon (Zone 4)',
      coordinates: [23.7745, 90.3801],
    },
    media: [],
    status: 'edited',
    urgency: 'high',
    citizenName: 'Mahmudur Rahman',
    isAnonymous: false,
    upvotesCount: 96,
    commentsCount: 28,
    versions: [
      {
        versionNumber: 1,
        titleEn: 'Public passport office speed-money harassment allegation',
        titleBn: 'পাসপোর্ট অফিসে দ্রুত ফাইল ছাড়ার নামে ঘুষ দাবির অভিযোগ',
        descriptionEn: 'Broker syndicate inside premises asking 3,000 BDT for biometric counter priority access.',
        descriptionBn: 'অফিস প্রাঙ্গণে দালাল চক্র বায়োমেট্রিক কাউন্টারে দ্রুত কাজ করিয়ে দেওয়ার নামে ৩,০০০ টাকা দাবি করছে।',
        categoryId: 'corruption',
        categoryEn: 'Corruption & Irregularity',
        categoryBn: 'সরকারি দপ্তরের অনিয়ম',
        subcategoryId: 'bribe_harassment',
        subcategoryEn: 'Bribery Allegation',
        subcategoryBn: 'ঘুষ দাবি',
        location: {
          addressEn: 'Agargaon Passport Complex',
          addressBn: 'আগারগাঁও পাসপোর্ট কমপ্লেক্স',
          ward: 'Ward 28',
          zone: 'Agargaon (Zone 4)',
          coordinates: [23.7745, 90.3801],
        },
        media: [],
        urgency: 'high',
        editedAt: '2026-08-26T15:40:00Z',
        editedBy: {
          name: 'Mahmudur Rahman',
          role: 'Citizen (Original Submitter)',
        },
        editNotes: 'Original citizen report',
      },
      {
        versionNumber: 2,
        titleEn: 'Public passport office speed-money harassment allegation [Refined]',
        titleBn: 'পাসপোর্ট অফিসে দ্রুত ফাইল ছাড়ার নামে ঘুষ দাবির অভিযোগ [সংশোধিত]',
        descriptionEn: 'Broker syndicate inside premises asking 3,000 BDT for biometric counter priority access. Documented with counter number and desk details.',
        descriptionBn: 'অফিস প্রাঙ্গণে দালাল চক্র বায়োমেট্রিক কাউন্টারে দ্রুত কাজ করিয়ে দেওয়ার নামে ৩,০০০ টাকা দাবি করছে। কাউন্টার ও রুম নম্বর সহ বিস্তারিত বিবরণ যুক্ত।',
        categoryId: 'corruption',
        categoryEn: 'Corruption & Irregularity',
        categoryBn: 'সরকারি দপ্তরের অনিয়ম',
        subcategoryId: 'bribe_harassment',
        subcategoryEn: 'Bribery Allegation',
        subcategoryBn: 'ঘুষ দাবি',
        location: {
          addressEn: 'Agargaon Passport Complex',
          addressBn: 'আগারগাঁও পাসপোর্ট কমপ্লেক্স',
          ward: 'Ward 28',
          zone: 'Agargaon (Zone 4)',
          coordinates: [23.7745, 90.3801],
        },
        media: [],
        urgency: 'high',
        editedAt: '2026-08-27T08:00:00Z',
        editedBy: {
          name: 'Triage Officer',
          role: 'Moderator',
        },
        editNotes: 'Added location specifics to avoid ambiguous references.',
      },
    ],
    createdAt: '2026-08-26T15:40:00Z',
    updatedAt: '2026-08-27T08:00:00Z',
  },
  {
    id: 'CMP-10483',
    titleEn: 'Blocked storm sewer causing knee-deep waterlogging during rains',
    titleBn: 'বন্ধ নর্দমায় সামান্য বৃষ্টিতেই হাঁটু সমান জলাবদ্ধতা সৃষ্টি',
    descriptionEn: 'Polythene blockage in secondary canal causing water ingress into ground-floor shops along Kazipara main road.',
    descriptionBn: 'সেকেন্ডারি ক্যানেলে পলিথিন জমে পানি নিষ্কাশন বন্ধ থাকায় সামান্য বৃষ্টিতেই কাজীপাড়া প্রধান সড়কের দোকানগুলোতে পানি ঢুকছে।',
    categoryId: 'civic_issues',
    categoryEn: 'Civic Problems',
    categoryBn: 'নাগরিক সমস্যা',
    subcategoryId: 'drainage_waterlogging',
    subcategoryEn: 'Drainage & Waterlogging',
    subcategoryBn: 'নিষ্কাশন ও জলাবদ্ধতা',
    location: {
      addressEn: 'Kazipara Bus Stop Main Road',
      addressBn: 'কাজীপাড়া বাসস্ট্যান্ড প্রধান সড়ক',
      ward: 'Ward 13',
      zone: 'Mirpur (Zone 4)',
      coordinates: [23.799, 90.373],
    },
    media: [],
    status: 'published',
    urgency: 'high',
    citizenName: 'Ashraful Islam',
    isAnonymous: false,
    assignedDepartment: 'DNCC Waste & Drainage',
    upvotesCount: 78,
    commentsCount: 15,
    createdAt: '2026-08-26T12:00:00Z',
    updatedAt: '2026-08-26T17:30:00Z',
  },
  {
    id: 'CMP-10482',
    titleEn: 'Fallen electric transformer hazard after heavy vehicle collision',
    titleBn: 'ট্রাক ধাক্কায় হেলে পড়া ঝুঁকিপূর্ণ বৈদ্যুতিক ট্রান্সফর্মার',
    descriptionEn: 'DPDC electricity pole damaged, hanging dangerously above sidewalk near Jatrabari flyover exit.',
    descriptionBn: 'যাত্রাবাড়ী ফ্লাইওভার নামার মুখে ডিপিডিসি বৈদ্যুতিক পোল ক্ষতিগ্রস্ত হয়ে বিপজ্জনকভাবে ফুটপাতে হেলে পড়েছে।',
    categoryId: 'civic_issues',
    categoryEn: 'Civic Problems',
    categoryBn: 'নাগরিক সমস্যা',
    subcategoryId: 'electrical_hazard',
    subcategoryEn: 'Electrical Hazard',
    subcategoryBn: 'বৈদ্যুতিক ঝুঁকি',
    location: {
      addressEn: 'Jatrabari Flyover Downramp',
      addressBn: 'যাত্রাবাড়ী ফ্লাইওভার ডাউনর‌্যাম্প',
      ward: 'Ward 48',
      zone: 'Jatrabari (Zone 10)',
      coordinates: [23.711, 90.432],
    },
    media: [],
    status: 'published',
    urgency: 'urgent',
    citizenName: 'Shakil Ahmed',
    isAnonymous: false,
    assignedDepartment: 'DPDC Emergency Grid',
    upvotesCount: 165,
    commentsCount: 52,
    createdAt: '2026-08-25T18:00:00Z',
    updatedAt: '2026-08-26T10:00:00Z',
  },
];

export class ComplaintService {
  /**
   * Get all complaint status counts for the tabs bar
   * Complaint status must ONLY be: submitted, published, rejected, edited
   */
  async getComplaintStats(): Promise<ComplaintStatusTabCount[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    const counts: Record<ComplaintLifecycleStatus | 'all', number> = {
      all: MOCK_COMPLAINTS.length,
      submitted: 0,
      published: 0,
      unpublished: 0,
      rejected: 0,
      edited: 0,
    };

    MOCK_COMPLAINTS.forEach((c) => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      }
    });

    return [
      { status: 'all', labelEn: 'All Complaints', labelBn: 'সকল অভিযোগ', count: counts.all, badgeStatus: 'default' },
      { status: 'submitted', labelEn: 'Submitted', labelBn: 'দাখিলকৃত', count: counts.submitted, badgeStatus: 'pending' },
      { status: 'published', labelEn: 'Published', labelBn: 'প্রকাশিত', count: counts.published, badgeStatus: 'published' },
      { status: 'unpublished', labelEn: 'Unpublished', labelBn: 'অপ্রকাশিত', count: counts.unpublished, badgeStatus: 'default' },
      { status: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিলকৃত', count: counts.rejected, badgeStatus: 'rejected' },
      { status: 'edited', labelEn: 'Edited', labelBn: 'সম্পাদিত', count: counts.edited, badgeStatus: 'info' },
    ];
  }

  /**
   * Search, filter, and paginate complaints
   */
  async getComplaints(
    filters: Partial<ComplaintFilterState> = {},
    page = 1,
    pageSize = 6
  ): Promise<ComplaintListResponse> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    let filtered = [...MOCK_COMPLAINTS];

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter((c) => c.categoryId === filters.category);
    }

    // Subcategory filter
    if (filters.subcategory && filters.subcategory !== 'all') {
      filtered = filtered.filter((c) => c.subcategoryId === filters.subcategory);
    }

    // Location / Ward filter
    if (filters.location && filters.location !== 'all') {
      const loc = filters.location.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.location.ward.toLowerCase().includes(loc) ||
          c.location.zone.toLowerCase().includes(loc) ||
          c.location.addressEn.toLowerCase().includes(loc) ||
          c.location.addressBn.toLowerCase().includes(loc)
      );
    }

    // Search query (Complaint ID, Title, Description, Subcategory, Category, Citizen, Department)
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.titleEn.toLowerCase().includes(q) ||
          c.titleBn.toLowerCase().includes(q) ||
          c.descriptionEn.toLowerCase().includes(q) ||
          c.descriptionBn.toLowerCase().includes(q) ||
          c.categoryEn.toLowerCase().includes(q) ||
          c.categoryBn.toLowerCase().includes(q) ||
          c.subcategoryEn.toLowerCase().includes(q) ||
          c.subcategoryBn.toLowerCase().includes(q) ||
          c.location.addressEn.toLowerCase().includes(q) ||
          c.location.addressBn.toLowerCase().includes(q) ||
          c.location.ward.toLowerCase().includes(q) ||
          (c.citizenName && c.citizenName.toLowerCase().includes(q)) ||
          (c.assignedDepartment && c.assignedDepartment.toLowerCase().includes(q))
      );
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date('2026-08-28T23:59:59Z').getTime();
      if (filters.dateRange === 'today') {
        const oneDay = 24 * 60 * 60 * 1000;
        filtered = filtered.filter((c) => now - new Date(c.createdAt).getTime() <= oneDay);
      } else if (filters.dateRange === 'week' || filters.dateRange === '7days') {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter((c) => now - new Date(c.createdAt).getTime() <= sevenDays);
      } else if (filters.dateRange === 'month' || filters.dateRange === '30days') {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter((c) => now - new Date(c.createdAt).getTime() <= thirtyDays);
      }
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);

    const statusCounts = await this.getComplaintStats();

    return {
      items,
      pagination: {
        currentPage: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
      statusCounts,
    };
  }

  /**
   * Search complaints shortcut
   */
  async searchComplaints(query: string): Promise<Complaint[]> {
    const res = await this.getComplaints({ searchQuery: query });
    return res.items;
  }

  /**
   * Filter complaints shortcut
   */
  async filterComplaints(filters: Partial<ComplaintFilterState>): Promise<ComplaintListResponse> {
    return this.getComplaints(filters);
  }

  /**
   * Get single complaint by ID for future preview/detail view
   */
  async getComplaintById(id: string): Promise<Complaint | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return MOCK_COMPLAINTS.find((c) => c.id.toLowerCase() === id.toLowerCase()) || null;
  }
}

export const mockComplaintService = new ComplaintService();
export default mockComplaintService;
