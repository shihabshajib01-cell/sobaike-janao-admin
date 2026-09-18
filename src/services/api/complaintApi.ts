/**
 * Complaint API Service Layer
 * Direct integration with Supabase for real complaint management operations.
 * All environments fail closed when Supabase is not configured; no mock complaint data is returned.
 */

import { apiClient, ApiClient } from './apiClient';
import {
  Complaint,
  ComplaintFilterState,
  ComplaintListResponse,
  ComplaintStatusTabCount,
  ComplaintTimelineEvent,
  ReporterDeviceLocation,
  ComplaintConfiguredFields,
  ComplaintSource,
  WorkflowActionResult,
} from '@/types/Complaint';
import {
  supabaseComplaintService,
  getTaxonomySegments,
  getDistinctLocations,
  SupabaseSegment,
} from './supabaseComplaintService';
import { getComplaintIncidentLocation } from './complaintIncidentLocationApi';
import { getComplaintMobJusticeDetails } from './mobJusticeDetailsApi';
import { getComplaintHarassmentContext } from './harassmentContextApi';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface ComplaintDetailData {
  complaint: Complaint;
  timeline: ComplaintTimelineEvent[];
  timelineError?: string | null;
  evidenceError?: string | null;
  reporterLocation?: ReporterDeviceLocation | null;
  reporterLocationError?: string | null;
  reporterLocationPermissionDenied?: boolean;
  configuredFields?: ComplaintConfiguredFields;
  configuredFieldsError?: string | null;
}

function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase complaint service is not configured in this environment.');
  }
}

async function enrichComplaintDetail(complaint: Complaint): Promise<Complaint> {
  const shouldLoadMobJustice =
    complaint.categoryId === 'public_safety' && complaint.subcategoryId === 'mob-justice';
  const shouldLoadHarassmentContext = complaint.categoryId === 'harassment';

  const [canonicalLocation, mobJusticeDetails, harassmentContext] = await Promise.all([
    getComplaintIncidentLocation(complaint.id),
    shouldLoadMobJustice ? getComplaintMobJusticeDetails(complaint.id) : Promise.resolve(null),
    shouldLoadHarassmentContext
      ? getComplaintHarassmentContext(complaint.id)
      : Promise.resolve(null),
  ]);

  return {
    ...complaint,
    location: canonicalLocation
      ? {
          ...complaint.location,
          ...canonicalLocation,
        }
      : complaint.location,
    mobJusticeDetails: shouldLoadMobJustice ? mobJusticeDetails : null,
    relationshipContext:
      harassmentContext?.relationshipContext ?? complaint.relationshipContext ?? null,
    intimateWhatHappened:
      harassmentContext?.intimateWhatHappened ?? complaint.intimateWhatHappened ?? null,
    intimatePlatform:
      harassmentContext?.intimatePlatform ?? complaint.intimatePlatform ?? null,
  };
}

