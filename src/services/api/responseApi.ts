/**
 * Response API Service Layer
 * UI contract retained for future real Response API integration.
 * Currently disconnected until backend/schema audit phase.
 */

import {
  ResponseItem,
  ResponseFilterState,
  ResponseListResponse,
  ResponseStatusFilter,
  ResponseTimelineEvent,
  ResponseWorkflowResult,
} from '@/types/Response';
import { responseFallback } from '@/services/fallback/responseFallback';

export const RESPONSE_MANAGEMENT_CONNECTED = true;

export class ResponseFeatureUnavailableError extends Error {
  code = 'FEATURE_NOT_CONNECTED';

  constructor() {
    super('Response management API is not connected.');
    this.name = 'ResponseFeatureUnavailableError';
  }
}

export class ResponseApi {
  /**
   * Get filtered and paginated responses list
   */
  async getResponses(
    filters: Partial<ResponseFilterState> = {},
    page = 1,
    limit = 10
  ): Promise<ResponseListResponse> {
    return responseFallback.getResponses(filters, page, limit);
  }

  /**
   * Get single response by ID
   */
  async getResponseById(id: string): Promise<ResponseItem | null> {
    return responseFallback.getResponseById(id);
  }

  /**
   * Get response status metrics
   */
  async getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    return responseFallback.getStatusCounts();
  }

  /**
   * Approve official response
   */
  async approveResponse(responseId: string, notes?: string): Promise<ResponseWorkflowResult> {
    return responseFallback.approveResponse(responseId, notes);
  }

  /**
   * Publish response
   */
  async publishResponse(
    responseId: string,
    options?: { notes?: string }
  ): Promise<ResponseWorkflowResult> {
    return responseFallback.publishResponse(responseId, options);
  }

  /**
   * Unpublish response
   */
  async unpublishResponse(responseId: string, reason: string): Promise<ResponseWorkflowResult> {
    return responseFallback.unpublishResponse(responseId, reason);
  }

  /**
   * Reject response
   */
  async rejectResponse(
    responseId: string,
    reason: string,
    explanation: string
  ): Promise<ResponseWorkflowResult> {
    return responseFallback.rejectResponse(responseId, reason, explanation);
  }

  /**
   * Update public-facing copy
   */
  async updatePublicVersion(
    responseId: string,
    publicContentEn: string,
    publicContentBn: string
  ): Promise<ResponseWorkflowResult> {
    return responseFallback.updatePublicVersion(responseId, publicContentEn, publicContentBn);
  }

  /**
   * Get audit timeline events for response
   */
  async getResponseTimeline(responseId: string): Promise<ResponseTimelineEvent[]> {
    return responseFallback.getResponseTimeline(responseId);
  }
}

export const responseApi = new ResponseApi();
export default responseApi;
export { type ResponseWorkflowResult };

