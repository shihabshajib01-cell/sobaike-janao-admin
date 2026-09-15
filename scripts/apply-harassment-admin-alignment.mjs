import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.mkdirSync(path.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  fs.writeFileSync(path, content);
}

function replaceOnce(content, from, to, label) {
  const first = content.indexOf(from);
  if (first === -1) throw new Error(`Missing anchor: ${label}`);
  if (content.indexOf(from, first + from.length) !== -1) {
    throw new Error(`Anchor is not unique: ${label}`);
  }
  return content.slice(0, first) + to + content.slice(first + from.length);
}

function ensureReplace(path, marker, from, to, label) {
  let s = read(path);
  if (s.includes(marker)) return;
  s = replaceOnce(s, from, to, label);
  write(path, s);
}

const helperPath = 'src/utils/harassmentClassification.ts';
if (!fs.existsSync(helperPath)) {
  write(helperPath, `import type {
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
  { value: 'prefer_not_to_say', labelEn: 'Prefer not to say / Unknown', labelBn: 'বলতে অনিচ্ছুক / অজানা' },
];

export const HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS: HarassmentClassificationOption[] = [
  { value: 'intimate_partner', labelEn: 'Current/former intimate partner or spouse', labelBn: 'বর্তমান/সাবেক ঘনিষ্ঠ সঙ্গী বা জীবনসঙ্গী' },
  { value: 'household_family', labelEn: 'Immediate family / household member', labelBn: 'নিকট পরিবার / একই পরিবারের সদস্য' },
  { value: 'other_relative', labelEn: 'Other relative', labelBn: 'অন্যান্য আত্মীয়' },
  { value: 'friend_acquaintance', labelEn: 'Friend / acquaintance', labelBn: 'বন্ধু / পরিচিত ব্যক্তি' },
  { value: 'coworker_classmate', labelEn: 'Co-worker / classmate', labelBn: 'সহকর্মী / সহপাঠী' },
  { value: 'authority_caregiver_service_provider', labelEn: 'Authority / caregiver / service provider', labelBn: 'কর্তৃপক্ষ / পরিচর্যাকারী / সেবা প্রদানকারী' },
  { value: 'stranger', labelEn: 'Stranger', labelBn: 'অপরিচিত ব্যক্তি' },
  { value: 'other_or_unknown', labelEn: 'Other known person / Unknown', labelBn: 'অন্যান্য পরিচিত ব্যক্তি / অজানা' },
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
`);
}

// 1. Domain model + filter state
{
  const path = 'src/types/Complaint.ts';
  let s = read(path);
  if (!s.includes("export type HarassmentAgeGroup")) {
    s = replaceOnce(
      s,
      "export type ComplaintUrgency = 'low' | 'medium' | 'high' | 'urgent';\n\n",
      "export type ComplaintUrgency = 'low' | 'medium' | 'high' | 'urgent';\n\nexport type HarassmentAgeGroup =\n  | 'under_18'\n  | '18_29'\n  | '30_59'\n  | '60_plus'\n  | 'prefer_not_to_say';\n\nexport type HarassmentAbuserRelationship =\n  | 'intimate_partner'\n  | 'household_family'\n  | 'other_relative'\n  | 'friend_acquaintance'\n  | 'coworker_classmate'\n  | 'authority_caregiver_service_provider'\n  | 'stranger'\n  | 'other_or_unknown';\n\nexport type HarassmentReportingFor = 'self' | 'someone_else';\n\n",
      'Complaint harassment types'
    );
  }
  if (!s.includes('affectedPersonAgeGroup?: HarassmentAgeGroup')) {
    s = replaceOnce(
      s,
      "  reporterDeviceLocation?: ReporterDeviceLocation | null;\n  // Utility Service Complaints specific attributes\n",
      "  reporterDeviceLocation?: ReporterDeviceLocation | null;\n  // Harassment-only citizen classification dimensions. Read-only in Admin.\n  affectedPersonAgeGroup?: HarassmentAgeGroup | null;\n  allegedAbuserRelationship?: HarassmentAbuserRelationship | null;\n  reportingFor?: HarassmentReportingFor | null;\n  // Utility Service Complaints specific attributes\n",
      'Complaint harassment fields'
    );
  }
  if (!s.includes('affectedPersonAgeGroup: string;')) {
    s = replaceOnce(
      s,
      "  location: string;\n  dateRange: string;\n",
      "  location: string;\n  affectedPersonAgeGroup: string;\n  allegedAbuserRelationship: string;\n  reportingFor: string;\n  dateRange: string;\n",
      'Complaint harassment filters'
    );
  }
  write(path, s);
}

