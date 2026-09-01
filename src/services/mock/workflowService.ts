/**
 * Workflow Mock Service
 * Orchestrates business actions, status transitions, and timeline logging for complaint reviews.
 * API-ready architecture designed for RESTful / GraphQL backend endpoints.
 */

import { Complaint, ComplaintLifecycleStatus, ComplaintTimelineEvent } from '@/types/Complaint';
import { MOCK_COMPLAINTS } from './complaintService';
import { mockStatusTransitionService } from './statusTransitionService';
import { mockTimelineService } from './timelineService';
import { CURRENT_ADMIN_USER } from './permissionService';

export interface WorkflowActionResult {
  success: boolean;
  complaint: Complaint;
  timeline: ComplaintTimelineEvent[];
  messageEn: string;
  messageBn: string;
}

export class WorkflowService {
  /**
   * Helper to find complaint in mock store
   */
  private findComplaint(complaintId: string): Complaint {
    const complaint = MOCK_COMPLAINTS.find(
      (c) => c.id.toLowerCase() === complaintId.toLowerCase()
    );
    if (!complaint) {
      throw new Error(`Complaint with ID "${complaintId}" was not found.`);
    }
    return complaint;
  }

  /**
   * Edit Complaint Action
   * Updates complaint details (title, description, category, subcategory, urgency, location),
   * records a new version snapshot in `versions`, sets status to 'edited', and logs audit timeline event.
   */
  async editComplaint(
    complaintId: string,
    updates: Partial<Complaint>,
    notes?: string,
    actor = { name: CURRENT_ADMIN_USER.name, role: 'Administrator' }
  ): Promise<WorkflowActionResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const complaint = this.findComplaint(complaintId);
    const fromStatus = complaint.status;

    // Ensure versions array exists
    if (!complaint.versions || complaint.versions.length === 0) {
      complaint.versions = [
        {
          versionNumber: 1,
          titleEn: complaint.titleEn,
          titleBn: complaint.titleBn,
          descriptionEn: complaint.descriptionEn,
          descriptionBn: complaint.descriptionBn,
          categoryId: complaint.categoryId,
          categoryEn: complaint.categoryEn,
          categoryBn: complaint.categoryBn,
          subcategoryId: complaint.subcategoryId,
          subcategoryEn: complaint.subcategoryEn,
          subcategoryBn: complaint.subcategoryBn,
          location: { ...complaint.location },
          media: [...complaint.media],
          urgency: complaint.urgency,
          editedAt: complaint.createdAt,
          editedBy: {
            name: complaint.citizenName || 'Citizen',
            role: complaint.isAnonymous ? 'Anonymous Citizen' : 'Citizen Submitter',
          },
          editNotes: 'Original submission',
        },
      ];
    }

    // Apply updates
    if (updates.titleEn !== undefined) complaint.titleEn = updates.titleEn;
    if (updates.titleBn !== undefined) complaint.titleBn = updates.titleBn;
    if (updates.descriptionEn !== undefined) complaint.descriptionEn = updates.descriptionEn;
    if (updates.descriptionBn !== undefined) complaint.descriptionBn = updates.descriptionBn;
    if (updates.categoryId !== undefined) complaint.categoryId = updates.categoryId;
    if (updates.categoryEn !== undefined) complaint.categoryEn = updates.categoryEn;
    if (updates.categoryBn !== undefined) complaint.categoryBn = updates.categoryBn;
    if (updates.subcategoryId !== undefined) complaint.subcategoryId = updates.subcategoryId;
    if (updates.subcategoryEn !== undefined) complaint.subcategoryEn = updates.subcategoryEn;
    if (updates.subcategoryBn !== undefined) complaint.subcategoryBn = updates.subcategoryBn;
    if (updates.urgency !== undefined) complaint.urgency = updates.urgency;
    if (updates.location) {
      complaint.location = { ...complaint.location, ...updates.location };
    }

    // Status transition to 'edited'
    const toStatus: ComplaintLifecycleStatus = 'edited';
    complaint.status = toStatus;
    const nowIso = new Date().toISOString();
    complaint.updatedAt = nowIso;

