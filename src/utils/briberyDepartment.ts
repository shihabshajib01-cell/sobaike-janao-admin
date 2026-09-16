export const BRIBERY_DEPARTMENT_LABELS: Record<string, { en: string; bn: string }> = {
  land_office: { en: 'Land Office', bn: 'ভূমি অফিস' },
  immigration_office: { en: 'Immigration Office', bn: 'ইমিগ্রেশন অফিস' },
  tax_office: { en: 'Tax Office', bn: 'কর অফিস' },
  customs_office: { en: 'Customs Office', bn: 'কাস্টমস অফিস' },
  traffic_police: { en: 'Traffic Police', bn: 'ট্রাফিক পুলিশ' },
  brta: { en: 'BRTA', bn: 'বিআরটিএ' },
  passport_office: { en: 'Passport Office', bn: 'পাসপোর্ট অফিস' },
  city_corporation: { en: 'City Corporation', bn: 'সিটি কর্পোরেশন' },
  sub_registry_office: { en: 'Sub-registry Office', bn: 'সাব-রেজিস্ট্রি অফিস' },
  education_office: { en: 'Education Office', bn: 'শিক্ষা অফিস' },
  government_hospital: { en: 'Government Hospital', bn: 'সরকারি হাসপাতাল' },
  other_government_service: { en: 'Other Government Service', bn: 'অন্যান্য সরকারি সেবা' },
};

export function getBriberyDepartmentLabel(value: string | null | undefined, language: 'en' | 'bn'): string {
  if (!value) return '-';
  return BRIBERY_DEPARTMENT_LABELS[value]?.[language] || value;
}