// 2. Supabase complaint service model, mapper and filters
{
  const path = 'src/services/api/supabaseComplaintService.ts';
  let s = read(path);
  if (!s.includes('HarassmentAgeGroup,')) {
    s = replaceOnce(
      s,
      "  ReporterDeviceLocation,\n} from '@/types/Complaint';",
      "  ReporterDeviceLocation,\n  HarassmentAgeGroup,\n  HarassmentAbuserRelationship,\n  HarassmentReportingFor,\n} from '@/types/Complaint';",
      'Supabase harassment type imports'
    );
  }
  if (!s.includes('affected_person_age_group: string | null;')) {
    s = replaceOnce(
      s,
      "  evidence_description: string | null;\n  publication_preferences: Record<string, unknown> | null;\n",
      "  evidence_description: string | null;\n  affected_person_age_group: string | null;\n  alleged_abuser_relationship: string | null;\n  reporting_for: string | null;\n  publication_preferences: Record<string, unknown> | null;\n",
      'Supabase harassment row fields'
    );
  }
  if (!s.includes('affectedPersonAgeGroup: row.affected_person_age_group')) {
    s = replaceOnce(
      s,
      "    evidenceDescription: row.evidence_description || undefined,\n    recentBillMonth: row.recent_bill_month ?? null,\n",
      "    evidenceDescription: row.evidence_description || undefined,\n    affectedPersonAgeGroup: (row.affected_person_age_group as HarassmentAgeGroup | null) ?? null,\n    allegedAbuserRelationship: (row.alleged_abuser_relationship as HarassmentAbuserRelationship | null) ?? null,\n    reportingFor: (row.reporting_for as HarassmentReportingFor | null) ?? null,\n    recentBillMonth: row.recent_bill_month ?? null,\n",
      'Supabase harassment mapper'
    );
  }
  if (!s.includes('// Filter by Harassment Classification')) {
    s = replaceOnce(
      s,
      "    // Filter by Location (district)\n",
      "    // Filter by Harassment Classification (Harassment segment only)\n    if (filters.category === 'harassment') {\n      if (filters.affectedPersonAgeGroup && filters.affectedPersonAgeGroup !== 'all') {\n        query = query.eq('affected_person_age_group', filters.affectedPersonAgeGroup);\n      }\n      if (filters.allegedAbuserRelationship && filters.allegedAbuserRelationship !== 'all') {\n        query = query.eq('alleged_abuser_relationship', filters.allegedAbuserRelationship);\n      }\n      if (filters.reportingFor && filters.reportingFor !== 'all') {\n        query = query.eq('reporting_for', filters.reportingFor);\n      }\n    }\n\n    // Filter by Location (district)\n",
      'Supabase harassment filters'
    );
  }
  write(path, s);
}

