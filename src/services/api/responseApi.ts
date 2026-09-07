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

const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

export const RESPONSE_READ_CONNECTED = isSupabaseConfigured || isDev;
export const RESPONSE_MODERATION_CONNECTED = isSupabaseConfigured || isDev;
export const RESPONSE_RESUBMIT_CONNECTED = isSupabaseConfigured || isDev;

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

// Dev fallback in-memory data adhering to canonical database schema
const DEV_FALLBACK_RESPONSES: ResponseItem[] = [
  {
    id: 'res-0001-dev-mock-uuid',
    complaintId: 'CMP-2026-0001',
    responseType: 'subject_response',
    status: 'pending_review',
    content: 'We have dispatched our emergency engineering unit to Mirpur-10 to repair the drainage system and seal open manholes. Heavy equipment is on site.',
    incidentDate: '2026-09-02',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    publishedAt: null,
    contactConsent: true,
    responderType: 'organization_rep',
    responderName: 'Mohammad Rafiqul Islam',
    designation: 'Executive Engineer',
    organizationName: 'Dhaka North City Corporation (DNCC)',
    officialStatement: 'DNCC Zone 4 maintenance division has prioritized this complaint for urgent resolution.',
    supportingDocumentsNote: 'Work order memo #DNCC-ENG-491 attached.',
    requestCorrectionOrRemoval: false,
    correctionDetails: null,
    complaint: {
      id: 'CMP-2026-0001',
      title: 'Severe Waterlogging and Broken Manhole in Mirpur-10',
      segmentId: 'roads_traffic',
      segmentNameEn: 'Roads & Traffic Hazards',
      segmentNameBn: 'রাস্তাঘাট ও ট্রাফিক ঝুঁকি',
      district: 'Dhaka',
      status: 'published',
    },
  },
  {
    id: 'res-0002-dev-mock-uuid',
    complaintId: 'CMP-2026-0002',
    responseType: 'citizen_information',
    status: 'published',
    content: 'The unauthorized waste dumping has been cleared by local volunteers today. Traffic flow is now restored to normal conditions.',
    incidentDate: '2026-09-01',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    contactConsent: true,
    responderType: null,
    responderName: 'Sadia Rahman',
    designation: null,
    organizationName: null,
    officialStatement: null,
    supportingDocumentsNote: null,
    requestCorrectionOrRemoval: false,
    correctionDetails: null,
    complaint: {
      id: 'CMP-2026-0002',
      title: 'Illegal Waste Dumping near Kazir Dewri',
      segmentId: 'waste_management',
      segmentNameEn: 'Waste Management',
      segmentNameBn: 'বর্জ্য ব্যবস্থাপনা',
      district: 'Chattogram',
      status: 'published',
    },
  },
  {
    id: 'res-0003-dev-mock-uuid',
    complaintId: 'CMP-2026-0003',
    responseType: 'subject_response',
    status: 'rejected',
    content: 'The vendor in question has legitimate city trade authorization and does not block the pedestrian walkway.',
    incidentDate: '2026-09-03',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    publishedAt: null,
    contactConsent: false,
    responderType: 'mentioned_person',
    responderName: 'Abul Kashem',
    designation: 'Market Representative',
    organizationName: 'New Market Business Association',
    officialStatement: null,
    supportingDocumentsNote: null,
    requestCorrectionOrRemoval: true,
    correctionDetails: 'Please verify the license documents provided.',
    complaint: {
      id: 'CMP-2026-0003',
      title: 'Illegal Footpath Extortion at New Market',
      segmentId: 'harassment',
      segmentNameEn: 'Harassment & Violence',
      segmentNameBn: 'যৌন হয়রানি ও সহিংসতা',
      district: 'Dhaka',
      status: 'submitted',
    },
  },
];

let fallbackResponses = [...DEV_FALLBACK_RESPONSES];

export class ResponseApi {
  /**
   * Get filtered and paginated responses list
   */
  async getResponses(
    filters: Partial<ResponseFilterState> = {},
    page = 1,
    limit = 20
  ): Promise<ResponseListResponse> {
    if (isSupabaseConfigured) {
      return supabaseResponseService.getResponses(filters, page, limit);
    }
    if (isDev) {
      let filtered = [...fallbackResponses];

      if (filters.search) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.content.toLowerCase().includes(query) ||
            r.responderName?.toLowerCase().includes(query) ||
            r.organizationName?.toLowerCase().includes(query) ||
            r.complaint.title.toLowerCase().includes(query)
        );
      }

      if (filters.status && filters.status !== 'all') {
        filtered = filtered.filter((r) => r.status === filters.status);
      }

