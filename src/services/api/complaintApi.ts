/**
 * Complaint API Service Layer
 * Direct integration with Supabase for real complaint management operations.
 * When Supabase is configured, all read operations query real Supabase tables.
 * If Supabase queries fail, real errors are thrown instead of hiding behind mock fallbacks.
 */

import { apiClient, ApiClient } from './apiClient';
import {
  Complaint,
  ComplaintFilterState,
  ComplaintListResponse,
  ComplaintStatusTabCount,
  ComplaintTimelineEvent,
  ReporterDeviceLocation,
} from '@/types/Complaint';
import { complaintFallback, WorkflowActionResult } from '@/services/fallback/complaintFallback';
import {
  supabaseComplaintService,
  getTaxonomySegments,
  getDistinctLocations,
  SupabaseSegment,
} from './supabaseComplaintService';
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

const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

export class ComplaintApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get active taxonomy segments
   */
  async getSegments(): Promise<SupabaseSegment[]> {
    if (isSupabaseConfigured) {
      return await getTaxonomySegments();
    }
    if (isDev) {
      return [
        { id: 'harassment', name_en: 'Harassment & Abuse', name_bn: 'হয়রানি ও নির্যাতন', active: true },
        { id: 'rickshaw', name_en: 'Illegal Auto-Rickshaw Charging', name_bn: 'অবৈধ অটো চার্জিং', active: true },
        { id: 'extortion', name_en: 'Extortion', name_bn: 'চাঁদাবাজি', active: true },
        { id: 'load_shedding', name_en: 'Utility Service Complaints', name_bn: 'ইউটিলিটি সেবা অভিযোগ', active: true },
      ];
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  /**
   * Get distinct locations
   */
  async getLocations(): Promise<string[]> {
    if (isSupabaseConfigured) {
      return await getDistinctLocations();
    }
    if (isDev) {
      return [
        'Dhaka',
        'Chattogram',
        'Gazipur',
        'Narayanganj',
        'Sylhet',
        'Rajshahi',
        'Khulna',
        'Barishal',
        'Rangpur',
        'Mymensingh',
      ];
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  /**
   * Get paginated and filtered complaint list
   * Configured production queries Supabase directly and fails closed on error.
   * Zero rows return real empty list, never fake fixtures.
   */
  async getComplaints(
    filters: Partial<ComplaintFilterState> = {},
    page = 1,
    pageSize = 6
  ): Promise<ComplaintListResponse> {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.getComplaints(filters, page, pageSize);
    }
    if (isDev) {
      return complaintFallback.getComplaints(filters, page, pageSize);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  /**
   * Get counts for lifecycle status tabs
   */
  async getComplaintStats(): Promise<ComplaintStatusTabCount[]> {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.getComplaintStats();
    }
    if (isDev) {
      return complaintFallback.getComplaintStats();
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  /**
   * Get single complaint by ID
   */
  async getComplaintById(id: string): Promise<Complaint | null> {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.getComplaintById(id);
    }
    if (isDev) {
      return complaintFallback.getComplaintById(id);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  /**
   * Get complete complaint detail workspace package (complaint + timeline + evidence + reporter location)
   */
  async getComplaintDetail(
    id: string,
    options?: { loadEvidence?: boolean; loadReporterLocation?: boolean }
  ): Promise<ComplaintDetailData | null> {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.getComplaintDetail(id, options);
    }
    if (isDev) {
      return complaintFallback.getComplaintDetail(id);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  /**
   * Get private reporter device location from secure RPC
   */
  async getComplaintReporterLocation(id: string) {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.getComplaintReporterLocation(id);
    }
    if (isDev) {
      return { data: null };
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  /**
   * Get timeline for complaint
   */
  async getComplaintTimeline(id: string): Promise<ComplaintTimelineEvent[]> {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.getComplaintTimeline(id);
    }
    if (isDev) {
      return complaintFallback.getComplaintTimeline(id);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  /**
   * Workflow Action Methods
   */
  async editComplaint(
    complaintId: string,
    updates: Partial<Complaint>,
    notes?: string
  ): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      throw new Error('Direct complaint editing is not supported on configured backend.');
    }
    if (isDev) {
      return complaintFallback.editComplaint(complaintId, updates, notes);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  async rejectComplaint(
    complaintId: string,
    reason: string,
    explanation: string
  ): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.rejectComplaint(complaintId, reason, explanation);
    }
    if (isDev) {
      return complaintFallback.rejectComplaint(complaintId, reason, explanation);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  async publishComplaint(complaintId: string): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.publishComplaint(complaintId);
    }
    if (isDev) {
      return complaintFallback.publishComplaint(complaintId);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  async unpublishComplaint(complaintId: string): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      return await supabaseComplaintService.unpublishComplaint(complaintId);
    }
    if (isDev) {
      return complaintFallback.unpublishComplaint(complaintId);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }

  async addComplaintUpdate(complaintId: string, message: string): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      throw new Error('Complaint update messages must be added via authenticated database procedures.');
    }
    if (isDev) {
      return complaintFallback.addComplaintUpdate(complaintId, message);
    }
    throw new Error('Supabase complaint service is not configured in this environment.');
  }
}

export const complaintApi = new ComplaintApi();
export default complaintApi;
export { type WorkflowActionResult } from '@/services/fallback/complaintFallback';
