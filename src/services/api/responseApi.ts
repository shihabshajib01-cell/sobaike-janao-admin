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

export const RESPONSE_MANAGEMENT_CONNECTED = false;

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
    _filters: Partial<ResponseFilterState> = {},
    _page = 1,
    _limit = 10
  ): Promise<ResponseListResponse> {
    throw new ResponseFeatureUnavailableError();
  }

  /**
   * Get single response by ID
   */
  async getResponseById(_id: string): Promise<ResponseItem | null> {
    throw new ResponseFeatureUnavailableError();
  }

  /**
   * Get response status metrics
   */
  async getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    throw new ResponseFeatureUnavailableError();
  }

  /**
   * Approve official response
   */
  async approveResponse(_responseId: string, _notes?: string): Promise<ResponseWorkflowResult> {
    throw new ResponseFeatureUnavailableError();
  }

  /**
   * Publish response
   */
  async publishResponse(
    _responseId: string,
    _options?: { notes?: string }
  ): Promise<ResponseWorkflowResult> {
    throw new ResponseFeatureUnavailableError();
  }

  /**
   * Unpublish response
   */
  async unpublishResponse(_responseId: string, _reason: string): Promise<ResponseWorkflowResult> {
    throw new ResponseFeatureUnavailableError();
  }

  /**
   * Reject response
   */
  async rejectResponse(
    _responseId: string,
    _reason: string,
    _explanation: string
  ): Promise<ResponseWorkflowResult> {
    throw new ResponseFeatureUnavailableError();
  }

  /**
   * Update public-facing copy
   */
  async updatePublicVersion(
    _responseId: string,
    _publicContentEn: string,
    _publicContentBn: string
  ): Promise<ResponseWorkflowResult> {
    throw new ResponseFeatureUnavailableError();
  }

  /**
   * Get audit timeline events for response
   */
  async getResponseTimeline(_responseId: string): Promise<ResponseTimelineEvent[]> {
    throw new ResponseFeatureUnavailableError();
  }
}

export const responseApi = new ResponseApi();
export default responseApi;
export { type ResponseWorkflowResult };