// 3. Complaint detail: read-only classification card
{
  const path = 'src/components/complaints/ComplaintInfoSection.tsx';
  let s = read(path);
  if (!s.includes("from '@/utils/harassmentClassification'")) {
    s = replaceOnce(
      s,
      "import { UtilityOutageDetailsCard } from './UtilityOutageDetailsCard';\n",
      "import { UtilityOutageDetailsCard } from './UtilityOutageDetailsCard';\nimport {\n  getHarassmentAgeGroupLabel,\n  getHarassmentRelationshipLabel,\n  getHarassmentReportingForLabel,\n} from '@/utils/harassmentClassification';\n",
      'ComplaintInfo harassment helper import'
    );
  }
  if (!s.includes('Harassment Classification Context')) {
    const card = `      {/* Harassment Classification Context (read-only citizen-submitted metadata) */}\n      {complaint.categoryId === 'harassment' && (\n        <Card variant="default">\n          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">\n            <CardTitle className="text-sm font-semibold flex items-center gap-2">\n              <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />\n              <span>{isBn ? 'হয়রানি শ্রেণিবিন্যাস প্রসঙ্গ' : 'Harassment Classification Context'}</span>\n            </CardTitle>\n          </CardHeader>\n          <CardContent className="pt-4">\n            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">\n              <div className="space-y-1">\n                <p className="text-xs text-slate-500 dark:text-slate-400">\n                  {isBn ? 'প্রভাবিত ব্যক্তির বয়সের গ্রুপ' : \"Affected person's age group\"}\n                </p>\n                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">\n                  {getHarassmentAgeGroupLabel(complaint.affectedPersonAgeGroup, isBn ? 'bn' : 'en')}\n                </p>\n              </div>\n              <div className="space-y-1">\n                <p className="text-xs text-slate-500 dark:text-slate-400">\n                  {isBn ? 'অভিযুক্ত ব্যক্তির সঙ্গে সম্পর্ক' : 'Relationship with alleged abuser'}\n                </p>\n                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">\n                  {getHarassmentRelationshipLabel(complaint.allegedAbuserRelationship, isBn ? 'bn' : 'en')}\n                </p>\n              </div>\n              <div className="space-y-1">\n                <p className="text-xs text-slate-500 dark:text-slate-400">\n                  {isBn ? 'কার জন্য প্রতিবেদন' : 'Reporting for'}\n                </p>\n                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">\n                  {getHarassmentReportingForLabel(complaint.reportingFor, isBn ? 'bn' : 'en')}\n                </p>\n              </div>\n            </div>\n            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">\n              {isBn ? 'নাগরিকের জমা দেওয়া শ্রেণিবিন্যাস; অ্যাডমিন ভিউতে শুধু-পঠনযোগ্য।' : 'Citizen-submitted classification; read-only in the Admin view.'}\n            </p>\n          </CardContent>\n        </Card>\n      )}\n\n`;
    s = replaceOnce(
      s,
      "      {/* 2. Reporter Information & Verification Card */}\n",
      card + "      {/* 2. Reporter Information & Verification Card */}\n",
      'ComplaintInfo harassment card'
    );
  }
  write(path, s);
}

