/**
 * Supabase Response Service
 * Authoritative RPC caller for administrative Response read operations.
 * Exclusively calls security definer RPCs admin_get_responses and admin_get_response_detail.
 * Never performs direct SELECT queries against public.complaint_responses.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  ResponseItem,
  ResponseFilterState,
  ResponseListResponse,
  ResponseStatusFilter,
  ResponseType,
  ResponseStatus,
} from '@/types/Response';

export interface RawComplaintSummary {
  id: string;
  title: string;
  segment_id?: string | null;
  segment_name_en?: string | null;
  segment_name_bn?: string | null;
  district?: string | null;
  status?: string | null;
}

export interface RawResponseRow {
  id: string;
  complaint_id: string;
  response_type: ResponseType;
  status: ResponseStatus;
  content: string;
  incident_date?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  contact_consent: boolean;
  responder_type?: 'mentioned_person' | 'organization_rep' | 'legal_rep' | null;
  responder_name?: string | null;
  designation?: string | null;
  organization_name?: string | null;
  official_statement?: string | null;
  supporting_documents_note?: string | null;
  request_correction_or_removal: boolean;
  correction_details?: string | null;
  complaint?: RawComplaintSummary | null;
}

export interface RawAdminGetResponsesResult {
  responses: RawResponseRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: {
    all: number;
    pending_review: number;
    published: number;
    rejected: number;
    unpublished: number;
  };
}

/**
 * Maps raw backend response JSON into the authoritative ResponseItem type.
 */
export function mapResponseRow(raw: RawResponseRow): ResponseItem {
  return {
    id: raw.id,
    complaintId: raw.complaint_id,
    responseType: raw.response_type,
    status: raw.status,
    content: raw.content || '',
    incidentDate: raw.incident_date || null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    publishedAt: raw.published_at || null,
    contactConsent: Boolean(raw.contact_consent),
    responderType: raw.responder_type || null,
    responderName: raw.responder_name || null,
    designation: raw.designation || null,
    organizationName: raw.organization_name || null,
    officialStatement: raw.official_statement || null,
    supportingDocumentsNote: raw.supporting_documents_note || null,
    requestCorrectionOrRemoval: Boolean(raw.request_correction_or_removal),
    correctionDetails: raw.correction_details || null,
    complaint: {
      id: raw.complaint?.id || raw.complaint_id,
      title: raw.complaint?.title || '',
      segmentId: raw.complaint?.segment_id || null,
      segmentNameEn: raw.complaint?.segment_name_en || null,
      segmentNameBn: raw.complaint?.segment_name_bn || null,
      district: raw.complaint?.district || null,
      status: raw.complaint?.status || null,
    },
  };
}

export class SupabaseResponseService {
  /**
   * Fetches paginated responses using admin_get_responses RPC
   */
  async getResponses(
    filters: Partial<ResponseFilterState> = {},
    page = 1,
    limit = 20
  ): Promise<ResponseListResponse> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }

    const trimmedSearch = filters.search?.trim();
    const pSearch = trimmedSearch && trimmedSearch.length > 0 ? trimmedSearch : null;

    const pStatus =
      filters.status && filters.status !== 'all' ? filters.status : null;

    const pResponseType =
      filters.responseType && filters.responseType !== 'all'
        ? filters.responseType
        : null;

    const pStartDate = filters.dateRange?.startDate || null;
    const pEndDate = filters.dateRange?.endDate || null;

    const { data, error } = await supabase.rpc('admin_get_responses', {
      p_search: pSearch,
      p_status: pStatus,
      p_response_type: pResponseType,
      p_start_date: pStartDate,
      p_end_date: pEndDate,
      p_page: page,
      p_limit: limit,
    });

    if (error) {
      throw new Error(`Failed to fetch responses: ${error.message}`);
    }

    const result = data as RawAdminGetResponsesResult;
    if (!result) {
      return {
        responses: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
        statusCounts: {
          all: 0,
          pending_review: 0,
          published: 0,
          rejected: 0,
          unpublished: 0,
        },
      };
    }

    const mappedResponses = Array.isArray(result.responses)
      ? result.responses.map(mapResponseRow)
      : [];

    return {
      responses: mappedResponses,
      total: result.total || 0,
      page: result.page || page,
      limit: result.limit || limit,
      totalPages: result.totalPages || 1,
      statusCounts: result.statusCounts || {
        all: 0,
        pending_review: 0,
        published: 0,
        rejected: 0,
        unpublished: 0,
      },
    };
  }

  /**
   * Fetches a single response by ID using admin_get_response_detail RPC
   */
  async getResponseById(id: string): Promise<ResponseItem | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }

    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error('Response ID cannot be empty.');
    }

    const { data, error } = await supabase.rpc('admin_get_response_detail', {
      p_response_id: trimmedId,
    });

    if (error) {
      // If PostgreSQL returned not found (P0002)
      if (error.code === 'P0002' || error.message?.includes('not found')) {
        return null;
      }
      throw new Error(`Failed to fetch response details: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapResponseRow(data as RawResponseRow);
  }

  /**
   * Fetches current counts for each status tab
   */
  async getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    const res = await this.getResponses({}, 1, 1);
    return res.statusCounts;
  }
}

export const supabaseResponseService = new SupabaseResponseService();
export default supabaseResponseService;