      if (filters.responseType && filters.responseType !== 'all') {
        filtered = filtered.filter((r) => r.responseType === filters.responseType);
      }

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);

      const statusCounts = {
        all: fallbackResponses.length,
        pending_review: fallbackResponses.filter((r) => r.status === 'pending_review').length,
        published: fallbackResponses.filter((r) => r.status === 'published').length,
        rejected: fallbackResponses.filter((r) => r.status === 'rejected').length,
        unpublished: fallbackResponses.filter((r) => r.status === 'unpublished').length,
      };

      return {
        responses: paginated,
        total,
        page,
        limit,
        totalPages,
        statusCounts,
      };
    }
    throw new ResponseConfigurationError();
  }

  /**
   * Get single response by ID
   */
  async getResponseById(id: string): Promise<ResponseItem | null> {
    if (isSupabaseConfigured) {
      return supabaseResponseService.getResponseById(id);
    }
    if (isDev) {
      return fallbackResponses.find((r) => r.id === id) || null;
    }
    throw new ResponseConfigurationError();
  }

  /**
   * Get response status metrics
   */
  async getStatusCounts(): Promise<Record<ResponseStatusFilter, number>> {
    if (isSupabaseConfigured) {
      return supabaseResponseService.getStatusCounts();
    }
    if (isDev) {
      return {
        all: fallbackResponses.length,
        pending_review: fallbackResponses.filter((r) => r.status === 'pending_review').length,
        published: fallbackResponses.filter((r) => r.status === 'published').length,
        rejected: fallbackResponses.filter((r) => r.status === 'rejected').length,
        unpublished: fallbackResponses.filter((r) => r.status === 'unpublished').length,
      };
    }
    throw new ResponseConfigurationError();
  }

  /**
   * Publish response
   */
  async publishResponse(responseId: string): Promise<ResponseModerationResult> {
    if (isSupabaseConfigured) {
      return supabaseResponseService.publishResponse(responseId);
    }
    if (isDev) {
      const idx = fallbackResponses.findIndex((r) => r.id === responseId);
      if (idx !== -1) {
        const prev = fallbackResponses[idx].status;
        fallbackResponses[idx] = {
          ...fallbackResponses[idx],
          status: 'published',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return {
          success: true,
          responseId,
          previousStatus: prev,
          status: 'published',
          publishedAt: fallbackResponses[idx].publishedAt,
          updatedAt: fallbackResponses[idx].updatedAt,
        };
      }
      throw new Error('Response not found');
    }
    throw new ResponseConfigurationError();
  }

  /**
   * Reject response
   */
  async rejectResponse(responseId: string, note?: string): Promise<ResponseModerationResult> {
    if (isSupabaseConfigured) {
      return supabaseResponseService.rejectResponse(responseId, note);
    }
    if (isDev) {
      const idx = fallbackResponses.findIndex((r) => r.id === responseId);
      if (idx !== -1) {
        const prev = fallbackResponses[idx].status;
        fallbackResponses[idx] = {
          ...fallbackResponses[idx],
          status: 'rejected',
          updatedAt: new Date().toISOString(),
        };
        return {
          success: true,
          responseId,
          previousStatus: prev,
          status: 'rejected',
          updatedAt: fallbackResponses[idx].updatedAt,
        };
      }
      throw new Error('Response not found');
    }
    throw new ResponseConfigurationError();
  }

  /**
   * Unpublish response
   */
  async unpublishResponse(responseId: string, reason?: string): Promise<ResponseModerationResult> {
    if (isSupabaseConfigured) {
      return supabaseResponseService.unpublishResponse(responseId, reason);
    }
    if (isDev) {
      const idx = fallbackResponses.findIndex((r) => r.id === responseId);
      if (idx !== -1) {
        const prev = fallbackResponses[idx].status;
        fallbackResponses[idx] = {
          ...fallbackResponses[idx],
          status: 'unpublished',
          updatedAt: new Date().toISOString(),
        };
        return {
          success: true,
          responseId,
          previousStatus: prev,
          status: 'unpublished',
          updatedAt: fallbackResponses[idx].updatedAt,
        };
      }
      throw new Error('Response not found');
    }
    throw new ResponseConfigurationError();
  }

  /**
   * Resubmit response
   */
  async resubmitResponse(responseId: string): Promise<ResponseModerationResult> {
    if (isSupabaseConfigured) {
      return supabaseResponseService.resubmitResponse(responseId);
    }
    if (isDev) {
      const idx = fallbackResponses.findIndex((r) => r.id === responseId);
      if (idx !== -1) {
        const prev = fallbackResponses[idx].status;
        fallbackResponses[idx] = {
          ...fallbackResponses[idx],
          status: 'pending_review',
          updatedAt: new Date().toISOString(),
        };
        return {
          success: true,
          responseId,
          previousStatus: prev,
          status: 'pending_review',
          updatedAt: fallbackResponses[idx].updatedAt,
        };
      }
      throw new Error('Response not found');
    }
    throw new ResponseFeatureUnavailableError('Response resubmit is not connected yet.');
  }
}

export const responseApi = new ResponseApi();
export default responseApi;
