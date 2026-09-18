import type {
  HarassmentAbuserRelationship,
  HarassmentAgeGroup,
  HarassmentReportingFor,
} from '@/types/Complaint';

export interface HarassmentClassificationOption {
  value: string;
  labelEn: string;
  labelBn: string;
}

export const HARASSMENT_AGE_GROUP_OPTIONS: HarassmentClassificationOption[] = [
  { value: 'under_18', labelEn: 'Under 18', labelBn: '১৮ বছরের নিচে' },
  { value: '18_29', labelEn: '18–29', labelBn: '১৮–২৯' },
  { value: '30_59', labelEn: '30–59', labelBn: '৩০–৫৯' },
  { value: '60_plus', labelEn: '60+', labelBn: '৬০+' },
  { value: 'prefer_not_to_say', labelEn: 'Prefer not to say', labelBn: 'বলতে অনিচ্ছুক' },
  { value: 'unknown_not_stated', labelEn: 'Unknown / not stated', labelBn: 'জানা নেই / উল্লেখ নেই' },
];

export const HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS: HarassmentClassificationOption[] = [
  { value: 'intimate_partner', labelEn: 'Current/former intimate partner or spouse', labelBn: 'বর্তমান/সাবেক ঘনিষ্ঠ সঙ্গী বা জীবনসঙ্গী' },
  { value: 'household_family', labelEn: 'Immediate family / household member', labelBn: 'নিকট পরিবার / একই পরিবারের সদস্য' },
  { value: 'other_relative', labelEn: 'Other relative', labelBn: 'অন্যান্য আত্মীয়' },
  { value: 'friend_acquaintance', labelEn: 'Friend / acquaintance', labelBn: 'বন্ধু / পরিচিত ব্যক্তি' },
  { value: 'coworker_classmate', labelEn: 'Co-worker / classmate', labelBn: 'সহকর্মী / সহপাঠী' },
  { value: 'authority_caregiver_service_provider', labelEn: 'Authority / caregiver / service provider', labelBn: 'কর্তৃপক্ষ / পরিচর্যাকারী / সেবা প্রদানকারী' },
  { value: 'stranger', labelEn: 'Stranger', labelBn: 'অপরিচিত ব্যক্তি' },
  { value: 'other_or_unknown', labelEn: 'Other known person / Unknown (legacy)', labelBn: 'অন্যান্য পরিচিত ব্যক্তি / অজানা (পুরোনো)' },
  { value: 'neighbor', labelEn: 'Neighbor', labelBn: 'প্রতিবেশী' },
  { value: 'teacher_tutor', labelEn: 'Teacher / tutor', labelBn: 'শিক্ষক / টিউটর' },
  { value: 'supervisor_employer', labelEn: 'Supervisor / employer', labelBn: 'সুপারভাইজার / নিয়োগকর্তা' },
  { value: 'service_health_worker', labelEn: 'Service provider / healthcare worker', labelBn: 'সেবাদানকারী / স্বাস্থ্যকর্মী' },
  { value: 'transport_worker', labelEn: 'Transport worker', labelBn: 'পরিবহন কর্মী' },
  { value: 'law_enforcement_authority', labelEn: 'Law enforcement / authority', labelBn: 'আইনশৃঙ্খলা / কর্তৃপক্ষ' },
  { value: 'multiple_people', labelEn: 'Multiple people', labelBn: 'একাধিক ব্যক্তি' },
  { value: 'other', labelEn: 'Other', labelBn: 'অন্যান্য' },
  { value: 'unknown_not_stated', labelEn: 'Unknown / not stated', labelBn: 'জানা নেই / উল্লেখ নেই' },
];

export const HARASSMENT_REPORTING_FOR_OPTIONS: HarassmentClassificationOption[] = [
  { value: 'self', labelEn: 'Myself', labelBn: 'নিজের জন্য' },
  { value: 'someone_else', labelEn: 'Someone else', labelBn: 'অন্য কারও জন্য' },
];

function findLabel(options: HarassmentClassificationOption[], value: string | null | undefined, language: 'en' | 'bn'): string {
  if (!value) return language === 'bn' ? 'রেকর্ড করা হয়নি' : 'Not recorded';
  const option = options.find((item) => item.value === value);
  if (!option) return value;
  return language === 'bn' ? option.labelBn : option.labelEn;
}