export class ComplaintApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get active taxonomy segments
   */
  async getSegments(): Promise<SupabaseSegment[]> {
    assertSupabaseConfigured();
    return await getTaxonomySegments();
  }

  /**
   * Get distinct locations
   */
  async getLocations(): Promise<string[]> {
    assertSupabaseConfigured();
    return await getDistinctLocations();
  }

  /**
   * Get paginated and filtered complaint list.
   * Zero rows return the real empty list; missing configuration never returns fixtures.
   */
  async getComplaints(
    filters: Partial<ComplaintFilterState> = {},
    page = 1,
    pageSize = 6
  ): Promise<ComplaintListResponse> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.getComplaints(filters, page, pageSize);
  }

  /**
   * Get counts for lifecycle status tabs
   */
  async getComplaintStats(): Promise<ComplaintStatusTabCount[]> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.getComplaintStats();
  }

  /**
   * Get single complaint by ID
   */
  async getComplaintById(id: string): Promise<Complaint | null> {
    assertSupabaseConfigured();
    const complaint = await supabaseComplaintService.getComplaintById(id);
    return complaint ? await enrichComplaintDetail(complaint) : null;
  }

  /**
   * Get complete complaint detail workspace package (complaint + timeline + evidence + reporter location)
   */
  async getComplaintDetail(
    id: string,
    options?: { loadEvidence?: boolean; loadReporterLocation?: boolean }
  ): Promise<ComplaintDetailData | null> {
    assertSupabaseConfigured();
    const detail = await supabaseComplaintService.getComplaintDetail(id, options);
    if (!detail) return null;

    let configuredFields: ComplaintConfiguredFields | undefined;
    let configuredFieldsError: string | null = null;

    try {
      configuredFields = await this.getComplaintConfiguredFields(id);
    } catch (error: any) {
      configuredFieldsError =
        error?.message || 'Failed to load configured complaint fields.';
    }

    return {
      ...detail,
      complaint: await enrichComplaintDetail(detail.complaint),
      configuredFields,
      configuredFieldsError,
    };
  }

  async getComplaintSources(id: string): Promise<ComplaintSource[]> {
    assertSupabaseConfigured();

    const { data, error } = await supabase.rpc(
      'admin_get_complaint_sources',
      { p_complaint_id: id }
    );

    if (error) {
      throw new Error(error.message || 'Failed to load complaint sources.');
    }

    if (!Array.isArray(data)) return [];

    return data.map((source: any) => ({
      id: String(source.id || ''),
      sourceType: String(source.sourceType || 'other') as ComplaintSource['sourceType'],
      publisherName: String(source.publisherName || ''),
      sourceTitle: source.sourceTitle ? String(source.sourceTitle) : null,
      canonicalUrl: String(source.canonicalUrl || ''),
      sourcePublishedDate: source.sourcePublishedDate
        ? String(source.sourcePublishedDate)
        : null,
      verificationStatus: String(
        source.verificationStatus || 'unverified'
      ) as ComplaintSource['verificationStatus'],
      isFinalDetailPage: Boolean(source.isFinalDetailPage),
      sourceVersion: Number(source.sourceVersion || 1),
      verificationNote: source.verificationNote
        ? String(source.verificationNote)
        : null,
      verifiedAt: source.verifiedAt ? String(source.verifiedAt) : null,
      createdAt: source.createdAt ? String(source.createdAt) : null,
      updatedAt: source.updatedAt ? String(source.updatedAt) : null,
    }));
  }

  async getComplaintConfiguredFields(id: string): Promise<ComplaintConfiguredFields> {
    assertSupabaseConfigured();

    const { data, error } = await supabase.rpc(
      'admin_get_complaint_configured_fields',
      { p_complaint_id: id }
    );

    if (error) {
      throw new Error(error.message || 'Failed to load configured complaint fields.');
    }

    const raw = (data || {}) as any;
    const fields = Array.isArray(raw.fields)
      ? raw.fields
          .map((field: any) => ({
            fieldKey: String(field.fieldKey || ''),
            labelEn: String(field.labelEn || field.fieldKey || ''),
            labelBn: String(field.labelBn || field.labelEn || field.fieldKey || ''),
            fieldType: String(field.fieldType || 'text'),
            storageMode: String(field.storageMode || ''),
            storageKey: String(field.storageKey || field.fieldKey || ''),
            sortOrder: Number(field.sortOrder || 0),
            options: Array.isArray(field.options)
              ? field.options.map((option: any) => ({
                  value: String(option?.value || ''),
                  labelEn: String(option?.labelEn || option?.value || ''),
                  labelBn: String(option?.labelBn || option?.labelEn || option?.value || ''),
                }))
              : [],
            config:
              field.config && typeof field.config === 'object'
                ? field.config
                : {},
            value: field.value,
          }))
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      : [];

    return {
      formSchemaVersion:
        raw.formSchemaVersion === null || raw.formSchemaVersion === undefined
          ? null
          : Number(raw.formSchemaVersion),
      answers:
        raw.answers && typeof raw.answers === 'object' ? raw.answers : {},
      fields,
    };
  }

  /**
   * Get private reporter device location from secure RPC
   */
  async getComplaintReporterLocation(id: string) {
    assertSupabaseConfigured();
    return await supabaseComplaintService.getComplaintReporterLocation(id);
  }

  /**
   * Get timeline for complaint
   */
  async getComplaintTimeline(id: string): Promise<ComplaintTimelineEvent[]> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.getComplaintTimeline(id);
  }

  /**
   * Workflow Action Methods
   */
  async editComplaint(
    complaintId: string,
    updates: Partial<Complaint>,
    notes?: string
  ): Promise<WorkflowActionResult> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.editComplaint(complaintId, updates, notes);
  }

  async rejectComplaint(
    complaintId: string,
    reason: string,
    explanation: string
  ): Promise<WorkflowActionResult> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.rejectComplaint(complaintId, reason, explanation);
  }

  async publishComplaint(complaintId: string): Promise<WorkflowActionResult> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.publishComplaint(complaintId);
  }

  async unpublishComplaint(complaintId: string): Promise<WorkflowActionResult> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.unpublishComplaint(complaintId);
  }

  async addComplaintUpdate(_complaintId: string, _message: string): Promise<WorkflowActionResult> {
    assertSupabaseConfigured();
    throw new Error('Complaint update messages must be added via authenticated database procedures.');
  }
}

export const complaintApi = new ComplaintApi();
export default complaintApi;
export { type WorkflowActionResult } from '@/types/Complaint';
