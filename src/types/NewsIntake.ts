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
  schemaValidation: {
    ready: boolean;
    missingFields: Array<{
      fieldKey: string;
      storageKey: string;
      labelEn?: string | null;
      labelBn?: string | null;
    }>;
  };
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


export type NewsIntakeAutomationAction =
  | 'discovered'
  | 'skip_duplicate'
  | 'needs_review'
  | 'created_draft'
  | 'merged_source'
  | 'error';

export interface NewsIntakeAutomationSource {
  hostname: string;
  publisherName: string;
  homepageUrl: string;
  languageHint: 'auto' | 'bn' | 'en';
  priority: number;
  scanEnabled: boolean;
  automationNote?: string | null;
  lastScannedAt?: string | null;
}

export interface NewsIntakeAutomationItem {
  id: string;
  itemKind?: 'source' | 'article';
  publisherName: string;
  sourceHostname: string;
  canonicalUrl: string;
  sourceTitle?: string | null;
  sourcePublishedDate?: string | null;
  contentLanguage: 'bn' | 'en' | 'mixed' | 'unknown';
  segmentId?: string | null;
  subcategoryId?: string | null;
  confidence?: number | null;
  duplicateStatus?: 'clear' | 'exact' | 'match' | 'review' | 'unavailable' | null;
  action: NewsIntakeAutomationAction;
  reportId?: string | null;
  reason?: string | null;
}

export interface NewsIntakeAutomationRun {
  runId: string;
  triggerType: 'manual' | 'automatic';
  status: 'running' | 'completed' | 'partial' | 'failed';
  sourceCount: number;
  discoveredCount: number;
  classifiedCount: number;
  duplicateCount: number;
  createdCount: number;
  mergedCount: number;
  reviewCount: number;
  skippedCount: number;
  errorCount: number;
  startedAt: string;
  completedAt?: string | null;
  errorSummary?: string | null;
  items: NewsIntakeAutomationItem[];
}

export interface NewsIntakeAutomationConfig {
  enabled: boolean;
  intervalHours: 36;
  lastAutoDispatchedAt?: string | null;
  nextAutoDueAt?: string | null;
  running: boolean;
}

export interface NewsIntakeAutomationDashboard {
  sources: NewsIntakeAutomationSource[];
  runs: NewsIntakeAutomationRun[];
  automation: NewsIntakeAutomationConfig;
}

export interface NewsIntakeAutomationScanResult {
  runId: string;
  triggerType: 'manual' | 'automatic';
  alreadyRunning?: boolean;
  status: 'completed' | 'partial' | 'failed';
  sourceCount: number;
  discoveredCount: number;
  classifiedCount: number;
  duplicateCount: number;
  createdCount: number;
  mergedCount: number;
  reviewCount: number;
  skippedCount: number;
  errorCount: number;
  startedAt: string;
  completedAt?: string | null;
}