// 4. Complaint filters
{
  const path = 'src/components/complaints/ComplaintFilters.tsx';
  let s = read(path);
  if (!s.includes('HARASSMENT_AGE_GROUP_OPTIONS')) {
    s = replaceOnce(
      s,
      "import { RotateCcw, X, Filter } from 'lucide-react';\n",
      "import { RotateCcw, X, Filter } from 'lucide-react';\nimport {\n  HARASSMENT_AGE_GROUP_OPTIONS,\n  HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS,\n  HARASSMENT_REPORTING_FOR_OPTIONS,\n  getHarassmentAgeGroupLabel,\n  getHarassmentRelationshipLabel,\n  getHarassmentReportingForLabel,\n} from '@/utils/harassmentClassification';\n",
      'ComplaintFilters harassment imports'
    );
  }
  if (!s.includes('const isHarassmentFilter = filters.category')) {
    s = replaceOnce(
      s,
      "  const isBn = language === 'bn';\n",
      "  const isBn = language === 'bn';\n  const isHarassmentFilter = filters.category === 'harassment';\n",
      'ComplaintFilters harassment flag'
    );
  }
  if (!s.includes("onFilterChange('affectedPersonAgeGroup'")) {
    s = replaceOnce(
      s,
      "          onChange={(e) => onFilterChange('category', e.target.value)}\n",
      "          onChange={(e) => onFilterChange('category', e.target.value)}\n",
      'ComplaintFilters category handler anchor'
    );
    const fields = `\n        {isHarassmentFilter && (\n          <>\n            <Select\n              label={isBn ? 'প্রভাবিত ব্যক্তির বয়স' : \"Affected person's age\"}\n              value={filters.affectedPersonAgeGroup}\n              onChange={(e) => onFilterChange('affectedPersonAgeGroup', e.target.value)}\n              options={[\n                { value: 'all', label: isBn ? 'সকল বয়সের গ্রুপ' : 'All age groups' },\n                ...HARASSMENT_AGE_GROUP_OPTIONS.map((item) => ({\n                  value: item.value,\n                  label: isBn ? item.labelBn : item.labelEn,\n                })),\n              ]}\n            />\n\n            <Select\n              label={isBn ? 'অভিযুক্ত ব্যক্তির সঙ্গে সম্পর্ক' : 'Relationship'}\n              value={filters.allegedAbuserRelationship}\n              onChange={(e) => onFilterChange('allegedAbuserRelationship', e.target.value)}\n              options={[\n                { value: 'all', label: isBn ? 'সকল সম্পর্ক' : 'All relationships' },\n                ...HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS.map((item) => ({\n                  value: item.value,\n                  label: isBn ? item.labelBn : item.labelEn,\n                })),\n              ]}\n            />\n\n            <Select\n              label={isBn ? 'কার জন্য প্রতিবেদন' : 'Reporting for'}\n              value={filters.reportingFor}\n              onChange={(e) => onFilterChange('reportingFor', e.target.value)}\n              options={[\n                { value: 'all', label: isBn ? 'সকল ধরন' : 'All reporting types' },\n                ...HARASSMENT_REPORTING_FOR_OPTIONS.map((item) => ({\n                  value: item.value,\n                  label: isBn ? item.labelBn : item.labelEn,\n                })),\n              ]}\n            />\n          </>\n        )}\n`;
    s = replaceOnce(
      s,
      "        {/* Action button */}\n",
      fields + "\n        {/* Action button */}\n",
      'ComplaintFilters harassment fields'
    );
  }
  if (!s.includes('filters.affectedPersonAgeGroup !==')) {
    const badges = `\n          {isHarassmentFilter && filters.affectedPersonAgeGroup !== 'all' && (\n            <Badge status="info" size="sm" className="inline-flex items-center gap-1">\n              <span>{getHarassmentAgeGroupLabel(filters.affectedPersonAgeGroup, isBn ? 'bn' : 'en')}</span>\n              <button type="button" onClick={() => onFilterChange('affectedPersonAgeGroup', 'all')} className="hover:opacity-75 cursor-pointer" aria-label="Remove age group filter">\n                <X className="w-3 h-3" />\n              </button>\n            </Badge>\n          )}\n\n          {isHarassmentFilter && filters.allegedAbuserRelationship !== 'all' && (\n            <Badge status="info" size="sm" className="inline-flex items-center gap-1">\n              <span>{getHarassmentRelationshipLabel(filters.allegedAbuserRelationship, isBn ? 'bn' : 'en')}</span>\n              <button type="button" onClick={() => onFilterChange('allegedAbuserRelationship', 'all')} className="hover:opacity-75 cursor-pointer" aria-label="Remove relationship filter">\n                <X className="w-3 h-3" />\n              </button>\n            </Badge>\n          )}\n\n          {isHarassmentFilter && filters.reportingFor !== 'all' && (\n            <Badge status="info" size="sm" className="inline-flex items-center gap-1">\n              <span>{getHarassmentReportingForLabel(filters.reportingFor, isBn ? 'bn' : 'en')}</span>\n              <button type="button" onClick={() => onFilterChange('reportingFor', 'all')} className="hover:opacity-75 cursor-pointer" aria-label="Remove reporting-for filter">\n                <X className="w-3 h-3" />\n              </button>\n            </Badge>\n          )}\n`;
    s = replaceOnce(
      s,
      "          {filters.location !== 'all' && (\n",
      badges + "\n          {filters.location !== 'all' && (\n",
      'ComplaintFilters harassment badges'
    );
  }
  write(path, s);
}