    // Record new version in versions history
    const nextVersionNumber = complaint.versions.length + 1;
    complaint.versions.push({
      versionNumber: nextVersionNumber,
      titleEn: complaint.titleEn,
      titleBn: complaint.titleBn,
      descriptionEn: complaint.descriptionEn,
      descriptionBn: complaint.descriptionBn,
      categoryId: complaint.categoryId,
      categoryEn: complaint.categoryEn,
      categoryBn: complaint.categoryBn,
      subcategoryId: complaint.subcategoryId,
      subcategoryEn: complaint.subcategoryEn,
      subcategoryBn: complaint.subcategoryBn,
      location: { ...complaint.location },
      media: [...complaint.media],
      urgency: complaint.urgency,
      editedAt: nowIso,
      editedBy: {
        name: actor.name,
        role: actor.role,
      },
      editNotes: notes?.trim() || 'Admin edited complaint details',
    });

    await mockTimelineService.addTimelineEvent({
      complaintId: complaint.id,
      type: 'official_update',
      actorName: actor.name,
      actorRole: actor.role,
      titleEn: `Complaint Edited (Version ${nextVersionNumber})`,
      titleBn: `অভিযোগ সম্পাদিত হয়েছে (সংস্করণ ${nextVersionNumber})`,
      descriptionEn: notes?.trim()
        ? `Complaint details updated to Version ${nextVersionNumber}. Note: "${notes.trim()}"`
        : `Administrative edits saved. Version ${nextVersionNumber} created and status set to Edited.`,
      descriptionBn: notes?.trim()
        ? `অভিযোগের তথ্য সংস্করণ ${nextVersionNumber}-এ আপডেট করা হয়েছে। নোট: "${notes.trim()}"`
        : `প্রশাসনিকভাবে তথ্য সংশোধন করে সংস্করণ ${nextVersionNumber} তৈরি করা হয়েছে এবং স্ট্যাটাস সম্পাদিত হয়েছে।`,
      fromStatus,
      toStatus,
    });

    const updatedTimeline = await mockTimelineService.getComplaintTimeline(complaint.id);

