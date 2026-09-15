/**
 * Complaint workflow result contract.
 *
 * Historical note: this file used to provide development mock fallbacks. The
 * runtime fallback implementation has been removed; only the shared result
 * type remains temporarily to avoid widening the cleanup scope across the
 * existing complaint service contract.
 */

import type { Complaint, ComplaintTimelineEvent } from '@/types/Complaint';

export interface WorkflowActionResult {
  success: boolean;
  complaint: Complaint;
  timeline: ComplaintTimelineEvent[];
  timelineError?: string | null;
  messageEn: string;
  messageBn: string;
}