// 5. Complaints page state/reset and filter safety
{
  const path = 'src/pages/Complaints/ComplaintsPage.tsx';
  let s = read(path);
  if (!s.includes("affectedPersonAgeGroup: 'all'")) {
    s = replaceOnce(
      s,
      "    location: 'all',\n    dateRange: 'all',\n",
      "    location: 'all',\n    affectedPersonAgeGroup: 'all',\n    allegedAbuserRelationship: 'all',\n    reportingFor: 'all',\n    dateRange: 'all',\n",
      'ComplaintsPage initial classification filters'
    );
  }
  if (!s.includes("filters.affectedPersonAgeGroup !== 'all'")) {
    s = replaceOnce(
      s,
      "      filters.location !== 'all' ||\n      filters.dateRange !== 'all'\n",
      "      filters.location !== 'all' ||\n      filters.affectedPersonAgeGroup !== 'all' ||\n      filters.allegedAbuserRelationship !== 'all' ||\n      filters.reportingFor !== 'all' ||\n      filters.dateRange !== 'all'\n",
      'ComplaintsPage active classification filters'
    );
  }
  if (!s.includes("key === 'category' && value !== 'harassment'")) {
    s = replaceOnce(
      s,
      "  const handleFilterChange = (key: keyof ComplaintFilterState, value: string) => {\n    setFilters((prev) => ({ ...prev, [key]: value }));\n  };\n",
      "  const handleFilterChange = (key: keyof ComplaintFilterState, value: string) => {\n    setFilters((prev) => {\n      const next = { ...prev, [key]: value };\n      if (key === 'category' && value !== 'harassment') {\n        next.affectedPersonAgeGroup = 'all';\n        next.allegedAbuserRelationship = 'all';\n        next.reportingFor = 'all';\n      }\n      return next;\n    });\n  };\n",
      'ComplaintsPage category classification reset'
    );
  }
  if ((s.match(/affectedPersonAgeGroup: 'all'/g) || []).length < 2) {
    s = replaceOnce(
      s,
      "      location: 'all',\n      dateRange: 'all',\n",
      "      location: 'all',\n      affectedPersonAgeGroup: 'all',\n      allegedAbuserRelationship: 'all',\n      reportingFor: 'all',\n      dateRange: 'all',\n",
      'ComplaintsPage reset classification filters'
    );
  }
  if (!s.includes('affectedPersonAgeGroup: filters.affectedPersonAgeGroup')) {
    s = replaceOnce(
      s,
      "          search: filters.searchQuery,\n",
      "          search: filters.searchQuery,\n          affectedPersonAgeGroup: filters.affectedPersonAgeGroup,\n          allegedAbuserRelationship: filters.allegedAbuserRelationship,\n          reportingFor: filters.reportingFor,\n",
      'ComplaintsPage export classification filters'
    );
  }
  write(path, s);
}

// 6. Map domain model
{
  const path = 'src/types/Map.ts';
  let s = read(path);
  if (!s.includes('affectedPersonAgeGroup?: string | null;')) {
    s = replaceOnce(
      s,
      "  status: ComplaintLifecycleStatus;\n  latitude: number;\n",
      "  status: ComplaintLifecycleStatus;\n  affectedPersonAgeGroup?: string | null;\n  allegedAbuserRelationship?: string | null;\n  reportingFor?: string | null;\n  latitude: number;\n",
      'Map complaint classification fields'
    );
  }
  if (!s.includes('affectedPersonAgeGroup: string;')) {
    s = replaceOnce(
      s,
      "  district: string;\n  dateRange: string;\n",
      "  district: string;\n  affectedPersonAgeGroup: string;\n  allegedAbuserRelationship: string;\n  reportingFor: string;\n  dateRange: string;\n",
      'Map classification filter state'
    );
  }
  write(path, s);
}

// 7. Map API mapping
{
  const path = 'src/services/api/mapApi.ts';
  let s = read(path);
  if (!s.includes('affectedPersonAgeGroup: row.affected_person_age_group')) {
    s = replaceOnce(
      s,
      "        status,\n        latitude: latNum,\n",
      "        status,\n        affectedPersonAgeGroup: row.affected_person_age_group ?? row.affectedPersonAgeGroup ?? null,\n        allegedAbuserRelationship: row.alleged_abuser_relationship ?? row.allegedAbuserRelationship ?? null,\n        reportingFor: row.reporting_for ?? row.reportingFor ?? null,\n        latitude: latNum,\n",
      'Map API classification mapping'
    );
  }
  write(path, s);
}

