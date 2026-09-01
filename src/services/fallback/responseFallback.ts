/**
 * Response Fallback Service
 */

import {
  ResponseItem,
  ResponseFilterState,
  ResponseListResponse,
  ResponseStatusFilter,
  ResponseTimelineEvent,
} from '@/types/Response';
import { mockResponseService } from '@/services/mock/responseService';
import {
  mockResponseWorkflowService,
  WorkflowResult as ResponseWorkflowResult,
} from '@/services/mock/responseWorkflowService';
import { mockResponseTimelineService } from '@/services/mock/responseTimelineService';

export const responseFallback = {
  getResponses(
    filters: Partial<ResponseFilterState> = {},
    page = 1,
    limit = 10
  ): Promise<ResponseListResponse> {
    const fullFilters: ResponseFilterState = {
      search: filters.search || '',
      status: filters.status || 'all',
      relatedType: filters.relatedType || 'all',
      authorRole: filters.authorRole || 'all',
      categoryId: filters.categoryId || 'all',
      dateRange: filters.dateRange || {},
    };
    return mockResponseService.getResponses(fullFilters, page, limit);
  },

  getResponseById(id: string): Promise<ResponseItem | null> {
    return mockResponseService.getResponseById(id);
  },

  getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    return mockResponseService.getStatusCounts();
  },

  approveResponse(responseId: string, notes?: string): Promise<ResponseWorkflowResult> {
    return mockResponseWorkflowService.approveResponse(responseId, notes);
  },

  publishResponse(responseId: string, options?: { notes?: string }): Promise<ResponseWorkflowResult> {
    return mockResponseWorkflowService.publishResponse(responseId, options);
  },

  unpublishResponse(responseId: string, reason: string): Promise<ResponseWorkflowResult> {
    return mockResponseWorkflowService.unpublishResponse(responseId, reason);
  },

  rejectResponse(responseId: string, reason: string, explanation: string): Promise<ResponseWorkflowResult> {
    return mockResponseWorkflowService.rejectResponse(responseId, reason, explanation);
  },

  updatePublicVersion(
    responseId: string,
    publicContentEn: string,
    publicContentBn: string
  ): Promise<ResponseWorkflowResult> {
    return mockResponseWorkflowService.updatePublicVersion(
      responseId,
      publicContentEn,
      publicContentBn
    );
  },

  getResponseTimeline(responseId: string): Promise<ResponseTimelineEvent[]> {
    return mockResponseTimelineService.getTimeline(responseId);
  },
};

export default responseFallback;
export { type ResponseWorkflowResult };
