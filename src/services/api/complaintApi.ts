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
import { getComplaintPublicEngagement } from './publicEngagementApi';
import { isSupabaseConfigured } from '@/lib/supabase';

export interface ComplaintDetailData {
  complaint: Complaint;
  timeline: ComplaintTimelineEvent[];
  timelineError?: string | null;
  evidenceError?: string | null;
  reporterLocation?: ReporterDeviceLocation | null;
  reporterLocationError?: string | null;
  reporterLocationPermissionDenied?: boolean;
}

function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase complaint service is not configured in this environment.');
  }
}

async function enrichComplaintDetail(complaint: Complaint): Promise<Complaint> {
  const shouldLoadMobJustice =
    complaint.categoryId === 'public_safety' && complaint.subcategoryId === 'mob-justice';

  const [canonicalLocation, mobJusticeDetails, publicEngagement] = await Promise.all([
    getComplaintIncidentLocation(complaint.id),
    shouldLoadMobJustice ? getComplaintMobJusticeDetails(complaint.id) : Promise.resolve(null),
    getComplaintPublicEngagement(complaint.id),
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
    viewCount: publicEngagement.viewCount,
    shareCount: publicEngagement.shareCount,
  };
}

export class ComplaintApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  async getSegments(): Promise<SupabaseSegment[]> {
    assertSupabaseConfigured();
    return await getTaxonomySegments();
  }

  async getLocations(): Promise<string[]> {
    assertSupabaseConfigured();
    return await getDistinctLocations();
  }

  async getComplaints(
    filters: Partial<ComplaintFilterState> = {},
    page = 1,
    pageSize = 6
  ): Promise<ComplaintListResponse> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.getComplaints(filters, page, pageSize);
  }

  async getComplaintStats(): Promise<ComplaintStatusTabCount[]> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.getComplaintStats();
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    assertSupabaseConfigured();
    const complaint = await supabaseComplaintService.getComplaintById(id);
    return complaint ? await enrichComplaintDetail(complaint) : null;
  }

  async getComplaintDetail(
    id: string,
    options?: { loadEvidence?: boolean; loadReporterLocation?: boolean }
  ): Promise<ComplaintDetailData | null> {
    assertSupabaseConfigured();
    const detail = await supabaseComplaintService.getComplaintDetail(id, options);
    if (!detail) return null;

    return {
      ...detail,
      complaint: await enrichComplaintDetail(detail.complaint),
    };
  }

  async getComplaintReporterLocation(id: string) {
    assertSupabaseConfigured();
    return await supabaseComplaintService.getComplaintReporterLocation(id);
  }

  async getComplaintTimeline(id: string): Promise<ComplaintTimelineEvent[]> {
    assertSupabaseConfigured();
    return await supabaseComplaintService.getComplaintTimeline(id);
  }

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