// 8. Map filters UI
{
  const path = 'src/components/map/MapFilters.tsx';
  let s = read(path);
  if (!s.includes('HARASSMENT_AGE_GROUP_OPTIONS')) {
    s = replaceOnce(
      s,
      "import { cn } from '@/utils';\n",
      "import { cn } from '@/utils';\nimport {\n  HARASSMENT_AGE_GROUP_OPTIONS,\n  HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS,\n  HARASSMENT_REPORTING_FOR_OPTIONS,\n  getHarassmentAgeGroupLabel,\n  getHarassmentRelationshipLabel,\n  getHarassmentReportingForLabel,\n} from '@/utils/harassmentClassification';\n",
      'MapFilters harassment imports'
    );
  }
  if (!s.includes('const isHarassmentFilter = filters.segment')) {
    s = replaceOnce(
      s,
      "  const isBn = language === 'bn';\n",
      "  const isBn = language === 'bn';\n  const isHarassmentFilter = filters.segment === 'harassment';\n",
      'MapFilters harassment flag'
    );
  }
  if (!s.includes("filters.affectedPersonAgeGroup && filters.affectedPersonAgeGroup !== 'all'")) {
    s = replaceOnce(
      s,
      "      (filters.district && filters.district !== 'all') ||\n      (filters.dateRange && filters.dateRange !== 'all')\n",
      "      (filters.district && filters.district !== 'all') ||\n      (filters.affectedPersonAgeGroup && filters.affectedPersonAgeGroup !== 'all') ||\n      (filters.allegedAbuserRelationship && filters.allegedAbuserRelationship !== 'all') ||\n      (filters.reportingFor && filters.reportingFor !== 'all') ||\n      (filters.dateRange && filters.dateRange !== 'all')\n",
      'MapFilters active classification filters'
    );
  }
  if (!s.includes("affectedPersonAgeGroup: 'all'")) {
    s = replaceOnce(
      s,
      "      subcategory: 'all', // Reset subcategory when segment changes\n",
      "      subcategory: 'all', // Reset subcategory when segment changes\n      affectedPersonAgeGroup: 'all',\n      allegedAbuserRelationship: 'all',\n      reportingFor: 'all',\n",
      'MapFilters segment classification reset'
    );
  }
  if (!s.includes('id="map-harassment-age-select"')) {
    const fields = `\n        {isHarassmentFilter && (\n          <>\n            <div>\n              <Select id="map-harassment-age-select" value={filters.affectedPersonAgeGroup} onChange={(e) => onChange({ ...filters, affectedPersonAgeGroup: e.target.value })} className="h-9 text-xs">\n                <option value="all">{isBn ? 'সকল বয়সের গ্রুপ' : 'All age groups'}</option>\n                {HARASSMENT_AGE_GROUP_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isBn ? item.labelBn : item.labelEn}</option>)}\n              </Select>\n            </div>\n            <div>\n              <Select id="map-harassment-relationship-select" value={filters.allegedAbuserRelationship} onChange={(e) => onChange({ ...filters, allegedAbuserRelationship: e.target.value })} className="h-9 text-xs">\n                <option value="all">{isBn ? 'সকল সম্পর্ক' : 'All relationships'}</option>\n                {HARASSMENT_ABUSER_RELATIONSHIP_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isBn ? item.labelBn : item.labelEn}</option>)}\n              </Select>\n            </div>\n            <div>\n              <Select id="map-harassment-reporting-for-select" value={filters.reportingFor} onChange={(e) => onChange({ ...filters, reportingFor: e.target.value })} className="h-9 text-xs">\n                <option value="all">{isBn ? 'কার জন্য: সকল' : 'Reporting for: all'}</option>\n                {HARASSMENT_REPORTING_FOR_OPTIONS.map((item) => <option key={item.value} value={item.value}>{isBn ? item.labelBn : item.labelEn}</option>)}\n              </Select>\n            </div>\n          </>\n        )}\n`;
    s = replaceOnce(
      s,
      "        {/* District */}\n",
      fields + "\n        {/* District */}\n",
      'MapFilters classification fields'
    );
  }
  if (!s.includes('Remove map age group filter')) {
    const chips = `\n              {isHarassmentFilter && filters.affectedPersonAgeGroup !== 'all' && (\n                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">\n                  <span>{getHarassmentAgeGroupLabel(filters.affectedPersonAgeGroup, isBn ? 'bn' : 'en')}</span>\n                  <button type="button" onClick={() => onChange({ ...filters, affectedPersonAgeGroup: 'all' })} className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer" aria-label="Remove map age group filter"><X className="w-3 h-3" /></button>\n                </span>\n              )}\n\n              {isHarassmentFilter && filters.allegedAbuserRelationship !== 'all' && (\n                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">\n                  <span>{getHarassmentRelationshipLabel(filters.allegedAbuserRelationship, isBn ? 'bn' : 'en')}</span>\n                  <button type="button" onClick={() => onChange({ ...filters, allegedAbuserRelationship: 'all' })} className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer" aria-label="Remove map relationship filter"><X className="w-3 h-3" /></button>\n                </span>\n              )}\n\n              {isHarassmentFilter && filters.reportingFor !== 'all' && (\n                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">\n                  <span>{getHarassmentReportingForLabel(filters.reportingFor, isBn ? 'bn' : 'en')}</span>\n                  <button type="button" onClick={() => onChange({ ...filters, reportingFor: 'all' })} className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer" aria-label="Remove map reporting-for filter"><X className="w-3 h-3" /></button>\n                </span>\n              )}\n`;
    s = replaceOnce(
      s,
      "              {filters.status && filters.status !== 'all' && (\n",
      chips + "\n              {filters.status && filters.status !== 'all' && (\n",
      'MapFilters classification chips'
    );
  }
  write(path, s);
}

