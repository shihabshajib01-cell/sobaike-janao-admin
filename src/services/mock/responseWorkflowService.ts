/**
 * Response Moderation Workflow Service
 * Orchestrates status transitions, compliance validation, and timeline logging for responses.
 */

import { ResponseItem } from '@/types/Response';
import { mockResponseService } from './responseService';
import { mockResponseTimelineService } from './responseTimelineService';

export interface WorkflowResult {
  success: boolean;
  message: string;
  response: ResponseItem;
}

class ResponseWorkflowService {
  /**
   * Approves a pending response for publication readiness
   */
  public async approveResponse(
    responseId: string,
    notes?: string
  ): Promise<WorkflowResult> {
    const existing = await mockResponseService.getResponseById(responseId);
    if (!existing) {
      throw new Error(`Response ${responseId} not found`);
    }

    const updated: ResponseItem = {
      ...existing,
      status: 'approved',
      moderatorNotes: notes || existing.moderatorNotes,
      reviewedBy: 'Farhana Yasmin (Civic Moderator)',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockResponseService._updateResponseInMemory(updated);

    // Log timeline event
    await mockResponseTimelineService.addEvent(responseId, {
      action: 'approved',
      titleEn: 'Response Approved for Publication',
      titleBn: 'প্রতিক্রিয়া প্রকাশের জন্য অনুমোদিত হয়েছে',
      descriptionEn: notes
        ? `Response verified and approved. Notes: "${notes}"`
        : 'Response content and author verification passed moderation checks.',
      descriptionBn: notes
        ? `প্রতিক্রিয়া যাচাই ও অনুমোদিত হয়েছে। নোট: "${notes}"`
        : 'প্রতিক্রিয়ার বিষয়বস্তু এবং প্রেরকের পরিচয় যাচাইকরণে উত্তীর্ণ হয়েছে।',
      actor: {
        name: 'Farhana Yasmin',
        role: 'Moderator',
      },
    });

    return {
      success: true,
      message: 'Response approved successfully.',
      response: updated,
    };
  }

  /**
   * Rejects a response with mandatory reason and explanation
   */
  public async rejectResponse(
    responseId: string,
    reason: string,
    explanation: string
  ): Promise<WorkflowResult> {
    const existing = await mockResponseService.getResponseById(responseId);
    if (!existing) {
      throw new Error(`Response ${responseId} not found`);
    }

    const updated: ResponseItem = {
      ...existing,
      status: 'rejected',
      isPubliclyVisible: false,
      rejectionReason: reason,
      rejectionExplanation: explanation,
      updatedAt: new Date().toISOString(),
    };

    mockResponseService._updateResponseInMemory(updated);

    // Log timeline event
    await mockResponseTimelineService.addEvent(responseId, {
      action: 'rejected',
      titleEn: 'Response Rejected by Moderator',
      titleBn: 'মডারেশন টিম কর্তৃক প্রতিক্রিয়া বাতিল',
      descriptionEn: `Rejected due to: ${reason}. Explanation: ${explanation}`,
      descriptionBn: `বাতিলের কারণ: ${reason}। বিস্তারিত: ${explanation}`,
      actor: {
        name: 'Farhana Yasmin',
        role: 'Moderator',
      },
    });

    return {
      success: true,
      message: 'Response has been rejected.',
      response: updated,
    };
  }

  /**
   * Publishes response to make it publicly visible
   */
  public async publishResponse(
    responseId: string,
    options?: { notes?: string }
  ): Promise<WorkflowResult> {
    const existing = await mockResponseService.getResponseById(responseId);
    if (!existing) {
      throw new Error(`Response ${responseId} not found`);
    }

    const updated: ResponseItem = {
      ...existing,
      status: 'published',
      isPubliclyVisible: true,
      publishedAt: new Date().toISOString(),
      moderatorNotes: options?.notes || existing.moderatorNotes,
      updatedAt: new Date().toISOString(),
    };

    mockResponseService._updateResponseInMemory(updated);

    // Log timeline event
    await mockResponseTimelineService.addEvent(responseId, {
      action: 'published',
      titleEn: 'Response Published Live',
      titleBn: 'প্রতিক্রিয়া লাইভ প্রকাশিত হয়েছে',
      descriptionEn: `Response broadcasted to public portal under related record ${existing.relatedId}.`,
      descriptionBn: `সম্পর্কিত রেকর্ড ${existing.relatedId} এর অধীনে প্রতিক্রিয়াটি পাবলিক পোর্টালে সরাসরি প্রকাশ করা হয়েছে।`,
      actor: {
        name: 'Farhana Yasmin',
        role: 'Moderator',
      },
    });

    return {
      success: true,
      message: 'Response is now published live.',
      response: updated,
    };
  }

  /**
   * Unpublishes a previously live response
   */
  public async unpublishResponse(
    responseId: string,
    reason: string
  ): Promise<WorkflowResult> {
    const existing = await mockResponseService.getResponseById(responseId);
    if (!existing) {
      throw new Error(`Response ${responseId} not found`);
    }

    const updated: ResponseItem = {
      ...existing,
      status: 'unpublished',
      isPubliclyVisible: false,
      unpublishReason: reason,
      updatedAt: new Date().toISOString(),
    };

    mockResponseService._updateResponseInMemory(updated);

    // Log timeline event
    await mockResponseTimelineService.addEvent(responseId, {
      action: 'unpublished',
      titleEn: 'Response Hidden / Unpublished',
      titleBn: 'প্রতিক্রিয়া সাময়িক প্রত্যাহার / অপ্রকাশিত',
      descriptionEn: `Response removed from public visibility. Reason: ${reason}`,
      descriptionBn: `পাবলিক প্রদর্শন থেকে প্রত্যাহার করা হয়েছে। কারণ: ${reason}`,
      actor: {
        name: 'Farhana Yasmin',
        role: 'Moderator',
      },
    });

    return {
      success: true,
      message: 'Response unpublished successfully.',
      response: updated,
    };
  }

  /**
   * Edits public sanitized version of the response content
   */
  public async updatePublicVersion(
    responseId: string,
    publicContentEn: string,
    publicContentBn: string
  ): Promise<WorkflowResult> {
    const existing = await mockResponseService.getResponseById(responseId);
    if (!existing) {
      throw new Error(`Response ${responseId} not found`);
    }

    const updated: ResponseItem = {
      ...existing,
      publicContentEn,
      publicContentBn,
      updatedAt: new Date().toISOString(),
    };

    mockResponseService._updateResponseInMemory(updated);

    // Log timeline event
    await mockResponseTimelineService.addEvent(responseId, {
      action: 'updated',
      titleEn: 'Public Version Sanitized & Updated',
      titleBn: 'পাবলিক সংস্করণ পরিমার্জন ও আপডেট সম্পন্ন',
      descriptionEn: 'Moderator edited public-facing version to ensure citizen privacy and clear civic communication.',
      descriptionBn: 'নাগরিকের ব্যক্তিগত গোপনীয়তা রক্ষা এবং স্পষ্ট যোগাযোগের স্বার্থে মডারেটর পাবলিক সংস্করণ সম্পাদনা করেছেন।',
      actor: {
        name: 'Farhana Yasmin',
        role: 'Moderator',
      },
    });

    return {
      success: true,
      message: 'Public version updated successfully.',
      response: updated,
    };
  }
}

export const mockResponseWorkflowService = new ResponseWorkflowService();
