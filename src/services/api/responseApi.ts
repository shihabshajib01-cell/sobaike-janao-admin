/**
 * Response API Service Layer
 * Abstracts REST/gRPC backend endpoints with mock fallback for development and preview.
 */

import { apiClient, ApiClient } from './apiClient';
import {
  ResponseItem,
  ResponseFilterState,
  ResponseListResponse,
  ResponseStatusFilter,
  ResponseTimelineEvent,
} from '@/types/Response';
import { responseFallback, ResponseWorkflowResult } from '@/services/fallback/responseFallback';

export class ResponseApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  /**
   * Get filtered and paginated responses list
   */
  async getResponses(
    filters: Partial<ResponseFilterState> = {},
    page = 1,
    limit = 10
  ): Promise<ResponseListResponse> {
    try {
      const response = await this.client.get<ResponseListResponse>('/responses', {
        params: {
          search: filters.search,
          status: filters.status,
          relatedType: filters.relatedType,
          authorRole: filters.authorRole,
          categoryId: filters.categoryId,
          page,
          limit,
        },
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return responseFallback.getResponses(filters, page, limit);
  }

  /**
   * Get single response by ID
   */
  async getResponseById(id: string): Promise<ResponseItem | null> {
    try {
      const response = await this.client.get<ResponseItem>(`/responses/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return responseFallback.getResponseById(id);
  }

  /**
   * Get response status metrics
   */
  async getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    try {
      const response = await this.client.get<Record<ResponseStatusFilter, number>>('/responses/stats');
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return responseFallback.getStatusCounts();
  }

  /**
   * Approve official response
   */
  async approveResponse(responseId: string, notes?: string): Promise<ResponseWorkflowResult> {
    try {
      const response = await this.client.post<ResponseWorkflowResult>(`/responses/${responseId}/approve`, {
        notes,
      });
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return responseFallback.approveResponse(responseId, notes);
  }

  /**
   * Publish response
   */
  async publishResponse(
    responseId: string,
    options?: { notes?: string }
  ): Promise<ResponseWorkflowResult> {
    try {
      const response = await this.client.post<ResponseWorkflowResult>(
        `/responses/${responseId}/publish`,
        options
      );
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return responseFallback.publishResponse(responseId, options);
  }

  /**
   * Unpublish response
   */
  async unpublishResponse(responseId: string, reason: string): Promise<ResponseWorkflowResult> {
    try {
      const response = await this.client.post<ResponseWorkflowResult>(
        `/responses/${responseId}/unpublish`,
        { reason }
      );
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
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
    try {
      const response = await this.client.post<ResponseWorkflowResult>(
        `/responses/${responseId}/reject`,
        { reason, explanation }
      );
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
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
    try {
      const response = await this.client.put<ResponseWorkflowResult>(
        `/responses/${responseId}/public-version`,
        { publicContentEn, publicContentBn }
      );
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return responseFallback.updatePublicVersion(
      responseId,
      publicContentEn,
      publicContentBn
    );
  }

  /**
   * Get audit timeline events for response
   */
  async getResponseTimeline(responseId: string): Promise<ResponseTimelineEvent[]> {
    try {
      const response = await this.client.get<ResponseTimelineEvent[]>(
        `/responses/${responseId}/timeline`
      );
      if (response.success && response.data) {
        return response.data;
      }
    } catch {
      // Graceful fallback
    }
    return responseFallback.getResponseTimeline(responseId);
  }
}

export const responseApi = new ResponseApi();
export default responseApi;
export { type ResponseWorkflowResult };