// 9. Map page defaults + client filtering
{
  const path = 'src/pages/Map/MapPage.tsx';
  let s = read(path);
  if (!s.includes("affectedPersonAgeGroup: 'all'")) {
    s = replaceOnce(
      s,
      "  district: 'all',\n  dateRange: 'all',\n",
      "  district: 'all',\n  affectedPersonAgeGroup: 'all',\n  allegedAbuserRelationship: 'all',\n  reportingFor: 'all',\n  dateRange: 'all',\n",
      'MapPage initial classification filters'
    );
  }
  if (!s.includes('// 4. Harassment Classification')) {
    s = replaceOnce(
      s,
      "      // 4. Status\n",
      "      // 4. Harassment Classification\n      if (filters.segment === 'harassment') {\n        if (filters.affectedPersonAgeGroup !== 'all' && item.affectedPersonAgeGroup !== filters.affectedPersonAgeGroup) return false;\n        if (filters.allegedAbuserRelationship !== 'all' && item.allegedAbuserRelationship !== filters.allegedAbuserRelationship) return false;\n        if (filters.reportingFor !== 'all' && item.reportingFor !== filters.reportingFor) return false;\n      }\n\n      // 5. Status\n",
      'MapPage classification filtering'
    );
    s = s.replace('      // 5. District\n', '      // 6. District\n');
    s = s.replace('      // 6. Date Range\n', '      // 7. Date Range\n');
  }
  write(path, s);
}

// 10. Export alignment (CSV fields + filter summary)
{
  const path = 'src/utils/exportUtils.ts';
  let s = read(path);
  if (!s.includes("from '@/utils/harassmentClassification'")) {
    s = replaceOnce(
      s,
      "import { Complaint } from '@/types/Complaint';\n",
      "import { Complaint } from '@/types/Complaint';\nimport {\n  getHarassmentAgeGroupLabel,\n  getHarassmentRelationshipLabel,\n  getHarassmentReportingForLabel,\n} from '@/utils/harassmentClassification';\n",
      'Export harassment helper import'
    );
  }
  if (!s.includes("'Affected Person Age Group'")) {
    s = replaceOnce(
      s,
      "    'Subcategory (BN)',\n    'Status',\n",
      "    'Subcategory (BN)',\n    'Affected Person Age Group',\n    'Relationship with Alleged Abuser',\n    'Reporting For',\n    'Status',\n",
      'Export harassment CSV headers'
    );
    s = replaceOnce(
      s,
      "    c.subcategoryBn,\n    c.status,\n",
      "    c.subcategoryBn,\n    c.categoryId === 'harassment' ? getHarassmentAgeGroupLabel(c.affectedPersonAgeGroup, 'en') : '',\n    c.categoryId === 'harassment' ? getHarassmentRelationshipLabel(c.allegedAbuserRelationship, 'en') : '',\n    c.categoryId === 'harassment' ? getHarassmentReportingForLabel(c.reportingFor, 'en') : '',\n    c.status,\n",
      'Export harassment CSV values'
    );
  }
  if (!s.includes('affectedPersonAgeGroup?: string;')) {
    s = replaceOnce(
      s,
      "  search?: string;\n}\n",
      "  search?: string;\n  affectedPersonAgeGroup?: string;\n  allegedAbuserRelationship?: string;\n  reportingFor?: string;\n}\n",
      'Export classification filter summary type'
    );
  }
  if (!s.includes("label: 'Age Group'")) {
    s = replaceOnce(
      s,
      "    if (filterSummary?.search) {\n      filterItems.push({ label: 'Search', value: `\"${filterSummary.search}\"` });\n    }\n",
      "    if (filterSummary?.search) {\n      filterItems.push({ label: 'Search', value: `\"${filterSummary.search}\"` });\n    }\n    if (filterSummary?.affectedPersonAgeGroup && filterSummary.affectedPersonAgeGroup !== 'all') {\n      filterItems.push({ label: 'Age Group', value: getHarassmentAgeGroupLabel(filterSummary.affectedPersonAgeGroup, 'en') });\n    }\n    if (filterSummary?.allegedAbuserRelationship && filterSummary.allegedAbuserRelationship !== 'all') {\n      filterItems.push({ label: 'Relationship', value: getHarassmentRelationshipLabel(filterSummary.allegedAbuserRelationship, 'en') });\n    }\n    if (filterSummary?.reportingFor && filterSummary.reportingFor !== 'all') {\n      filterItems.push({ label: 'Reporting For', value: getHarassmentReportingForLabel(filterSummary.reportingFor, 'en') });\n    }\n",
      'Export classification filter criteria'
    );
  }
  write(path, s);
}