    return {
      success: true,
      complaint: { ...complaint },
      timeline: updatedTimeline,
      messageEn: `Complaint ${complaint.id} successfully updated to Version ${nextVersionNumber}.`,
      messageBn: `অভিযোগ ${complaint.id} সফলভাবে সংস্করণ ${nextVersionNumber}-এ রূপান্তর করা হয়েছে।`,
    };
  }

  /**
   * Publish Complaint Action
   * Transitions complaint status to 'published'
   */
  async publishComplaint(
    complaintId: string,
    actor = { name: CURRENT_ADMIN_USER.name, role: 'Moderator' }
  ): Promise<WorkflowActionResult> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const complaint = this.findComplaint(complaintId);
    const fromStatus = complaint.status;
    const toStatus: ComplaintLifecycleStatus = 'published';

    const validation = mockStatusTransitionService.validateTransition(fromStatus, toStatus);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    complaint.status = toStatus;
    complaint.updatedAt = new Date().toISOString();

    await mockTimelineService.addTimelineEvent({
      complaintId: complaint.id,
      type: 'status_change',
      actorName: actor.name,
      actorRole: actor.role,
      titleEn: 'Complaint Published',
      titleBn: 'অভিযোগ প্রকাশ করা হয়েছে',
      descriptionEn: 'Complaint approved and published on Sobaike citizen platform for public visibility.',
      descriptionBn: 'অভিযোগটি অনুমোদনপূর্বক সবার নাগরিক প্ল্যাটফর্মে উন্মুক্তভাবে প্রকাশ করা হয়েছে।',
      fromStatus,
      toStatus,
    });

    const updatedTimeline = await mockTimelineService.getComplaintTimeline(complaint.id);

    return {
      success: true,
      complaint: { ...complaint },
      timeline: updatedTimeline,
      messageEn: `Complaint ${complaint.id} successfully published.`,
      messageBn: `অভিযোগ ${complaint.id} সফলভাবে প্রকাশিত হয়েছে।`,
    };
  }

  /**
   * Reject Complaint Action
   * Transitions complaint status to 'rejected'
   */
  async rejectComplaint(
    complaintId: string,
    reason: string,
    explanation: string,
    actor = { name: CURRENT_ADMIN_USER.name, role: 'Moderator' }
  ): Promise<WorkflowActionResult> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const complaint = this.findComplaint(complaintId);
    const fromStatus = complaint.status;
    const toStatus: ComplaintLifecycleStatus = 'rejected';

    if (!reason || !explanation.trim()) {
      throw new Error('A rejection reason and detailed explanation are required.');
    }

    const validation = mockStatusTransitionService.validateTransition(fromStatus, toStatus);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    complaint.status = toStatus;
    complaint.updatedAt = new Date().toISOString();

    const reasonLabelMap: Record<string, { en: string; bn: string }> = {
      duplicate: { en: 'Duplicate Entry', bn: 'অনুরূপ অভিযোগ বিদ্যমান' },
      spam_invalid: { en: 'Spam / Invalid Material', bn: 'স্প্যাম বা প্রচারণামূলক উপাদান' },
      insufficient_evidence: { en: 'Insufficient Evidence', bn: 'অসম্পূর্ণ বিবরণ বা প্রমাণের অভাব' },
      out_of_jurisdiction: { en: 'Out of Jurisdiction', bn: 'এখতিয়ার বহির্ভূত' },
    };

    const reasonLabel = reasonLabelMap[reason] || { en: reason, bn: reason };

    await mockTimelineService.addTimelineEvent({
      complaintId: complaint.id,
      type: 'status_change',
      actorName: actor.name,
      actorRole: actor.role,
      titleEn: `Complaint Rejected (${reasonLabel.en})`,
      titleBn: `অভিযোগ বাতিল করা হয়েছে (${reasonLabel.bn})`,
      descriptionEn: `Reason: ${reasonLabel.en}. Explanation: "${explanation.trim()}"`,
      descriptionBn: `কারণ: ${reasonLabel.bn}। ব্যাখ্যা: "${explanation.trim()}"`,
      fromStatus,
      toStatus,
    });

    const updatedTimeline = await mockTimelineService.getComplaintTimeline(complaint.id);

    return {
      success: true,
      complaint: { ...complaint },
      timeline: updatedTimeline,
      messageEn: `Complaint ${complaint.id} was rejected.`,
      messageBn: `অভিযোগ ${complaint.id} বাতিল করা হয়েছে।`,
    };
  }

  /**
   * 7. Add Department Progress Update Action
   * Adds timeline event without changing status
   */
  async addComplaintUpdate(
    complaintId: string,
    message: string,
    actor = { name: CURRENT_ADMIN_USER.name, role: 'Admin' }
  ): Promise<WorkflowActionResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const complaint = this.findComplaint(complaintId);

    if (!message || !message.trim()) {
      throw new Error('Please enter the progress update statement.');
    }

    complaint.updatedAt = new Date().toISOString();

    await mockTimelineService.addTimelineEvent({
      complaintId: complaint.id,
      type: 'official_update',
      actorName: actor.name,
      actorRole: actor.role,
      titleEn: 'Official Progress Note Added',
      titleBn: 'দাপ্তরিক অগ্রগতি নোট যুক্ত করা হয়েছে',
      descriptionEn: message.trim(),
      descriptionBn: message.trim(),
    });

    const updatedTimeline = await mockTimelineService.getComplaintTimeline(complaint.id);

    return {
      success: true,
      complaint: { ...complaint },
      timeline: updatedTimeline,
      messageEn: `Progress update recorded for ${complaint.id}.`,
      messageBn: `অভিযোগের জন্য অগ্রগতি নোট সংরক্ষণ করা হয়েছে।`,
    };
  }
}

export const mockWorkflowService = new WorkflowService();
export default mockWorkflowService;
