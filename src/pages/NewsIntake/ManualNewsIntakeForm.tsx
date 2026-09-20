import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  FilePlus2,
  Link2,
  Newspaper,
  RefreshCw,
  SearchCheck,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Radio, RadioGroup } from '@/components/ui/Radio';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FeedbackNotice } from '@/components/ui/FeedbackNotice';
import { Tag } from '@/components/ui/Tag';
import { useLanguage } from '@/context/LanguageContext';
import { complaintApi, newsIntakeApi } from '@/services/api';
import { reportingFormApi } from '@/services/api/reportingFormApi';
import {
  ReportingFormBundle,
  ReportingFormField,
} from '@/types/ReportingForm';
import {
  NewsIntakePayload,
  NewsIntakePreview,
  NewsIntakeReport,
  NewsIntakeSource,
  NewsIntakeTaxonomy,
  NewsIntakeLocationTaxonomy,
} from '@/types/NewsIntake';

const EMPTY_SOURCE: NewsIntakeSource = {
  sourceType: 'news',
  publisherName: '',
  sourceTitle: '',
  canonicalUrl: '',
  sourcePublishedDate: '',
};

const EMPTY_REPORT: NewsIntakeReport = {
  segmentId: '',
  subcategoryId: '',
  titleBn: '',
  titleEn: '',
  descriptionBn: '',
  descriptionEn: '',
  incidentDate: '',
  incidentTime: '',
  utilityEndTime: '',
  frequency: 'one-time',
  priority: 'medium',
  division: '',
  district: '',
  upazilaOrThana: '',
  area: '',
  road: '',
  landmark: '',
  formattedAddress: '',
  relationshipContext: '',
  recentBillMonth: '',
  recentBillAmount: '',
  previousBillMonth: '',
  previousBillAmount: '',
  briberyDepartment: '',
  briberyService: '',
  briberyAmount: '',
  affectedPersonAgeGroup: '',
  allegedAbuserRelationship: '',
  reportingFor: '',
  sexualHarassmentType: '',
  sexualHarassmentContext: '',
  sexualHarassmentInstitution: '',
  intimateWhatHappened: '',
  intimatePlatform: '',
  mobJusticeDetails: null,
  customFieldAnswers: { locationScope: 'specific' },
};

const AGE_OPTIONS = [
  ['under_18', 'Under 18', '১৮ বছরের কম'],
  ['18_29', '18–29', '১৮–২৯'],
  ['30_59', '30–59', '৩০–৫৯'],
  ['60_plus', '60+', '৬০+'],
  ['prefer_not_to_say', 'Prefer not to say', 'বলতে অনিচ্ছুক'],
  ['unknown_not_stated', 'Unknown / not stated', 'জানা নেই / উল্লেখ নেই'],
];

const RELATIONSHIP_OPTIONS = [
  ['intimate_partner', 'Current / former intimate partner or spouse', 'বর্তমান / সাবেক ঘনিষ্ঠ সঙ্গী বা স্বামী/স্ত্রী'],
  ['household_family', 'Immediate family / household member', 'নিকট পরিবারের / একই পরিবারের সদস্য'],
  ['other_relative', 'Other relative', 'অন্যান্য আত্মীয়'],
  ['friend_acquaintance', 'Friend / acquaintance', 'বন্ধু / পরিচিত ব্যক্তি'],
  ['coworker_classmate', 'Co-worker / classmate', 'সহকর্মী / সহপাঠী'],
  ['authority_caregiver_service_provider', 'Authority / caregiver / service provider', 'কর্তৃপক্ষ / পরিচর্যাকারী / সেবাদানকারী'],
  ['stranger', 'Stranger', 'অপরিচিত ব্যক্তি'],
  ['neighbor', 'Neighbor', 'প্রতিবেশী'],
  ['teacher_tutor', 'Teacher / tutor', 'শিক্ষক / টিউটর'],
  ['supervisor_employer', 'Supervisor / employer', 'সুপারভাইজার / নিয়োগকর্তা'],
  ['service_health_worker', 'Service provider / healthcare worker', 'সেবাদানকারী / স্বাস্থ্যকর্মী'],
  ['transport_worker', 'Transport worker', 'পরিবহন কর্মী'],
  ['law_enforcement_authority', 'Law enforcement / authority', 'আইনশৃঙ্খলা / কর্তৃপক্ষ'],
  ['multiple_people', 'Multiple people', 'একাধিক ব্যক্তি'],
  ['other', 'Other', 'অন্যান্য'],
  ['unknown_not_stated', 'Unknown / not stated', 'জানা নেই / উল্লেখ নেই'],
];

const REPORTING_FOR_OPTIONS = [
  ['self', 'Self', 'নিজের জন্য'],
  ['someone_else', 'Someone else', 'অন্য কারও জন্য'],
];

const SEXUAL_HARASSMENT_TYPE_OPTIONS = [
  ['eve_teasing', 'Eve teasing', 'ইভ টিজিং'],
  ['unwanted_physical_contact', 'Unwanted physical contact', 'অনিচ্ছাকৃত শারীরিক স্পর্শ'],
  ['sexual_comments_gestures_proposition', 'Sexual comments / gestures / proposition', 'যৌন মন্তব্য / অঙ্গভঙ্গি / প্রস্তাব'],
  ['workplace_harassment', 'Workplace harassment', 'কর্মক্ষেত্রে হয়রানি'],
  ['abuse_of_power', 'Abuse of power', 'ক্ষমতার অপব্যবহার'],
  ['stalking', 'Stalking', 'অনুসরণ / স্টকিং'],
  ['online_digital_harassment', 'Online / digital harassment', 'অনলাইন / ডিজিটাল হয়রানি'],
  ['other', 'Other', 'অন্যান্য'],
  ['unknown_not_stated', 'Unknown / not stated', 'জানা নেই / উল্লেখ নেই'],
];

const SEXUAL_CONTEXT_OPTIONS = [
  ['workplace', 'Workplace', 'কর্মক্ষেত্র'],
  ['educational_institution', 'Educational institution', 'শিক্ষাপ্রতিষ্ঠান'],
  ['healthcare', 'Healthcare', 'স্বাস্থ্যসেবা'],
  ['public_transport', 'Public transport', 'গণপরিবহন'],
  ['road_public_space', 'Road / public space', 'রাস্তা / জনসমাগমস্থল'],
  ['home_private_space', 'Home / private space', 'বাড়ি / ব্যক্তিগত স্থান'],
  ['online_social_media', 'Online / social media', 'অনলাইন / সামাজিক যোগাযোগমাধ্যম'],
  ['government_service', 'Government service', 'সরকারি সেবা'],
  ['other', 'Other', 'অন্যান্য'],
  ['unknown_not_stated', 'Unknown / not stated', 'জানা নেই / উল্লেখ নেই'],
];

const MOB_TRIGGER_OPTIONS = [
  ['suspected_theft_robbery', 'Suspected theft / robbery', 'চুরি / ডাকাতির সন্দেহ'],
  ['snatching_allegation', 'Snatching allegation', 'ছিনতাইয়ের অভিযোগ'],
  ['kidnapping_allegation', 'Kidnapping allegation', 'অপহরণের অভিযোগ'],
  ['sexual_offence_allegation', 'Sexual offence allegation', 'যৌন অপরাধের অভিযোগ'],
  ['religious_sentiment_allegation', 'Religious sentiment allegation', 'ধর্মীয় অনুভূতিতে আঘাতের অভিযোগ'],
  ['personal_local_dispute', 'Personal / local dispute', 'ব্যক্তিগত / স্থানীয় বিরোধ'],
  ['informal_punishment', 'Informal punishment', 'অনানুষ্ঠানিক শাস্তি'],
  ['other_accusation_dispute', 'Other accusation / dispute', 'অন্যান্য অভিযোগ / বিরোধ'],
  ['unknown', 'Unknown', 'জানা নেই'],
];

const MOB_OUTCOME_OPTIONS = [
  ['threatened_harassed', 'Threatened / harassed', 'হুমকি / হয়রানি'],
  ['restrained_surrounded', 'Restrained / surrounded', 'আটকে রাখা / ঘেরাও'],
  ['physically_assaulted', 'Physically assaulted', 'শারীরিক হামলা'],
  ['seriously_injured', 'Seriously injured', 'গুরুতর আহত'],
  ['death_reported', 'Death reported', 'মৃত্যুর খবর'],
  ['property_damaged', 'Property damaged', 'সম্পত্তির ক্ষতি'],
  ['rescued_intervention', 'Rescued / intervention', 'উদ্ধার / হস্তক্ষেপ'],
  ['ongoing', 'Ongoing', 'চলমান'],
  ['unknown', 'Unknown', 'জানা নেই'],
];

const optionList = (
  options: string[][],
  isBn: boolean
): Array<{ value: string; label: string }> =>
  options.map(([value, en, bn]) => ({ value, label: isBn ? bn : en }));