export function getHarassmentAgeGroupLabel(value: HarassmentAgeGroup | string | null | undefined, language: 'en' | 'bn' = 'en'): string {
  return findLabel(HARASSMENT_AGE_GROUP_OPTIONS, value, language);
}

export function getHarassmentRelationshipLabel(value: HarassmentAbuserRelationship | string | null | undefined, language: 'en' | 'bn' = 'en'): string {
  return findLabel(HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS, value, language);
}

export function getHarassmentReportingForLabel(value: HarassmentReportingFor | string | null | undefined, language: 'en' | 'bn' = 'en'): string {
  return findLabel(HARASSMENT_REPORTING_FOR_OPTIONS, value, language);
}


export const SEXUAL_HARASSMENT_TYPE_OPTIONS: HarassmentClassificationOption[] = [
  { value: 'eve_teasing', labelEn: 'Eve-teasing / verbal harassment', labelBn: 'উত্যক্ত করা / ইভটিজিং' },
  { value: 'unwanted_physical_contact', labelEn: 'Unwanted physical contact', labelBn: 'অনাকাঙ্ক্ষিত স্পর্শ' },
  { value: 'sexual_comments_gestures_proposition', labelEn: 'Sexual comments / gestures / proposition', labelBn: 'যৌন মন্তব্য / ইঙ্গিত / প্রস্তাব' },
  { value: 'workplace_harassment', labelEn: 'Workplace sexual harassment', labelBn: 'কর্মক্ষেত্রে যৌন হয়রানি' },
  { value: 'abuse_of_power', labelEn: 'Harassment using authority / power', labelBn: 'ক্ষমতা / পদ ব্যবহার করে যৌন হয়রানি' },
  { value: 'stalking', labelEn: 'Stalking / persistent following', labelBn: 'অনুসরণ / স্টকিং' },
  { value: 'online_digital_harassment', labelEn: 'Online / digital sexual harassment', labelBn: 'অনলাইন / ডিজিটাল যৌন হয়রানি' },
  { value: 'other', labelEn: 'Other', labelBn: 'অন্যান্য' },
  { value: 'unknown_not_stated', labelEn: 'Unknown / not stated', labelBn: 'জানা নেই / উল্লেখ নেই' },
];

export const SEXUAL_HARASSMENT_CONTEXT_OPTIONS: HarassmentClassificationOption[] = [
  { value: 'workplace', labelEn: 'Workplace', labelBn: 'কর্মক্ষেত্র' },
  { value: 'educational_institution', labelEn: 'Educational institution', labelBn: 'শিক্ষাপ্রতিষ্ঠান' },
  { value: 'healthcare', labelEn: 'Hospital / healthcare', labelBn: 'হাসপাতাল / স্বাস্থ্যসেবা' },
  { value: 'public_transport', labelEn: 'Public transport', labelBn: 'গণপরিবহন' },
  { value: 'road_public_space', labelEn: 'Road / public space', labelBn: 'রাস্তা / জনসমাগমস্থল' },
  { value: 'home_private_space', labelEn: 'Home / private space', labelBn: 'বাসা / ব্যক্তিগত স্থান' },
  { value: 'online_social_media', labelEn: 'Online / social media', labelBn: 'অনলাইন / সোশ্যাল মিডিয়া' },
  { value: 'government_service', labelEn: 'Government / service institution', labelBn: 'সরকারি / সেবা প্রতিষ্ঠান' },
  { value: 'other', labelEn: 'Other', labelBn: 'অন্যান্য' },
  { value: 'unknown_not_stated', labelEn: 'Unknown / not stated', labelBn: 'জানা নেই / উল্লেখ নেই' },
];

export function getSexualHarassmentTypeLabel(
  value: string | null | undefined,
  language: 'en' | 'bn' = 'en'
): string {
  return findLabel(SEXUAL_HARASSMENT_TYPE_OPTIONS, value, language);
}

export function getSexualHarassmentContextLabel(
  value: string | null | undefined,
  language: 'en' | 'bn' = 'en'
): string {
  return findLabel(SEXUAL_HARASSMENT_CONTEXT_OPTIONS, value, language);
}
