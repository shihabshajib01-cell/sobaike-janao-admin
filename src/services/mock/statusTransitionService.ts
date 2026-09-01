/**
 * Status Transition Service
 * Validates and coordinates allowed status transitions across the complaint lifecycle.
 * Prevents invalid workflow jumps and keeps lifecycle transitions strictly rule-bound.
 */

import { ComplaintLifecycleStatus, Complaint } from '@/types/Complaint';

export interface TransitionRule {
  from: ComplaintLifecycleStatus;
  allowedTargets: ComplaintLifecycleStatus[];
  descriptionEn: string;
  descriptionBn: string;
}

/**
 * Controlled Matrix of Allowed Status Transitions for Complaints
 * Complaint status must ONLY be:
 * 1. Submitted (submitted)
 * 2. Published (published)
 * 3. Rejected (rejected)
 * 4. Edited (edited)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ComplaintLifecycleStatus, ComplaintLifecycleStatus[]> = {
  submitted: ['published', 'rejected', 'edited'],
  published: ['rejected', 'edited'],
  rejected: ['submitted', 'published', 'edited'],
  edited: ['published', 'rejected', 'edited'],
};

export class StatusTransitionService {
  /**
   * Check if a specific status change is permitted
   */
  isTransitionAllowed(
    fromStatus: ComplaintLifecycleStatus,
    toStatus: ComplaintLifecycleStatus
  ): boolean {
    if (fromStatus === toStatus) return true;
    const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  /**
   * Get list of all statuses reachable from the current status
   */
  getAllowedTargetStatuses(currentStatus: ComplaintLifecycleStatus): ComplaintLifecycleStatus[] {
    return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Validate transition and throw a structured error if disallowed
   */
  validateTransition(
    fromStatus: ComplaintLifecycleStatus,
    toStatus: ComplaintLifecycleStatus
  ): { valid: boolean; error?: string } {
    if (!this.isTransitionAllowed(fromStatus, toStatus)) {
      return {
        valid: false,
        error: `Cannot transition complaint from status "${fromStatus}" to "${toStatus}". Allowed targets: [${(ALLOWED_STATUS_TRANSITIONS[fromStatus] || []).join(', ')}]`,
      };
    }
    return { valid: true };
  }
}

export const mockStatusTransitionService = new StatusTransitionService();
export default mockStatusTransitionService;