// 11. Admin map RPC migration - additive fields only, same authorization contract
const migrationPath = 'supabase/migrations/20260915155000_admin_harassment_map_alignment.sql';
if (!fs.existsSync(migrationPath)) {
  write(migrationPath, `-- Admin Harassment classification map alignment\n-- Additive extension only: same active-admin + map.view contract, same output structure,\n-- with three harassment classification fields included per complaint row for client-side filtering.\n\ncreate or replace function public.admin_get_map_dataset()\nreturns jsonb\nlanguage plpgsql\nstable\nsecurity definer\nset search_path = pg_catalog, public\nas $$\ndeclare\n    v_complaints jsonb;\n    v_segments jsonb;\n    v_subcategories jsonb;\n    v_unsupported_status_count int;\nbegin\n    if not public.is_active_admin() then\n        raise exception 'Access denied. Active administrator session required.' using errcode = '42501';\n    end if;\n\n    if not public.has_permission('map.view') then\n        raise exception 'Access denied. Map view authorization required.' using errcode = '42501';\n    end if;\n\n    select count(*)::int\n    into v_unsupported_status_count\n    from public.complaints c\n    where c.status is null\n       or c.status not in ('submitted', 'published', 'unpublished', 'rejected', 'edited');\n\n    select coalesce(jsonb_agg(comp_row), '[]'::jsonb)\n    into v_complaints\n    from (\n        select\n            c.id,\n            c.segment_id,\n            c.subcategory_id,\n            c.title,\n            c.title_en,\n            c.status,\n            c.formatted_address,\n            c.division,\n            c.district,\n            c.upazila_or_thana,\n            c.area,\n            c.road,\n            c.landmark,\n            c.latitude,\n            c.longitude,\n            c.affected_person_age_group,\n            c.alleged_abuser_relationship,\n            c.reporting_for,\n            c.created_at\n        from public.complaints c\n        where c.status in ('submitted', 'published', 'unpublished', 'rejected', 'edited')\n        order by c.created_at desc, c.id desc\n    ) comp_row;\n\n    select coalesce(jsonb_agg(seg_row), '[]'::jsonb)\n    into v_segments\n    from (\n        select s.id, s.name_en, s.name_bn\n        from public.segments s\n        order by s.sort_order asc, s.name_en asc\n    ) seg_row;\n\n    select coalesce(jsonb_agg(sub_row), '[]'::jsonb)\n    into v_subcategories\n    from (\n        select sc.id, sc.segment_id, sc.name_en, sc.name_bn\n        from public.subcategories sc\n        order by sc.sort_order asc, sc.name_en asc\n    ) sub_row;\n\n    return jsonb_build_object(\n        'complaints', v_complaints,\n        'segments', v_segments,\n        'subcategories', v_subcategories,\n        'unsupportedStatusCount', v_unsupported_status_count\n    );\nend;\n$$;\n\nrevoke all on function public.admin_get_map_dataset() from public;\ngrant execute on function public.admin_get_map_dataset() to authenticated, service_role;\n`);
}

console.log('Harassment Admin alignment source patch applied.');
