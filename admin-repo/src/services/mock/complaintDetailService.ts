/**
 * Complaint Detail Mock Service
 * API-ready service for fetching complaint details and audit timeline logs.
 * Replaceable with real backend endpoints.
 */

import { Complaint, ComplaintTimelineEvent } from '@/types/Complaint';
import { MOCK_COMPLAINTS } from './complaintService';
import { mockTimelineService } from './timelineService';

export class ComplaintDetailService {
  /**
   * Fetch full complaint details by ID
   */
  async getComplaintById(id: string): Promise<Complaint | null> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const found = MOCK_COMPLAINTS.find((c) => c.id.toLowerCase() === id.toLowerCase());
    return found ? { ...found } : null;
  }

  /**
   * Fetch complaint lifecycle timeline logs via TimelineService
   */
  async getComplaintTimeline(id: string): Promise<ComplaintTimelineEvent[]> {
    return mockTimelineService.getComplaintTimeline(id);
  }
}

export const mockComplaintDetailService = new ComplaintDetailService();
export default mockComplaintDetailService;
