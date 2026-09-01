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
    if (isSupabaseConfigured) {
      return getTaxonomySegments();
    }
    return [
      { id: 'roads_traffic', name_en: 'Roads & Traffic', name_bn: 'রাস্তাঘাট ও ট্রাফিক', active: true },
      { id: 'waste_management', name_en: 'Waste Management', name_bn: 'বর্জ্য ব্যবস্থাপনা', active: true },
      { id: 'extortion', name_en: 'Extortion & Illegal Tolls', name_bn: 'চাঁদাবাজি ও অবৈধ টোল', active: true },
      { id: 'harassment', name_en: 'Public Harassment', name_bn: 'পাবলিক হয়রানি', active: true },
      { id: 'civic_issues', name_en: 'Civic Problems & Drainage', name_bn: 'নাগরিক সমস্যা ও ড্রেনেজ', active: true },
      { id: 'corruption', name_en: 'Public Office Irregularities', name_bn: 'সরকারি দপ্তরের অনিয়ম', active: true },
    ];
  }

  /**
   * Get distinct locations
   */
  async getLocations(): Promise<string[]> {
    if (isSupabaseConfigured) {
      return getDistinctLocations();
    }
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

  /**
   * Get paginated and filtered complaint list
   */
  async getComplaints(
    filters: Partial<ComplaintFilterState> = {},
    page = 1,
    pageSize = 6
  ): Promise<ComplaintListResponse> {
    if (isSupabaseConfigured) {
      return supabaseComplaintService.getComplaints(filters, page, pageSize);
    }
    return complaintFallback.getComplaints(filters, page, pageSize);
  }

  /**
   * Get counts for lifecycle status tabs
   */
  async getComplaintStats(): Promise<ComplaintStatusTabCount[]> {
    if (isSupabaseConfigured) {
      return supabaseComplaintService.getComplaintStats();
    }
    return complaintFallback.getComplaintStats();
  }

  /**
   * Get single complaint by ID
   */
  async getComplaintById(id: string): Promise<Complaint | null> {
    if (isSupabaseConfigured) {
      return supabaseComplaintService.getComplaintById(id);
    }
    return complaintFallback.getComplaintById(id);
  }

  /**
   * Get complete complaint detail workspace package (complaint + timeline)
   */
  async getComplaintDetail(id: string): Promise<ComplaintDetailData | null> {
    if (isSupabaseConfigured) {
      return supabaseComplaintService.getComplaintDetail(id);
    }
    return complaintFallback.getComplaintDetail(id);
  }

  /**
   * Get timeline for complaint
   */
  async getComplaintTimeline(id: string): Promise<ComplaintTimelineEvent[]> {
    if (isSupabaseConfigured) {
      return supabaseComplaintService.getComplaintTimeline(id);
    }
    return complaintFallback.getComplaintTimeline(id);
  }

  /**
   * Workflow Action Methods (Read-Only Phase Safeguards)
   */
  async editComplaint(
    complaintId: string,
    updates: Partial<Complaint>,
    notes?: string
  ): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      throw new Error('Action integration is not enabled yet.');
    }
    return complaintFallback.editComplaint(complaintId, updates, notes);
  }

  async rejectComplaint(
    complaintId: string,
    reason: string,
    explanation: string
  ): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      throw new Error('Action integration is not enabled yet.');
    }
    return complaintFallback.rejectComplaint(complaintId, reason, explanation);
  }

  async publishComplaint(complaintId: string): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      throw new Error('Action integration is not enabled yet.');
    }
    return complaintFallback.publishComplaint(complaintId);
  }

  async addComplaintUpdate(complaintId: string, message: string): Promise<WorkflowActionResult> {
    if (isSupabaseConfigured) {
      throw new Error('Action integration is not enabled yet.');
    }
    return complaintFallback.addComplaintUpdate(complaintId, message);
  }
}

export const complaintApi = new ComplaintApi();
export default complaintApi;
export { type WorkflowActionResult } from '@/services/fallback/complaintFallback';
