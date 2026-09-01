/**
 * Complaint API Service Layer
 * Abstracts REST/gRPC backend endpoints with robust mock fallback for development and preview.
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
   * Get paginated and filtered complaint list
   */
  async getComplaints(
    filters: Partial<ComplaintFilterState> = {},
    page = 1,
    pageSize = 6
  ): Promise<ComplaintListResponse> {
    try {
      const response = await this.client.get<ComplaintListResponse>('/complaints', {
        params: {
          page,
          pageSize,
          status: filters.status,
          category: filters.category,
          location: filters.location,
          searchQuery: filters.searchQuery,
          dateRange: filters.dateRange,
        },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback to fallback service in development / preview
    }
    return complaintFallback.getComplaints(filters, page, pageSize);
  }

  /**
   * Get counts for lifecycle status tabs
   */
  async getComplaintStats(): Promise<ComplaintStatusTabCount[]> {
    try {
      const response = await this.client.get<ComplaintStatusTabCount[]>('/complaints/stats');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return complaintFallback.getComplaintStats();
  }

  /**
   * Get single complaint by ID
   */
  async getComplaintById(id: string): Promise<Complaint | null> {
    try {
      const response = await this.client.get<Complaint>(`/complaints/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return complaintFallback.getComplaintById(id);
  }

  /**
   * Get complete complaint detail workspace package (complaint + timeline)
   */
  async getComplaintDetail(id: string): Promise<ComplaintDetailData | null> {
    try {
      const response = await this.client.get<ComplaintDetailData>(`/complaints/${id}/detail`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return complaintFallback.getComplaintDetail(id);
  }

  /**
   * Get timeline for complaint
   */
  async getComplaintTimeline(id: string): Promise<ComplaintTimelineEvent[]> {
    try {
      const response = await this.client.get<ComplaintTimelineEvent[]>(`/complaints/${id}/timeline`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return complaintFallback.getComplaintTimeline(id);
  }

  /**
   * Workflow Action Methods
   */
  async editComplaint(
    complaintId: string,
    updates: Partial<Complaint>,
    notes?: string
  ): Promise<WorkflowActionResult> {
    try {
      const response = await this.client.patch<WorkflowActionResult>(`/complaints/${complaintId}`, {
        updates,
        notes,
      });
      if (response.success && response.data) return response.data;
    } catch {}
    return complaintFallback.editComplaint(complaintId, updates, notes);
  }

  async rejectComplaint(
    complaintId: string,
    reason: string,
    explanation: string
  ): Promise<WorkflowActionResult> {
    try {
      const response = await this.client.post<WorkflowActionResult>(`/complaints/${complaintId}/reject`, {
        reason,
        explanation,
      });
      if (response.success && response.data) return response.data;
    } catch {}
    return complaintFallback.rejectComplaint(complaintId, reason, explanation);
  }

  async publishComplaint(complaintId: string): Promise<WorkflowActionResult> {
    try {
      const response = await this.client.post<WorkflowActionResult>(`/complaints/${complaintId}/publish`);
      if (response.success && response.data) return response.data;
    } catch {}
    return complaintFallback.publishComplaint(complaintId);
  }

  async addComplaintUpdate(complaintId: string, message: string): Promise<WorkflowActionResult> {
    try {
      const response = await this.client.post<WorkflowActionResult>(`/complaints/${complaintId}/updates`, {
        message,
      });
      if (response.success && response.data) return response.data;
    } catch {}
    return complaintFallback.addComplaintUpdate(complaintId, message);
  }
}

export const complaintApi = new ComplaintApi();
export default complaintApi;
export { type WorkflowActionResult } from '@/services/fallback/complaintFallback';

