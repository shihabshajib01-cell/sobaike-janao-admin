/**
 * Complaint Fallback Service
 * Bridges API layer to mock fixtures during offline/development mode.
 */

import {
  Complaint,
  ComplaintFilterState,
  ComplaintListResponse,
  ComplaintStatusTabCount,
  ComplaintTimelineEvent,
} from '@/types/Complaint';
import { mockComplaintService } from '@/services/mock/complaintService';
import { mockComplaintDetailService } from '@/services/mock/complaintDetailService';
import { mockWorkflowService, WorkflowActionResult } from '@/services/mock/workflowService';

export const complaintFallback = {
  getComplaints(
    filters: Partial<ComplaintFilterState> = {},
    page = 1,
    pageSize = 6
  ): Promise<ComplaintListResponse> {
    return mockComplaintService.getComplaints(filters, page, pageSize);
  },

  getComplaintStats(): Promise<ComplaintStatusTabCount[]> {
    return mockComplaintService.getComplaintStats();
  },

  getComplaintById(id: string): Promise<Complaint | null> {
    return mockComplaintDetailService.getComplaintById(id);
  },

  getComplaintTimeline(id: string): Promise<ComplaintTimelineEvent[]> {
    return mockComplaintDetailService.getComplaintTimeline(id);
  },

  async getComplaintDetail(id: string): Promise<{ complaint: Complaint; timeline: ComplaintTimelineEvent[] } | null> {
    const complaint = await mockComplaintDetailService.getComplaintById(id);
    if (!complaint) return null;
    const timeline = await mockComplaintDetailService.getComplaintTimeline(id);
    return { complaint, timeline };
  },

  editComplaint(
    complaintId: string,
    updates: Partial<Complaint>,
    notes?: string
  ): Promise<WorkflowActionResult> {
    return mockWorkflowService.editComplaint(complaintId, updates, notes);
  },

  publishComplaint(complaintId: string): Promise<WorkflowActionResult> {
    return mockWorkflowService.publishComplaint(complaintId);
  },

  unpublishComplaint(complaintId: string): Promise<WorkflowActionResult> {
    return mockWorkflowService.unpublishComplaint(complaintId);
  },

  rejectComplaint(complaintId: string, reason: string, explanation: string): Promise<WorkflowActionResult> {
    return mockWorkflowService.rejectComplaint(complaintId, reason, explanation);
  },

  addComplaintUpdate(complaintId: string, message: string): Promise<WorkflowActionResult> {
    return mockWorkflowService.addComplaintUpdate(complaintId, message);
  },
};

export default complaintFallback;
export { type WorkflowActionResult };