const detectSourceLanguage = (value: string): 'bn' | 'en' | 'mixed' | 'unknown' => {
  const hasBn = /[ঀ-৿]/u.test(value);
  const hasEn = /[A-Za-z]/.test(value);
  if (hasBn && hasEn) return 'mixed';
  if (hasBn) return 'bn';
  if (hasEn) return 'en';
  return 'unknown';
};

const SUPPORTED_DYNAMIC_FIELD_TYPES = new Set([
  'text',
  'textarea',
  'number',
  'currency',
  'date',
  'time',
  'month',
  'select',
  'radio',
  'checkbox',
  'multiselect',
  'phone',
  'email',
  'url',
]);

const MANUAL_INTAKE_CORE_STORAGE_KEYS = new Set([
  'title',
  'description',
  'incidentDate',
  'incidentTime',
  'utilityEndTime',
  'frequency',
  'priority',
  'relationshipContext',
  'recentBillMonth',
  'recentBillAmount',
  'previousBillMonth',
  'previousBillAmount',
  'briberyDepartment',
  'briberyService',
  'briberyAmount',
  'affectedPersonAgeGroup',
  'allegedAbuserRelationship',
  'reportingFor',
  'sexualHarassmentType',
  'sexualHarassmentContext',
  'sexualHarassmentInstitution',
  'intimateWhatHappened',
  'intimatePlatform',
  'mobJusticeDetails',
]);

const MANUAL_INTAKE_SYSTEM_FIELDS = new Set([
  'location',
  'mob_justice_details',
  'mobJusticeDetails',
]);

const dynamicStorageKey = (field: ReportingFormField) =>
  field.storageKey?.trim() || field.fieldKey;

const NEWS_INTAKE_PRIVACY_REVIEW_SUBCATEGORIES = new Set([
  'child_abduction_murder',
  'rape-sexual-violence',
  'sexual-harassment',
  'domestic-violence',
  'blackmail-coercion',
  'honeytrap',
]);

const isEmptyDynamicValue = (value: unknown) =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0);

const isValidDynamicEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidDynamicPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

const isValidDynamicUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const dynamicValidationError = (
  field: ReportingFormField,
  value: unknown,
  isBn: boolean
): string | null => {
  if (field.required && field.fieldType === 'checkbox' && value !== true) {
    return isBn ? 'চালিয়ে যেতে এই অপশনটি নির্বাচন করুন।' : 'Select this option to continue.';
  }
  if (field.required && isEmptyDynamicValue(value)) {
    return isBn ? 'এই তথ্যটি আবশ্যক।' : 'This field is required.';
  }
  if (isEmptyDynamicValue(value)) return null;

  const minLength = Number(field.validation?.minLength || 0);
  const maxLength = Number(field.validation?.maxLength || 0);
  if (minLength > 0 && typeof value === 'string' && value.trim().length < minLength) {
    return isBn ? `কমপক্ষে ${minLength} অক্ষর লিখুন।` : `Use at least ${minLength} characters.`;
  }
  if (maxLength > 0 && typeof value === 'string' && value.length > maxLength) {
    return isBn ? `সর্বোচ্চ ${maxLength} অক্ষর লিখুন।` : `Use at most ${maxLength} characters.`;
  }
  if (field.fieldType === 'email' && typeof value === 'string' && !isValidDynamicEmail(value)) {
    return isBn ? 'সঠিক ইমেইল ঠিকানা লিখুন।' : 'Enter a valid email address.';
  }
  if (field.fieldType === 'url' && typeof value === 'string' && !isValidDynamicUrl(value)) {
    return isBn ? 'http:// অথবা https:// সহ সঠিক URL লিখুন।' : 'Enter a valid URL beginning with http:// or https://.';
  }
  if (field.fieldType === 'phone' && typeof value === 'string' && !isValidDynamicPhone(value)) {
    return isBn ? '৭–১৫ সংখ্যার সঠিক ফোন নম্বর লিখুন।' : 'Enter a valid phone number containing 7–15 digits.';
  }
  if (field.fieldType === 'number' || field.fieldType === 'currency') {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return isBn ? 'সঠিক সংখ্যা লিখুন।' : 'Enter a valid number.';
    }
    if (field.validation?.min !== undefined && numberValue < Number(field.validation.min)) {
      return isBn ? `সর্বনিম্ন মান ${field.validation.min}।` : `Minimum value is ${field.validation.min}.`;
    }
    if (field.validation?.max !== undefined && numberValue > Number(field.validation.max)) {
      return isBn ? `সর্বোচ্চ মান ${field.validation.max}।` : `Maximum value is ${field.validation.max}.`;
    }
  }
  if (
    (field.fieldType === 'date' || field.fieldType === 'time' || field.fieldType === 'month') &&
    typeof value === 'string'
  ) {
    const minValue = field.validation?.min !== undefined ? String(field.validation.min) : '';
    const maxValue = field.validation?.max !== undefined ? String(field.validation.max) : '';
    if (minValue && value < minValue) {
      return isBn ? `সর্বনিম্ন অনুমোদিত মান ${minValue}।` : `Earliest allowed value is ${minValue}.`;
    }
    if (maxValue && value > maxValue) {
      return isBn ? `সর্বোচ্চ অনুমোদিত মান ${maxValue}।` : `Latest allowed value is ${maxValue}.`;
    }
  }
  return null;
};

const isManualFieldSupported = (field: ReportingFormField) => {
  const storageKey = dynamicStorageKey(field);
  if (field.storageMode === 'core_column') {
    return MANUAL_INTAKE_CORE_STORAGE_KEYS.has(storageKey);
  }
  if (field.storageMode === 'system_block') {
    return (
      MANUAL_INTAKE_SYSTEM_FIELDS.has(field.fieldKey) ||
      MANUAL_INTAKE_SYSTEM_FIELDS.has(storageKey)
    );
  }
  if (field.storageMode !== 'custom_json') return false;
  if (!SUPPORTED_DYNAMIC_FIELD_TYPES.has(field.fieldType)) return false;
  if (
    ['select', 'radio', 'multiselect'].includes(field.fieldType) &&
    (!Array.isArray(field.options) || field.options.length === 0)
  ) {
    return false;
  }
  return true;
};

interface ManualNewsIntakeFormProps {
  initialSourceUrl?: string;
}

