/**
 * Response API Service Layer
 * Authoritative integration with Supabase RPC for Response Read operations.
 */

import {
  ResponseItem,
  ResponseFilterState,
  ResponseListResponse,
  ResponseStatusFilter,
  ResponseModerationResult,
} from '@/types/Response';
import { supabaseResponseService } from './supabaseResponseService';
import { isSupabaseConfigured } from '@/lib/supabase';

export const RESPONSE_READ_CONNECTED = isSupabaseConfigured;
export const RESPONSE_MODERATION_CONNECTED = isSupabaseConfigured;

export class ResponseFeatureUnavailableError extends Error {
  code = 'FEATURE_NOT_CONNECTED';

  constructor(message = 'Response moderation is not connected in this phase.') {
    super(message);
    this.name = 'ResponseFeatureUnavailableError';
  }
}

export class ResponseConfigurationError extends Error {
  code = 'SUPABASE_NOT_CONFIGURED';

  constructor() {
    super('Supabase is not configured. Please check your Supabase environment variables.');
    this.name = 'ResponseConfigurationError';
  }
}

export class ResponseApi {
  /**
   * Get filtered and paginated responses list
   */
  async getResponses(
    filters: Partial<ResponseFilterState> = {},
    page = 1,
    limit = 20
  ): Promise<ResponseListResponse> {
    if (!RESPONSE_READ_CONNECTED) {
      throw new ResponseConfigurationError();
    }
    return supabaseResponseService.getResponses(filters, page, limit);
  }

  /**
   * Get single response by ID
   */
  async getResponseById(id: string): Promise<ResponseItem | null> {
    if (!RESPONSE_READ_CONNECTED) {
      throw new ResponseConfigurationError();
    }
    return supabaseResponseService.getResponseById(id);
  }

  /**
   * Get response status metrics
   */
  async getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    if (!RESPONSE_READ_CONNECTED) {
      throw new ResponseConfigurationError();
    }
    return supabaseResponseService.getStatusCounts();
  }

  /**
   * Publish response
   * Gated behind RESPONSE_MODERATION_CONNECTED.
   */
  async publishResponse(responseId: string): Promise<ResponseModerationResult> {
    if (!RESPONSE_MODERATION_CONNECTED) {
      throw new ResponseConfigurationError();
    }
    return supabaseResponseService.publishResponse(responseId);
  }

  /**
   * Reject response
   * Gated behind RESPONSE_MODERATION_CONNECTED.
   */
  async rejectResponse(responseId: string, note?: string): Promise<ResponseModerationResult> {
    if (!RESPONSE_MODERATION_CONNECTED) {
      throw new ResponseConfigurationError();
    }
    return supabaseResponseService.rejectResponse(responseId, note);
  }

  /**
   * Unpublish response
   * Gated behind RESPONSE_MODERATION_CONNECTED.
   */
  async unpublishResponse(responseId: string, reason?: string): Promise<ResponseModerationResult> {
    if (!RESPONSE_MODERATION_CONNECTED) {
      throw new ResponseConfigurationError();
    }
    return supabaseResponseService.unpublishResponse(responseId, reason);
  }
}

export const responseApi = new ResponseApi();
export default responseApi;
