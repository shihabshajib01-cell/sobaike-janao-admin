import { ReportDuplicateCheckResult } from './Complaint';

export interface NewsIntakeSource {
  sourceType: 'news' | 'official' | 'social' | 'article' | 'other';
  publisherName: string;
  sourceTitle: string;
  canonicalUrl: string;
  sourcePublishedDate: string;
}

export interface NewsIntakeReport {
  segmentId: string;
  subcategoryId: string;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  incidentDate: string;
  incidentTime: string;
  utilityEndTime: string;
  frequency: 'one-time' | 'repeated' | 'ongoing' | 'unknown_not_stated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  division: string;
  district: string;
  upazilaOrThana: string;
  area: string;
  road: string;
  landmark: string;
  formattedAddress: string;
  relationshipContext: string;
  recentBillMonth: string;
  recentBillAmount: string;
  previousBillMonth: string;
  previousBillAmount: string;
  briberyDepartment: string;
  briberyService: string;
  briberyAmount: string;
  affectedPersonAgeGroup: string;
  allegedAbuserRelationship: string;
  reportingFor: string;
  sexualHarassmentType: string;
  sexualHarassmentContext: string;
  sexualHarassmentInstitution: string;
  intimateWhatHappened: string;
  intimatePlatform: string;
  mobJusticeDetails?: {
    trigger: string;
    spread?: string | null;
    outcome: string;
    targetedCount?: number | null;
    ongoingStatus: string;
  } | null;
  customFieldAnswers: Record<string, unknown>;
}

export interface NewsIntakePayload {
  source: NewsIntakeSource;
  report: NewsIntakeReport;
}

export interface NewsSourceMetadata extends NewsIntakeSource {
  descriptionPreview?: string;
  hostname: string;
  approved: boolean;
}

export interface NewsIntakeTaxonomySegment {
  id: string;
  nameEn: string;
  nameBn: string;
  order: number;
}

export interface NewsIntakeTaxonomySubcategory {
  id: string;
  segmentId: string;
  nameEn: string;
  nameBn: string;
  order: number;
  isSensitive: boolean;
}

export interface NewsIntakeTaxonomy {
  segments: NewsIntakeTaxonomySegment[];
  subcategories: NewsIntakeTaxonomySubcategory[];
}

export interface NewsIntakePreview {
  sourceDomain: {
    approved: boolean;
    hostname: string;
    publisherName?: string | null;
  };
  duplicate: ReportDuplicateCheckResult;
  canCreateDraft: boolean;
  canPublishImmediately: boolean;
}

export interface NewsIntakeCreateResult {
  success: boolean;
  reportId: string;
  status: 'submitted';
  duplicate: ReportDuplicateCheckResult;
  canPublishImmediately: boolean;
}

export interface NewsIntakeMergeResult {
  success: boolean;
  reportId: string;
  sourceId: string;
  status: string;
}