export const ManualNewsIntakeForm: React.FC<ManualNewsIntakeFormProps> = ({
  initialSourceUrl = '',
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [source, setSource] = useState<NewsIntakeSource>({
    ...EMPTY_SOURCE,
    canonicalUrl: initialSourceUrl,
  });
  const [report, setReport] = useState<NewsIntakeReport>(EMPTY_REPORT);
  const [taxonomy, setTaxonomy] = useState<NewsIntakeTaxonomy>({
    segments: [],
    subcategories: [],
  });
  const [locationTaxonomy, setLocationTaxonomy] = useState<NewsIntakeLocationTaxonomy>({
    divisions: [],
    districts: [],
    upazilas: [],
  });
  const [metadataPreview, setMetadataPreview] = useState('');
  const [preview, setPreview] = useState<NewsIntakePreview | null>(null);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);
  const [fetchingSource, setFetchingSource] = useState(false);
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [pendingMergeId, setPendingMergeId] = useState<string | null>(null);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [publishedForm, setPublishedForm] = useState<ReportingFormBundle | null>(null);
  const [loadingPublishedForm, setLoadingPublishedForm] = useState(false);
  const [publishedFormError, setPublishedFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSourceUrl) return;
    setSource((current) => ({
      ...current,
      canonicalUrl: initialSourceUrl,
    }));
    setPreview(null);
    setCreatedReportId(null);
    setError(null);
    setSuccess(null);
  }, [initialSourceUrl]);

  useEffect(() => {
    let mounted = true;
    setLoadingTaxonomy(true);

    Promise.all([
      newsIntakeApi.getTaxonomy(),
      newsIntakeApi.getLocationTaxonomy(),
    ])
      .then(([nextTaxonomy, nextLocationTaxonomy]) => {
        if (!mounted) return;
        setTaxonomy(nextTaxonomy);
        setLocationTaxonomy(nextLocationTaxonomy);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load News Intake configuration.'
          );
        }
      })
      .finally(() => {
        if (mounted) setLoadingTaxonomy(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setPublishedForm(null);
    setPublishedFormError(null);

    if (!report.subcategoryId) {
      setLoadingPublishedForm(false);
      return () => {
        mounted = false;
      };
    }

    setLoadingPublishedForm(true);
    void reportingFormApi
      .getPublished(report.subcategoryId)
      .then((bundle) => {
        if (mounted) setPublishedForm(bundle);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setPublishedFormError(
          err instanceof Error
            ? err.message
            : 'Failed to load the currently published reporting form.'
        );
      })
      .finally(() => {
        if (mounted) setLoadingPublishedForm(false);
      });

    return () => {
      mounted = false;
    };
  }, [report.subcategoryId]);

  const availableSubcategories = useMemo(
    () =>
      taxonomy.subcategories.filter(
        (subcategory) => subcategory.segmentId === report.segmentId
      ),
    [taxonomy.subcategories, report.segmentId]
  );

  const requiresPrivacyReview =
    NEWS_INTAKE_PRIVACY_REVIEW_SUBCATEGORIES.has(report.subcategoryId);

  const selectedDivision = locationTaxonomy.divisions.find(
    (item) => item.nameEn === report.division || item.nameBn === report.division || item.id === report.division
  );

  const availableDistricts = useMemo(
    () =>
      selectedDivision
        ? locationTaxonomy.districts.filter((item) => item.divisionId === selectedDivision.id)
        : [],
    [locationTaxonomy.districts, selectedDivision]
  );

  const selectedDistrict = availableDistricts.find(
    (item) => item.nameEn === report.district || item.nameBn === report.district || item.id === report.district
  );

  const availableUpazilas = useMemo(
    () =>
      selectedDistrict
        ? locationTaxonomy.upazilas.filter((item) => item.districtId === selectedDistrict.id)
        : [],
    [locationTaxonomy.upazilas, selectedDistrict]
  );

  const publishedSchemaFields = useMemo(
    () =>
      publishedForm?.schema?.engineMode === 'schema'
        ? publishedForm.fields.filter((field) => field.active !== false)
        : [],
    [publishedForm]
  );

  const dynamicCustomFields = useMemo(
    () =>
      publishedSchemaFields.filter(
        (field) =>
          field.storageMode === 'custom_json' &&
          isManualFieldSupported(field)
      ),
    [publishedSchemaFields]
  );

  const unsupportedRequiredFields = useMemo(
    () =>
      publishedSchemaFields.filter(
        (field) => field.required && !isManualFieldSupported(field)
      ),
    [publishedSchemaFields]
  );

  const invalidatePreview = () => {
    setPreview(null);
    setSuccess(null);
    setCreatedReportId(null);
  };

  const updateSource = (patch: Partial<NewsIntakeSource>) => {
    setSource((current) => ({ ...current, ...patch }));
    invalidatePreview();
  };

  const updateReport = (patch: Partial<NewsIntakeReport>) => {
    setReport((current) => ({ ...current, ...patch }));
    invalidatePreview();
  };

  const updateDynamicAnswer = (field: ReportingFormField, value: unknown) => {
    const key = dynamicStorageKey(field);
    updateReport({
      customFieldAnswers: {
        ...report.customFieldAnswers,
        [key]: value,
      },
    });
  };

  const dynamicAnswer = (field: ReportingFormField) =>
    report.customFieldAnswers?.[dynamicStorageKey(field)];

  const payload = (): NewsIntakePayload => ({
    source,
    report: {
      ...report,
      customFieldAnswers: {
        ...report.customFieldAnswers,
        sourceLanguage: detectSourceLanguage(source.sourceTitle || report.titleBn),
        locationScope:
          String(report.customFieldAnswers?.locationScope || 'specific') === 'district_wide'
            ? 'district_wide'
            : 'specific',
      },
    },
  });

  const validate = (): string | null => {
    if (!source.canonicalUrl.trim()) {
      return isBn ? 'উৎসের URL দিন।' : 'Enter the source URL.';
    }
    if (!source.publisherName.trim()) {
      return isBn ? 'উৎস প্রকাশকের নাম দিন।' : 'Enter the source publisher.';
    }
    if (!source.sourceTitle.trim()) {
      return isBn ? 'উৎস প্রতিবেদনের শিরোনাম দিন।' : 'Enter the source article title.';
    }
    if (!report.segmentId || !report.subcategoryId) {
      return isBn ? 'ক্যাটাগরি ও সাবক্যাটাগরি নির্বাচন করুন।' : 'Select a category and subcategory.';
    }
    if (loadingPublishedForm) {
      return isBn
        ? 'প্রকাশিত রিপোর্ট ফর্ম লোড হচ্ছে। একটু অপেক্ষা করুন।'
        : 'The published reporting form is still loading. Please wait.';
    }
    if (publishedFormError) {
      return isBn
        ? 'বর্তমান প্রকাশিত রিপোর্ট ফর্ম যাচাই করা যায়নি। আবার চেষ্টা করুন।'
        : 'The current published reporting form could not be verified. Try again.';
    }
    if (unsupportedRequiredFields.length > 0) {
      const labels = unsupportedRequiredFields
        .map((field) => (isBn ? field.labelBn || field.labelEn : field.labelEn || field.labelBn))
        .filter(Boolean)
        .join(', ');
      return isBn
        ? `বর্তমান প্রকাশিত ফর্মে এমন আবশ্যক ফিল্ড আছে যা নিউজ ইনটেক এখনো নিরাপদভাবে পূরণ করতে পারে না: ${labels}। রিপোর্টটি সাধারণ রিপোর্ট ফ্লো দিয়ে সম্পন্ন করুন।`
        : `The current published form contains required fields that News Intake cannot safely populate yet: ${labels}. Complete this report through the standard report workflow.`;
    }
    const missingDynamicFields = dynamicCustomFields.filter((field) =>
      field.required &&
      (field.fieldType === 'checkbox'
        ? dynamicAnswer(field) !== true
        : isEmptyDynamicValue(dynamicAnswer(field)))
    );
    if (missingDynamicFields.length > 0) {
      const labels = missingDynamicFields
        .map((field) => (isBn ? field.labelBn || field.labelEn : field.labelEn || field.labelBn))
        .filter(Boolean)
        .join(', ');
      return isBn
        ? `প্রকাশিত ফর্মের আবশ্যক তথ্য দিন: ${labels}।`
        : `Complete the required published-form fields: ${labels}.`;
    }
    for (const field of dynamicCustomFields) {
      const validationError = dynamicValidationError(field, dynamicAnswer(field), isBn);
      if (validationError) {
        const label = isBn ? field.labelBn || field.labelEn : field.labelEn || field.labelBn;
        return label ? `${label}: ${validationError}` : validationError;
      }
    }
    if (requiresPrivacyReview && report.customFieldAnswers?.sensitiveContentReviewed !== true) {
      return isBn
        ? 'সংবেদনশীল রিপোর্টের পাবলিক শিরোনাম, সারাংশ, অবস্থান ও পরিচয়সংক্রান্ত তথ্য রিভিউ করে নিশ্চিত করুন।'
        : 'Review and confirm the public title, summary, location, and identifying details for this sensitive report.';
    }
    if (!report.titleBn.trim() || !report.descriptionBn.trim()) {
      return isBn
        ? 'উৎসের ভাষায় রিপোর্টের শিরোনাম ও ঘটনার প্রেক্ষাপট দিন।'
        : 'Enter the report title and incident context in the source language.';
    }
    if (report.titleBn.trim().length > 100 || report.titleEn.trim().length > 100) {
      return isBn ? 'রিপোর্ট শিরোনাম সর্বোচ্চ ১০০ অক্ষর।' : 'Report titles can contain at most 100 characters.';
    }
    if (!report.incidentDate || !report.division.trim() || !report.district.trim()) {
      return isBn
        ? 'ঘটনার তারিখ, বিভাগ ও জেলা আবশ্যক।'
        : 'Incident date, division, and district are required.';
    }
    const locationScope = String(report.customFieldAnswers?.locationScope || 'specific');
    const hasSpecificLocation = Boolean(
      report.upazilaOrThana.trim() ||
      report.area.trim() ||
      report.road.trim() ||
      report.landmark.trim() ||
      (
        report.formattedAddress.trim() &&
        report.formattedAddress.trim().toLowerCase() !== report.district.trim().toLowerCase()
      )
    );
    if (locationScope !== 'district_wide' && !hasSpecificLocation) {
      return isBn
        ? 'নির্দিষ্ট ঘটনার স্থান দিন, অথবা সংবাদটি সত্যিই জেলা-ব্যাপী হলে “জেলা-ব্যাপী” নির্বাচন করুন।'
        : 'Add a specific incident location, or choose “District-wide” only when the source genuinely covers the whole district.';
    }
    if (report.segmentId === 'harassment') {
      if (
        !report.affectedPersonAgeGroup ||
        !report.allegedAbuserRelationship ||
        !report.reportingFor
      ) {
        return isBn
          ? 'হয়রানি/নির্যাতন রিপোর্টে বয়সের গ্রুপ, অভিযুক্তের সম্পর্ক এবং কার পক্ষে রিপোর্ট—সবগুলো দিন।'
          : 'Harassment reports require age group, alleged-abuser relationship, and reporting-for.';
      }
    }
    if (
      report.subcategoryId === 'bribe-demanded-service' &&
      (!report.briberyDepartment.trim() || !report.briberyService.trim())
    ) {
      return isBn
        ? 'ঘুষের রিপোর্টে সংশ্লিষ্ট বিভাগ ও সেবার নাম দিন।'
        : 'Bribery reports require department and service.';
    }
    if (report.subcategoryId === 'mob-justice') {
      const mob = report.mobJusticeDetails;
      if (!mob?.trigger || !mob?.outcome || !mob?.ongoingStatus) {
        return isBn
          ? 'মব জাস্টিস রিপোর্টে কারণ, ফলাফল ও চলমান অবস্থার তথ্য দিন।'
          : 'Mob-justice reports require trigger, outcome, and ongoing status.';
      }
    }
    return null;
  };

  const handleFetchMetadata = async () => {
    if (!source.canonicalUrl.trim()) {
      setError(isBn ? 'প্রথমে উৎসের URL দিন।' : 'Enter a source URL first.');
      return;
    }

    setFetchingSource(true);
    setError(null);
    setSuccess(null);
    try {
      const metadata = await newsIntakeApi.fetchSourceMetadata(source.canonicalUrl);
      setSource((current) => ({
        ...current,
        sourceType: metadata.sourceType,
        publisherName: metadata.publisherName || current.publisherName,
        sourceTitle: metadata.sourceTitle || current.sourceTitle,
        canonicalUrl: metadata.canonicalUrl || current.canonicalUrl,
        sourcePublishedDate:
          metadata.sourcePublishedDate || current.sourcePublishedDate,
      }));
      setMetadataPreview(metadata.descriptionPreview || '');
      setPreview(null);
      setSuccess(
        isBn
          ? 'অনুমোদিত উৎস থেকে আর্টিকেল মেটাডাটা নেওয়া হয়েছে। ঘটনার তথ্য নিজে যাচাই করে পূরণ করুন।'
          : 'Article metadata loaded from an approved source. Verify and enter the incident facts yourself.'
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch source metadata.'
      );
    } finally {
      setFetchingSource(false);
    }
  };

  const handlePreview = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setChecking(true);
    setError(null);
    setSuccess(null);
    try {
      setPreview(await newsIntakeApi.preview(payload()));
    } catch (err: unknown) {
      setPreview(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to check source and incident duplication.'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleCreateDraft = async (publishAfterCreate: boolean) => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    if (!preview) {
      setError(
        isBn
          ? 'প্রথমে উৎস ও ডুপ্লিকেট যাচাই করুন।'
          : 'Run the source and duplicate check first.'
      );
      return;
    }

    if (!preview.canCreateDraft) {
      const missingFields = preview.schemaValidation?.missingFields || [];
      if (missingFields.length > 0) {
        const labels = missingFields
          .map((field) =>
            isBn
              ? field.labelBn || field.labelEn || field.fieldKey
              : field.labelEn || field.labelBn || field.fieldKey
          )
          .filter(Boolean)
          .join(', ');
        setError(
          isBn
            ? `বর্তমান রিপোর্ট ফর্মের আবশ্যক তথ্য অনুপস্থিত: ${labels}।`
            : `Required information for the current report form is missing: ${labels}.`
        );
      } else {
        setError(
          isBn
            ? 'একই উৎস ইতিমধ্যে সিস্টেমে আছে—নতুন রিপোর্ট তৈরি করা যাবে না।'
            : 'This exact source already exists, so a new report cannot be created.'
        );
      }
      return;
    }

    if (publishAfterCreate && !preview.canPublishImmediately) {
      setError(
        isBn
          ? 'সম্ভাব্য একই ঘটনা আগে রিভিউ বা মার্জ করুন।'
          : 'Review or merge the possible duplicate incident before publishing.'
      );
      return;
    }

    setCreating(true);
    setPublishing(publishAfterCreate);
    setError(null);
    setSuccess(null);
    setCreatedReportId(null);

    try {
      const created = await newsIntakeApi.createDraft(payload());
      setCreatedReportId(created.reportId);

      if (!publishAfterCreate) {
        navigate(`/complaints/${encodeURIComponent(created.reportId)}`);
        return;
      }

      if (!created.canPublishImmediately || created.duplicate.status !== 'clear') {
        setPreview({
          ...preview,
          duplicate: created.duplicate,
          canPublishImmediately: false,
        });
        setError(
          isBn
            ? `রিপোর্ট ${created.reportId} Draft হিসেবে তৈরি হয়েছে, কিন্তু প্রকাশের আগে নতুন ডুপ্লিকেট রিভিউ প্রয়োজন।`
            : `Report ${created.reportId} was created as a draft, but a new duplicate review is required before publishing.`
        );
        return;
      }

      await complaintApi.publishComplaint(created.reportId);
      navigate(`/complaints/${encodeURIComponent(created.reportId)}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to create or publish the sourced report.'
      );
    } finally {
      setCreating(false);
      setPublishing(false);
    }
  };

  const handleMerge = (complaintId: string) => {
    setPendingMergeId(complaintId);
  };

  const confirmMerge = async () => {
    const complaintId = pendingMergeId;
    if (!complaintId) return;

    setPendingMergeId(null);
    setMergingId(complaintId);
    setError(null);
    setSuccess(null);
    try {
      await newsIntakeApi.mergeSource(complaintId, source);
      navigate(`/complaints/${encodeURIComponent(complaintId)}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to merge the source.'
      );
    } finally {
      setMergingId(null);
    }
  };

  const renderDynamicField = (field: ReportingFormField) => {
    const key = dynamicStorageKey(field);
    const labelBase = isBn ? field.labelBn || field.labelEn : field.labelEn || field.labelBn;
    const label = `${labelBase || field.fieldKey}${field.required ? ' *' : ''}`;
    const helperText = isBn ? field.helperBn || field.helperEn : field.helperEn || field.helperBn;
    const value = dynamicAnswer(field);

    if (field.fieldType === 'textarea') {
      return (
        <Textarea
          key={key}
          label={label}
          helperText={helperText}
          value={typeof value === 'string' ? value : ''}
          minLength={
            field.validation?.minLength !== undefined
              ? Number(field.validation.minLength)
              : undefined
          }
          maxLength={
            field.validation?.maxLength !== undefined
              ? Number(field.validation.maxLength)
              : undefined
          }
          onChange={(event) => updateDynamicAnswer(field, event.target.value)}
        />
      );
    }

    if (field.fieldType === 'checkbox') {
      return (
        <div key={key} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <Checkbox
            id={`news-intake-dynamic-${field.fieldKey}`}
            label={label}
            description={helperText}
            checked={value === true}
            onChange={(event) => updateDynamicAnswer(field, event.target.checked)}
          />
        </div>
      );
    }

    if (field.fieldType === 'multiselect') {
      const selected = Array.isArray(value) ? value.map(String) : [];
      return (
        <fieldset
          key={key}
          className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
        >
          <legend className="px-1 type-label font-medium text-slate-700 dark:text-slate-300">
            {label}
          </legend>
          {helperText && (
            <p className="type-helper text-slate-500 dark:text-slate-400">{helperText}</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {field.options.map((option) => {
              const optionLabel = isBn
                ? option.labelBn || option.labelEn
                : option.labelEn || option.labelBn;
              return (
                <Checkbox
                  key={option.value}
                  id={`news-intake-dynamic-${field.fieldKey}-${option.value}`}
                  label={optionLabel || option.value}
                  checked={selected.includes(option.value)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? Array.from(new Set([...selected, option.value]))
                      : selected.filter((item) => item !== option.value);
                    updateDynamicAnswer(field, next);
                  }}
                />
              );
            })}
          </div>
        </fieldset>
      );
    }

    if (field.fieldType === 'select') {
      return (
        <Select
          key={key}
          label={label}
          helperText={helperText}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => updateDynamicAnswer(field, event.target.value)}
          options={[
            { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
            ...field.options.map((option) => ({
              value: option.value,
              label:
                (isBn ? option.labelBn || option.labelEn : option.labelEn || option.labelBn) ||
                option.value,
            })),
          ]}
        />
      );
    }

    if (field.fieldType === 'radio') {
      return (
        <fieldset
          key={key}
          className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
        >
          <legend className="px-1 type-label font-medium text-slate-700 dark:text-slate-300">
            {label}
          </legend>
          {helperText && (
            <p className="type-helper text-slate-500 dark:text-slate-400">{helperText}</p>
          )}
          <RadioGroup
            name={`news-intake-dynamic-${field.fieldKey}`}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => updateDynamicAnswer(field, event.target.value)}
          >
            {field.options.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                label={
                  (isBn ? option.labelBn || option.labelEn : option.labelEn || option.labelBn) ||
                  option.value
                }
              />
            ))}
          </RadioGroup>
        </fieldset>
      );
    }

    const inputType =
      field.fieldType === 'currency' || field.fieldType === 'number'
        ? 'number'
        : field.fieldType === 'phone'
          ? 'tel'
          : field.fieldType;

    return (
      <Input
        key={key}
        type={inputType}
        label={label}
        helperText={helperText}
        minLength={
          field.validation?.minLength !== undefined
            ? Number(field.validation.minLength)
            : undefined
        }
        maxLength={
          field.validation?.maxLength !== undefined
            ? Number(field.validation.maxLength)
            : undefined
        }
        min={
          field.validation?.min !== undefined
            ? field.fieldType === 'number' || field.fieldType === 'currency'
              ? Number(field.validation.min)
              : String(field.validation.min)
            : undefined
        }
        max={
          field.validation?.max !== undefined
            ? field.fieldType === 'number' || field.fieldType === 'currency'
              ? Number(field.validation.max)
              : String(field.validation.max)
            : undefined
        }
        value={
          typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : ''
        }
        onChange={(event) =>
          updateDynamicAnswer(
            field,
            field.fieldType === 'number' || field.fieldType === 'currency'
              ? event.target.value
              : event.target.value
          )
        }
      />
    );
  };

  const exactDuplicates = preview?.duplicate.exactSourceDuplicates || [];
  const candidates = preview?.duplicate.candidates || [];

  return (
    <div className="space-y-6 pb-10 max-sm:[&_[data-button-size=sm]]:min-h-11">


      <FeedbackNotice tone="info" title={isBn ? 'নিরাপদ প্রকাশ নীতি' : 'Safe publishing policy'}>
        <p>
          {isBn
            ? 'আর্টিকেল থেকে শুধু উৎসের মেটাডাটা আনা হয়। ক্যাটাগরি, স্থান, ঘটনার তারিখ, অভিযোগের ভাষা বা অন্য কোনো তথ্য স্বয়ংক্রিয়ভাবে বানানো হয় না। প্রতিটি নতুন রিপোর্ট প্রকাশের আগে ডুপ্লিকেট ইঞ্জিন আবার যাচাই করে।'
            : 'Only source metadata is fetched from the article. Category, location, incident date, allegations, and other report facts are never invented automatically. Every new report is checked again by the duplicate engine at publication time.'}
        </p>
      </FeedbackNotice>

      {error && (
        <FeedbackNotice
          tone="error"
          title={isBn ? 'কাজটি সম্পন্ন হয়নি' : 'Action could not be completed'}
          onDismiss={() => setError(null)}
        >
          <p>{error}</p>
          {createdReportId && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => navigate(`/complaints/${encodeURIComponent(createdReportId)}`)}
              leftIcon={<ExternalLink />}
            >
              <span>{isBn ? 'তৈরি হওয়া Draft খুলুন' : 'Open Created Draft'}</span>
            </Button>
          )}
        </FeedbackNotice>
      )}

      {success && (
        <FeedbackNotice tone="success" onDismiss={() => setSuccess(null)}>
          <p>{success}</p>
        </FeedbackNotice>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isBn ? '১. সংবাদ উৎস' : '1. News source'}</CardTitle>
          <CardDescription>
            {isBn
              ? 'শুধু অনুমোদিত ডোমেইনের ফাইনাল আর্টিকেল URL ব্যবহার করুন।'
              : 'Use the final article URL from an approved source domain.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Input
              id="news-intake-source-url"
              type="url"
              label={isBn ? 'ক্যানোনিক্যাল উৎস URL *' : 'Canonical source URL *'}
              value={source.canonicalUrl}
              onChange={(event) => updateSource({ canonicalUrl: event.target.value })}
              placeholder="https://example.com/article/..."
            />
            <Button
              variant="secondary"
              size="md"
              onClick={handleFetchMetadata}
              isLoading={fetchingSource}
              disabled={fetchingSource}
              leftIcon={<Newspaper />}
            >
              <span>{isBn ? 'মেটাডাটা আনুন' : 'Fetch Metadata'}</span>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={isBn ? 'প্রকাশক *' : 'Publisher *'}
              value={source.publisherName}
              onChange={(event) => updateSource({ publisherName: event.target.value })}
            />
            <Select
              label={isBn ? 'উৎসের ধরন' : 'Source type'}
              value={source.sourceType}
              onChange={(event) =>
                updateSource({
                  sourceType: event.target.value as NewsIntakeSource['sourceType'],
                })
              }
              options={[
                { value: 'news', label: isBn ? 'সংবাদ' : 'News' },
                { value: 'official', label: isBn ? 'অফিসিয়াল' : 'Official' },
                { value: 'social', label: isBn ? 'সামাজিক মাধ্যম' : 'Social' },
                { value: 'article', label: isBn ? 'আর্টিকেল' : 'Article' },
                { value: 'other', label: isBn ? 'অন্যান্য' : 'Other' },
              ]}
            />
          </div>

          <Input
            label={isBn ? 'উৎস প্রতিবেদনের শিরোনাম *' : 'Source article title *'}
            value={source.sourceTitle}
            onChange={(event) => updateSource({ sourceTitle: event.target.value })}
          />

          <Input
            type="date"
            label={isBn ? 'উৎস প্রকাশের তারিখ' : 'Source publication date'}
            value={source.sourcePublishedDate}
            onChange={(event) =>
              updateSource({ sourcePublishedDate: event.target.value })
            }
          />

          {metadataPreview && (
            <FeedbackNotice tone="neutral" compact title={isBn ? 'উৎসের মেটা বর্ণনা' : 'Source meta description'}>
              <p>{metadataPreview}</p>
            </FeedbackNotice>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isBn ? '২. রিপোর্টের তথ্য' : '2. Report details'}</CardTitle>
          <CardDescription>
            {isBn
              ? 'শুধু উৎসে সমর্থিত তথ্য লিখুন। কোনো অনুমান বা নতুন দাবি যোগ করবেন না।'
              : 'Enter only facts supported by the source. Do not add assumptions or new allegations.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label={isBn ? 'ক্যাটাগরি *' : 'Category *'}
              value={report.segmentId}
              disabled={loadingTaxonomy}
              onChange={(event) =>
                updateReport({
                  segmentId: event.target.value,
                  subcategoryId: '',
                })
              }
              options={[
                { value: '', label: isBn ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select category', disabled: true },
                ...taxonomy.segments.map((item) => ({
                  value: item.id,
                  label: isBn ? item.nameBn : item.nameEn,
                })),
              ]}
            />
            <Select
              label={isBn ? 'সাবক্যাটাগরি *' : 'Subcategory *'}
              value={report.subcategoryId}
              disabled={!report.segmentId || loadingTaxonomy}
              onChange={(event) =>
                updateReport({ subcategoryId: event.target.value })
              }
              options={[
                { value: '', label: isBn ? 'সাবক্যাটাগরি নির্বাচন করুন' : 'Select subcategory', disabled: true },
                ...availableSubcategories.map((item) => ({
                  value: item.id,
                  label: isBn ? item.nameBn : item.nameEn,
                })),
              ]}
            />
          </div>

          {requiresPrivacyReview && (
            <FeedbackNotice tone="warning" compact>
              <div className="space-y-3">
                <p>
                  {isBn
                    ? 'এটি সংবেদনশীল রিপোর্টিং বিভাগ। উৎসে নেই এমন পরিচয়, সম্পর্ক বা অভিযোগ যোগ করবেন না। প্রকাশের আগে এমন পরিচয়ও সরান যা অপ্রয়োজনে ভুক্তভোগী বা শিশুকে শনাক্ত করতে পারে।'
                    : 'This is a sensitive reporting category. Do not add identities, relationships, or allegations that are not present in the source. Before publishing, remove identifying detail that could unnecessarily identify a victim or child.'}
                </p>
                <Checkbox
                  id="news-intake-sensitive-content-reviewed"
                  aria-label={
                    isBn
                      ? 'আমি পাবলিক শিরোনাম, সারাংশ, অবস্থান ও পরিচয়সংক্রান্ত তথ্য রিভিউ করেছি'
                      : 'I reviewed the public title, summary, location, and identifying details'
                  }
                  checked={report.customFieldAnswers?.sensitiveContentReviewed === true}
                  onChange={(event) =>
                    updateReport({
                      customFieldAnswers: {
                        ...report.customFieldAnswers,
                        sensitiveContentReviewed: event.target.checked,
                      },
                    })
                  }
                  label={
                    isBn
                      ? 'আমি পাবলিক শিরোনাম, সারাংশ, অবস্থান ও পরিচয়সংক্রান্ত তথ্য রিভিউ করেছি'
                      : 'I reviewed the public title, summary, location, and identifying details'
                  }
                  description={
                    isBn
                      ? 'এই নিশ্চিতকরণ ছাড়া সংবেদনশীল sourced report তৈরি বা প্রকাশ করা যাবে না।'
                      : 'Privacy-sensitive sourced reports cannot be created or published without this confirmation.'
                  }
                />
              </div>
            </FeedbackNotice>
          )}

          <FeedbackNotice tone="neutral" compact>
            <p>
              {isBn
                ? 'শিরোনাম ও ঘটনার প্রেক্ষাপট উৎস সংবাদ যে ভাষায় লেখা, সেই ভাষাতেই লিখুন। আলাদা অনুবাদ প্রয়োজন নেই।'
                : 'Write the title and incident context in the language used by the source article. Do not create a second translated version.'}
            </p>
          </FeedbackNotice>

          <Input
            label={isBn ? 'রিপোর্ট শিরোনাম (উৎসের ভাষা) *' : 'Report title (source language) *'}
            maxLength={100}
            value={report.titleBn}
            onChange={(event) =>
              updateReport({ titleBn: event.target.value, titleEn: '' })
            }
          />

          <Textarea
            label={isBn ? 'ঘটনার প্রেক্ষাপট (উৎসের ভাষা) *' : 'Incident context (source language) *'}
            rows={6}
            maxLength={2000}
            value={report.descriptionBn}
            onChange={(event) =>
              updateReport({ descriptionBn: event.target.value, descriptionEn: '' })
            }
          />

          <div className="grid gap-3 md:grid-cols-4">
            <Input
              type="date"
              label={isBn ? 'ঘটনার তারিখ *' : 'Incident date *'}
              value={report.incidentDate}
              onChange={(event) =>
                updateReport({ incidentDate: event.target.value })
              }
            />
            <Input
              type="time"
              label={isBn ? 'ঘটনার সময়' : 'Incident time'}
              value={report.incidentTime}
              onChange={(event) =>
                updateReport({ incidentTime: event.target.value })
              }
            />
            <Select
              label={isBn ? 'ঘটনার পুনরাবৃত্তি' : 'Frequency'}
              value={report.frequency}
              onChange={(event) =>
                updateReport({
                  frequency: event.target.value as NewsIntakeReport['frequency'],
                })
              }
              options={[
                { value: 'one-time', label: isBn ? 'একবার' : 'One-time' },
                { value: 'repeated', label: isBn ? 'বারবার' : 'Repeated' },
                { value: 'ongoing', label: isBn ? 'চলমান' : 'Ongoing' },
                { value: 'unknown_not_stated', label: isBn ? 'জানা নেই / উল্লেখ নেই' : 'Unknown / not stated' },
              ]}
            />
            <Select
              label={isBn ? 'অগ্রাধিকার' : 'Priority'}
              value={report.priority}
              onChange={(event) =>
                updateReport({
                  priority: event.target.value as NewsIntakeReport['priority'],
                })
              }
              options={[
                { value: 'low', label: isBn ? 'কম' : 'Low' },
                { value: 'medium', label: isBn ? 'মাঝারি' : 'Medium' },
                { value: 'high', label: isBn ? 'উচ্চ' : 'High' },
                { value: 'urgent', label: isBn ? 'জরুরি' : 'Urgent' },
              ]}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Select
              label={isBn ? 'বিভাগ *' : 'Division *'}
              value={selectedDivision?.nameEn || ''}
              onChange={(event) => {
                const division = locationTaxonomy.divisions.find(
                  (item) => item.nameEn === event.target.value
                );
                updateReport({
                  division: division?.nameEn || '',
                  district: '',
                  upazilaOrThana: '',
                });
              }}
              options={[
                { value: '', label: isBn ? 'বিভাগ নির্বাচন করুন' : 'Select division', disabled: true },
                ...locationTaxonomy.divisions.map((item) => ({
                  value: item.nameEn,
                  label: isBn ? item.nameBn : item.nameEn,
                })),
              ]}
            />
            <Select
              label={isBn ? 'জেলা *' : 'District *'}
              value={selectedDistrict?.nameEn || ''}
              onChange={(event) => {
                const district = availableDistricts.find(
                  (item) => item.nameEn === event.target.value
                );
                updateReport({
                  district: district?.nameEn || '',
                  upazilaOrThana: '',
                });
              }}
              options={[
                { value: '', label: isBn ? 'জেলা নির্বাচন করুন' : 'Select district', disabled: true },
                ...availableDistricts.map((item) => ({
                  value: item.nameEn,
                  label: isBn ? item.nameBn : item.nameEn,
                })),
              ]}
            />
            <Select
              label={isBn ? 'উপজেলা / থানা' : 'Upazila / Thana'}
              value={report.upazilaOrThana}
              onChange={(event) => updateReport({ upazilaOrThana: event.target.value })}
              options={[
                { value: '', label: isBn ? 'প্রযোজ্য হলে নির্বাচন করুন' : 'Select when applicable' },
                ...availableUpazilas.map((item) => ({
                  value: item.nameEn,
                  label: isBn ? item.nameBn : item.nameEn,
                })),
              ]}
            />
            <Select
              label={isBn ? 'লোকেশন স্কোপ *' : 'Location scope *'}
              value={String(report.customFieldAnswers?.locationScope || 'specific')}
              onChange={(event) =>
                updateReport({
                  customFieldAnswers: {
                    ...report.customFieldAnswers,
                    locationScope: event.target.value,
                  },
                })
              }
              options={[
                { value: 'specific', label: isBn ? 'নির্দিষ্ট স্থান' : 'Specific location' },
                { value: 'district_wide', label: isBn ? 'জেলা-ব্যাপী' : 'District-wide' },
              ]}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              label={isBn ? 'এলাকা' : 'Area'}
              value={report.area}
              onChange={(event) => updateReport({ area: event.target.value })}
            />
            <Input
              label={isBn ? 'রাস্তা' : 'Road'}
              value={report.road}
              onChange={(event) => updateReport({ road: event.target.value })}
            />
            <Input
              label={isBn ? 'ল্যান্ডমার্ক' : 'Landmark'}
              value={report.landmark}
              onChange={(event) => updateReport({ landmark: event.target.value })}
            />
            <Input
              label={isBn ? 'উৎসে থাকা পূর্ণ ঠিকানা' : 'Source-backed full address'}
              value={report.formattedAddress}
              onChange={(event) =>
                updateReport({ formattedAddress: event.target.value })
              }
            />
          </div>



          {report.segmentId === 'harassment' && (
            <section className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div>
                <h3 className="type-card-title">{isBn ? 'হয়রানি / নির্যাতন তথ্য' : 'Harassment / abuse context'}</h3>
                <p className="mt-1 type-helper text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'বর্তমান রিপোর্টিং কাঠামোর আবশ্যক শ্রেণিবিন্যাস।'
                    : 'Required classification used by the current reporting contract.'}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select
                  label={isBn ? 'প্রভাবিত ব্যক্তির বয়সের গ্রুপ *' : 'Affected person age group *'}
                  value={report.affectedPersonAgeGroup}
                  onChange={(event) =>
                    updateReport({ affectedPersonAgeGroup: event.target.value })
                  }
                  options={[
                    { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                    ...optionList(AGE_OPTIONS, isBn),
                  ]}
                />
                <Select
                  label={isBn ? 'অভিযুক্ত ব্যক্তির সঙ্গে সম্পর্ক *' : 'Relationship to alleged abuser *'}
                  value={report.allegedAbuserRelationship}
                  onChange={(event) =>
                    updateReport({ allegedAbuserRelationship: event.target.value })
                  }
                  options={[
                    { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                    ...optionList(RELATIONSHIP_OPTIONS, isBn),
                  ]}
                />
                <Select
                  label={isBn ? 'কার পক্ষে রিপোর্ট *' : 'Reporting for *'}
                  value={report.reportingFor}
                  onChange={(event) =>
                    updateReport({ reportingFor: event.target.value })
                  }
                  options={[
                    { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                    ...optionList(REPORTING_FOR_OPTIONS, isBn),
                  ]}
                />
              </div>

              <Input
                label={isBn ? 'সম্পর্কের অতিরিক্ত প্রেক্ষাপট' : 'Additional relationship context'}
                value={report.relationshipContext}
                onChange={(event) =>
                  updateReport({ relationshipContext: event.target.value })
                }
              />

              {report.subcategoryId === 'sexual-harassment' && (
                <div className="grid gap-3 md:grid-cols-3">
                  <Select
                    label={isBn ? 'যৌন হয়রানির ধরন' : 'Sexual harassment type'}
                    value={report.sexualHarassmentType}
                    onChange={(event) =>
                      updateReport({ sexualHarassmentType: event.target.value })
                    }
                    options={[
                      { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                      ...optionList(SEXUAL_HARASSMENT_TYPE_OPTIONS, isBn),
                    ]}
                  />
                  <Select
                    label={isBn ? 'ঘটনার পরিবেশ / স্থান' : 'Incident context'}
                    value={report.sexualHarassmentContext}
                    onChange={(event) =>
                      updateReport({ sexualHarassmentContext: event.target.value })
                    }
                    options={[
                      { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                      ...optionList(SEXUAL_CONTEXT_OPTIONS, isBn),
                    ]}
                  />
                  <Input
                    label={isBn ? 'প্রতিষ্ঠান' : 'Institution'}
                    value={report.sexualHarassmentInstitution}
                    onChange={(event) =>
                      updateReport({ sexualHarassmentInstitution: event.target.value })
                    }
                  />
                </div>
              )}

              {report.subcategoryId === 'blackmail-coercion' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <Select
                    label={isBn ? 'কি ঘটেছে' : 'What happened'}
                    value={report.intimateWhatHappened}
                    onChange={(event) =>
                      updateReport({ intimateWhatHappened: event.target.value })
                    }
                    options={[
                      { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                      { value: 'threatened', label: isBn ? 'হুমকি দেওয়া হয়েছে' : 'Threatened' },
                      { value: 'already_shared', label: isBn ? 'ইতিমধ্যে শেয়ার করা হয়েছে' : 'Already shared' },
                      { value: 'recorded_secretly', label: isBn ? 'গোপনে ধারণ করা হয়েছে' : 'Recorded secretly' },
                      { value: 'manipulated_deepfake', label: isBn ? 'পরিবর্তিত / ডিপফেক' : 'Manipulated / deepfake' },
                      { value: 'other', label: isBn ? 'অন্যান্য' : 'Other' },
                    ]}
                  />
                  <Select
                    label={isBn ? 'প্ল্যাটফর্ম / মাধ্যম' : 'Platform / channel'}
                    value={report.intimatePlatform}
                    onChange={(event) =>
                      updateReport({ intimatePlatform: event.target.value })
                    }
                    options={[
                      { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                      { value: 'facebook', label: 'Facebook' },
                      { value: 'messenger', label: 'Messenger' },
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'telegram', label: 'Telegram' },
                      { value: 'dating_app', label: isBn ? 'ডেটিং অ্যাপ' : 'Dating app' },
                      { value: 'website', label: isBn ? 'ওয়েবসাইট' : 'Website' },
                      { value: 'in_person', label: isBn ? 'সরাসরি' : 'In person' },
                      { value: 'other', label: isBn ? 'অন্যান্য' : 'Other' },
                    ]}
                  />
                </div>
              )}
            </section>
          )}

          {report.subcategoryId === 'bribe-demanded-service' && (
            <section className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="type-card-title">{isBn ? 'ঘুষের প্রেক্ষাপট' : 'Bribery context'}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label={isBn ? 'বিভাগ / অফিস *' : 'Department / office *'}
                  value={report.briberyDepartment}
                  onChange={(event) =>
                    updateReport({ briberyDepartment: event.target.value })
                  }
                />
                <Input
                  label={isBn ? 'সেবা *' : 'Service *'}
                  value={report.briberyService}
                  onChange={(event) =>
                    updateReport({ briberyService: event.target.value })
                  }
                />
                <Input
                  type="number"
                  min="0"
                  label={isBn ? 'টাকার পরিমাণ' : 'Amount'}
                  value={report.briberyAmount}
                  onChange={(event) =>
                    updateReport({ briberyAmount: event.target.value })
                  }
                />
              </div>
            </section>
          )}

          {report.segmentId === 'load_shedding' && (
            <section className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="type-card-title">{isBn ? 'ইউটিলিটি তথ্য' : 'Utility details'}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  type="time"
                  label={isBn ? 'সেবা পুনরায় চালুর সময়' : 'Service restoration time'}
                  value={report.utilityEndTime}
                  onChange={(event) =>
                    updateReport({ utilityEndTime: event.target.value })
                  }
                />
                <Input
                  type="month"
                  label={isBn ? 'সাম্প্রতিক বিলের মাস' : 'Recent bill month'}
                  value={report.recentBillMonth}
                  onChange={(event) =>
                    updateReport({ recentBillMonth: event.target.value })
                  }
                />
                <Input
                  type="number"
                  min="0"
                  label={isBn ? 'সাম্প্রতিক বিলের পরিমাণ' : 'Recent bill amount'}
                  value={report.recentBillAmount}
                  onChange={(event) =>
                    updateReport({ recentBillAmount: event.target.value })
                  }
                />
                <Input
                  type="month"
                  label={isBn ? 'পূর্বের বিলের মাস' : 'Previous bill month'}
                  value={report.previousBillMonth}
                  onChange={(event) =>
                    updateReport({ previousBillMonth: event.target.value })
                  }
                />
                <Input
                  type="number"
                  min="0"
                  label={isBn ? 'পূর্বের বিলের পরিমাণ' : 'Previous bill amount'}
                  value={report.previousBillAmount}
                  onChange={(event) =>
                    updateReport({ previousBillAmount: event.target.value })
                  }
                />
              </div>
            </section>
          )}

          {report.subcategoryId === 'mob-justice' && (
            <section className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="type-card-title">{isBn ? 'মব জাস্টিস তথ্য' : 'Mob-justice details'}</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Select
                  label={isBn ? 'কারণ / অভিযোগ *' : 'Trigger / allegation *'}
                  value={report.mobJusticeDetails?.trigger || ''}
                  onChange={(event) =>
                    updateReport({
                      mobJusticeDetails: {
                        trigger: event.target.value,
                        outcome: report.mobJusticeDetails?.outcome || '',
                        ongoingStatus:
                          report.mobJusticeDetails?.ongoingStatus || '',
                        spread: report.mobJusticeDetails?.spread || null,
                        targetedCount:
                          report.mobJusticeDetails?.targetedCount ?? null,
                      },
                    })
                  }
                  options={[
                    { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                    ...optionList(MOB_TRIGGER_OPTIONS, isBn),
                  ]}
                />
                <Select
                  label={isBn ? 'ফলাফল *' : 'Outcome *'}
                  value={report.mobJusticeDetails?.outcome || ''}
                  onChange={(event) =>
                    updateReport({
                      mobJusticeDetails: {
                        trigger: report.mobJusticeDetails?.trigger || '',
                        outcome: event.target.value,
                        ongoingStatus:
                          report.mobJusticeDetails?.ongoingStatus || '',
                        spread: report.mobJusticeDetails?.spread || null,
                        targetedCount:
                          report.mobJusticeDetails?.targetedCount ?? null,
                      },
                    })
                  }
                  options={[
                    { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                    ...optionList(MOB_OUTCOME_OPTIONS, isBn),
                  ]}
                />
                <Select
                  label={isBn ? 'চলমান অবস্থা *' : 'Ongoing status *'}
                  value={report.mobJusticeDetails?.ongoingStatus || ''}
                  onChange={(event) =>
                    updateReport({
                      mobJusticeDetails: {
                        trigger: report.mobJusticeDetails?.trigger || '',
                        outcome: report.mobJusticeDetails?.outcome || '',
                        ongoingStatus: event.target.value,
                        spread: report.mobJusticeDetails?.spread || null,
                        targetedCount:
                          report.mobJusticeDetails?.targetedCount ?? null,
                      },
                    })
                  }
                  options={[
                    { value: '', label: isBn ? 'নির্বাচন করুন' : 'Select', disabled: true },
                    { value: 'ongoing', label: isBn ? 'চলমান' : 'Ongoing' },
                    { value: 'ended', label: isBn ? 'শেষ হয়েছে' : 'Ended' },
                    { value: 'unknown', label: isBn ? 'জানা নেই' : 'Unknown' },
                  ]}
                />
                <Input
                  type="number"
                  min="1"
                  max="9999"
                  label={isBn ? 'লক্ষ্য ব্যক্তির সংখ্যা' : 'Targeted count'}
                  value={
                    report.mobJusticeDetails?.targetedCount === null ||
                    report.mobJusticeDetails?.targetedCount === undefined
                      ? ''
                      : String(report.mobJusticeDetails.targetedCount)
                  }
                  onChange={(event) =>
                    updateReport({
                      mobJusticeDetails: {
                        trigger: report.mobJusticeDetails?.trigger || '',
                        outcome: report.mobJusticeDetails?.outcome || '',
                        ongoingStatus:
                          report.mobJusticeDetails?.ongoingStatus || '',
                        spread: report.mobJusticeDetails?.spread || null,
                        targetedCount: event.target.value
                          ? Number(event.target.value)
                          : null,
                      },
                    })
                  }
                />
              </div>
            </section>
          )}

          {report.subcategoryId && publishedForm?.schema?.engineMode === 'schema' && (
            <section className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="type-card-title">
                    {isBn ? 'প্রকাশিত ফর্মের অতিরিক্ত তথ্য' : 'Published form fields'}
                  </h3>
                  <p className="mt-1 type-helper text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'পাবলিক রিপোর্ট ফর্মে বর্তমানে প্রকাশিত স্কিমার সাথে নিউজ ইনটেক সিঙ্ক করা হয়েছে।'
                      : 'News Intake is synced with the reporting schema currently published to the public form.'}
                  </p>
                </div>
                <Tag tone="info">
                  {isBn
                    ? `প্রকাশিত v${publishedForm.schema.version}`
                    : `Published v${publishedForm.schema.version}`}
                </Tag>
              </div>

              {unsupportedRequiredFields.length > 0 && (
                <FeedbackNotice
                  tone="warning"
                  title={isBn ? 'ম্যানুয়াল রিভিউ প্রয়োজন' : 'Standard workflow required'}
                >
                  <p>
                    {isBn
                      ? 'এই প্রকাশিত স্কিমায় এমন আবশ্যক সিস্টেম/কোর ফিল্ড আছে যা নিউজ ইনটেক অনুমান করে পূরণ করবে না। সাধারণ রিপোর্ট ফ্লো দিয়ে তথ্য যাচাই করে সম্পন্ন করুন।'
                      : 'This published schema contains required system/core fields that News Intake will not guess or map unsafely. Complete the report through the standard workflow.'}
                  </p>
                  <p className="mt-1 type-helper">
                    {unsupportedRequiredFields
                      .map((field) =>
                        isBn
                          ? field.labelBn || field.labelEn || field.fieldKey
                          : field.labelEn || field.labelBn || field.fieldKey
                      )
                      .join(', ')}
                  </p>
                </FeedbackNotice>
              )}

              {dynamicCustomFields.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {dynamicCustomFields.map(renderDynamicField)}
                </div>
              )}

              {dynamicCustomFields.length === 0 && unsupportedRequiredFields.length === 0 && (
                <p className="type-helper text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'এই স্কিমার সব প্রয়োজনীয় ফিল্ড উপরের বিদ্যমান নিউজ ইনটেক কন্ট্রোল দিয়েই পূরণ হচ্ছে।'
                    : 'All required fields in this schema are already covered by the existing News Intake controls above.'}
                </p>
              )}
            </section>
          )}

          {loadingPublishedForm && report.subcategoryId && (
            <FeedbackNotice tone="neutral" compact>
              <p>{isBn ? 'প্রকাশিত ফর্ম যাচাই করা হচ্ছে…' : 'Checking the published form contract…'}</p>
            </FeedbackNotice>
          )}

          {publishedFormError && report.subcategoryId && (
            <FeedbackNotice tone="error" compact>
              <p>
                {isBn
                  ? 'প্রকাশিত ফর্ম কনফিগারেশন যাচাই করা যায়নি। নিরাপত্তার জন্য Draft/Publish বন্ধ থাকবে যতক্ষণ না এটি আবার লোড হয়।'
                  : 'The published form configuration could not be verified. Draft/publish stays blocked until it can be loaded safely.'}
              </p>
            </FeedbackNotice>
          )}
        </CardContent>
      </Card>

      <Card variant="highlighted">
        <CardHeader>
          <CardTitle>{isBn ? '৩. উৎস ও ডুপ্লিকেট যাচাই' : '3. Source & duplicate check'}</CardTitle>
          <CardDescription>
            {isBn
              ? 'কোনো ডাটাবেস পরিবর্তন ছাড়াই প্রথমে যাচাই করুন।'
              : 'Run this check before any database record is created.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="primary"
            size="md"
            onClick={handlePreview}
            isLoading={checking}
            disabled={checking || creating || mergingId !== null}
            leftIcon={<SearchCheck />}
          >
            <span>{isBn ? 'উৎস ও ডুপ্লিকেট যাচাই করুন' : 'Check Source & Duplicates'}</span>
          </Button>

          {preview && (
            <div className="space-y-3">
              <FeedbackNotice
                tone={
                  preview.duplicate.status === 'clear'
                    ? 'success'
                    : preview.duplicate.status === 'review'
                      ? 'warning'
                      : 'error'
                }
                title={
                  preview.duplicate.status === 'clear'
                    ? isBn
                      ? 'নতুন ঘটনা হিসেবে পরিষ্কার'
                      : 'Clear as a new incident'
                    : preview.duplicate.status === 'exact'
                      ? isBn
                        ? 'একই উৎস ইতিমধ্যে আছে'
                        : 'Exact source already exists'
                      : preview.duplicate.status === 'match'
                        ? isBn
                          ? 'সম্ভবত একই ঘটনা'
                          : 'Likely same incident'
                        : isBn
                          ? 'মানব রিভিউ প্রয়োজন'
                          : 'Human review required'
                }
              >
                <p>
                  {preview.canPublishImmediately
                    ? isBn
                      ? 'এখন এক ক্লিকে Draft তৈরি করে বর্তমান প্রকাশনা ফ্লো দিয়ে প্রকাশ করা যাবে।'
                      : 'You can now create the draft and publish it through the current publication flow in one action.'
                    : isBn
                      ? 'একই ঘটনা হলে নতুন পোস্ট না করে উৎসটি বিদ্যমান রিপোর্টে মার্জ করুন। আলাদা ঘটনা হলে Draft তৈরি করে রিপোর্ট ডিটেইলে ডুপ্লিকেট রিভিউ শেষ করুন।'
                      : 'If it is the same incident, merge this source into the existing report instead of creating another post. If it is separate, create a draft and complete duplicate review on the report detail page.'}
                </p>
              </FeedbackNotice>

              {exactDuplicates.map((item) => (
                <Card key={`exact-${item.complaintId}`} padding="sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Tag tone="danger">{isBn ? 'একই উৎস' : 'Exact source'}</Tag>
                      <p className="mt-2 type-secondary font-semibold text-slate-900 dark:text-slate-100">
                        {item.titleBn || item.titleEn || item.complaintId}
                      </p>
                      <p className="mt-1 type-helper text-slate-500 dark:text-slate-400">
                        {item.complaintId}
                        {item.publisherName ? ` · ${item.publisherName}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/complaints/${encodeURIComponent(item.complaintId)}`)}
                      leftIcon={<ExternalLink />}
                    >
                      <span>{isBn ? 'বিদ্যমান রিপোর্ট খুলুন' : 'Open Existing Report'}</span>
                    </Button>
                  </div>
                </Card>
              ))}

              {candidates.map((candidate) => (
                <Card key={candidate.complaintId} padding="sm">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Tag tone={candidate.matchLevel === 'match' ? 'danger' : 'warning'}>
                          {candidate.matchLevel === 'match'
                            ? isBn
                              ? 'শক্ত মিল'
                              : 'Likely Match'
                            : isBn
                              ? 'রিভিউ'
                              : 'Review'}
                        </Tag>
                        <p className="mt-2 type-secondary font-semibold text-slate-900 dark:text-slate-100">
                          {(isBn
                            ? candidate.titleBn || candidate.titleEn
                            : candidate.titleEn || candidate.titleBn) ||
                            candidate.complaintId}
                        </p>
                        <p className="mt-1 type-helper text-slate-500 dark:text-slate-400">
                          {candidate.complaintId}
                          {candidate.incidentDate ? ` · ${candidate.incidentDate}` : ''}
                          {candidate.area || candidate.upazilaOrThana || candidate.district
                            ? ` · ${[candidate.area, candidate.upazilaOrThana, candidate.district]
                                .filter(Boolean)
                                .join(', ')}`
                            : ''}
                        </p>
                      </div>
                      <Tag tone="neutral" mono>
                        {isBn ? `স্কোর ${candidate.score}` : `Score ${candidate.score}`}
                      </Tag>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/complaints/${encodeURIComponent(candidate.complaintId)}`)}
                        leftIcon={<ExternalLink />}
                      >
                        <span>{isBn ? 'রিপোর্ট খুলুন' : 'Open Report'}</span>
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleMerge(candidate.complaintId)}
                        isLoading={mergingId === candidate.complaintId}
                        disabled={mergingId !== null || creating}
                        leftIcon={<Link2 />}
                      >
                        <span>{isBn ? 'এই রিপোর্টে উৎস মার্জ করুন' : 'Merge Source Here'}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                {preview.canCreateDraft && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => void handleCreateDraft(false)}
                    isLoading={creating && !publishing}
                    disabled={creating || mergingId !== null}
                    leftIcon={<FilePlus2 />}
                  >
                    <span>
                      {preview.canPublishImmediately
                        ? isBn
                          ? 'শুধু Draft তৈরি করুন'
                          : 'Create Draft Only'
                        : isBn
                          ? 'রিভিউয়ের জন্য Draft তৈরি করুন'
                          : 'Create Draft for Review'}
                    </span>
                  </Button>
                )}

                {preview.canPublishImmediately && (
                  <Button
                    variant="success"
                    size="md"
                    onClick={() => void handleCreateDraft(true)}
                    isLoading={creating && publishing}
                    disabled={creating || mergingId !== null}
                    leftIcon={<Send />}
                  >
                    <span>{isBn ? 'তৈরি করে প্রকাশ করুন' : 'Create & Publish'}</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <FeedbackNotice tone="neutral" compact>
        <div className="flex items-start gap-2">
          <RefreshCw />
          <p>
            {isBn
              ? 'কোনো ইনপুট পরিবর্তন করলে আগের ডুপ্লিকেট ফলাফল বাতিল হয়। প্রকাশের আগে সার্ভার আবার বর্তমান ডাটা দিয়ে যাচাই করে।'
              : 'Changing any input invalidates the previous duplicate result. The server rechecks current data again before publication.'}
          </p>
        </div>
      </FeedbackNotice>

      <Modal
        isOpen={Boolean(pendingMergeId)}
        onClose={() => setPendingMergeId(null)}
        size="sm"
        title={isBn ? 'উৎস মার্জ নিশ্চিত করুন' : 'Confirm source merge'}
        description={
          isBn
            ? 'এটি বিদ্যমান রিপোর্টের যাচাইকৃত উৎস ইতিহাস পরিবর্তন করবে।'
            : 'This changes the verified source history of the existing report.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingMergeId(null)}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={() => void confirmMerge()}>
              {isBn ? 'উৎস মার্জ করুন' : 'Merge source'}
            </Button>
          </>
        }
      >
        <p>
          {isBn
            ? `যাচাইকৃত উৎসটি ${pendingMergeId || ''} রিপোর্টে মার্জ করবেন?`
            : `Merge this verified source into report ${pendingMergeId || ''}?`}
        </p>
      </Modal>
    </div>
  );
};

export default ManualNewsIntakeForm;
