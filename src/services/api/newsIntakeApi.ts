import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  NewsIntakeAutomationConfig,
  NewsIntakeAutomationDashboard,
  NewsIntakeAutomationScanResult,
  NewsIntakeReviewCompletionResult,
  NewsIntakeCreateResult,
  NewsIntakeMergeResult,
  NewsIntakePayload,
  NewsIntakePreview,
  NewsIntakeTaxonomy,
  NewsIntakeLocationTaxonomy,
  NewsSourceMetadata,
} from '@/types/NewsIntake';

const assertConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase News Intake service is not configured.');
  }
};

export class NewsIntakeApi {
  async fetchSourceMetadata(url: string): Promise<NewsSourceMetadata> {
    assertConfigured();

    const cleanUrl = url.trim();
    if (!cleanUrl) throw new Error('Source URL is required.');

    const { data, error } = await supabase.functions.invoke('news-intake-fetch', {
      body: { url: cleanUrl },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch article metadata.');
    }

    if (!data || data.error) {
      throw new Error(data?.error || 'Failed to fetch article metadata.');
    }

    return {
      sourceType: (data.sourceType || 'news') as NewsSourceMetadata['sourceType'],
      publisherName: String(data.publisherName || ''),
      sourceTitle: String(data.sourceTitle || ''),
      canonicalUrl: String(data.canonicalUrl || cleanUrl),
      sourcePublishedDate: data.sourcePublishedDate
        ? String(data.sourcePublishedDate)
        : '',
      descriptionPreview: data.descriptionPreview
        ? String(data.descriptionPreview)
        : undefined,
      hostname: String(data.hostname || ''),
      approved: Boolean(data.approved),
    };
  }

  async getAutomationDashboard(): Promise<NewsIntakeAutomationDashboard> {
    assertConfigured();

    const { data, error } = await supabase.rpc(
      'admin_get_news_intake_automation_dashboard'
    );
    if (error) {
      throw new Error(error.message || 'Failed to load News Automation status.');
    }

    const raw = (data || {}) as NewsIntakeAutomationDashboard;
    return {
      sources: Array.isArray(raw.sources) ? raw.sources : [],
      runs: Array.isArray(raw.runs) ? raw.runs : [],
      automation:
        raw.automation && typeof raw.automation === 'object'
          ? raw.automation
          : {
              enabled: false,
              intervalHours: 36,
              lastAutoDispatchedAt: null,
              nextAutoDueAt: null,
              running: false,
            },
    };
  }

  async setAutoUpdate(enabled: boolean): Promise<NewsIntakeAutomationConfig> {
    assertConfigured();

    const { data, error } = await supabase.rpc(
      'admin_set_news_intake_auto_update',
      { p_enabled: enabled }
    );
    if (error) {
      throw new Error(error.message || 'Failed to update News Automation schedule.');
    }

    const raw = (data || {}) as Partial<NewsIntakeAutomationConfig>;
    return {
      enabled: Boolean(raw.enabled),
      intervalHours: 36,
      lastAutoDispatchedAt: raw.lastAutoDispatchedAt || null,
      nextAutoDueAt: raw.nextAutoDueAt || null,
      running: false,
    };
  }

  async scanSources(): Promise<NewsIntakeAutomationScanResult> {
    assertConfigured();

    const { data, error } = await supabase.functions.invoke('news-intake-scan', {
      body: {},
    });

    if (error) {
      throw new Error(error.message || 'Failed to scan news sources.');
    }
    if (!data || data.error) {
      throw new Error(data?.error || 'Failed to scan news sources.');
    }

    return data as NewsIntakeAutomationScanResult;
  }

  async completeItemReview(
    itemId: string,
    reportId: string
  ): Promise<NewsIntakeReviewCompletionResult> {
    assertConfigured();

    const { data, error } = await supabase.rpc(
      'admin_complete_news_intake_item_review',
      {
        p_item_id: itemId,
        p_report_id: reportId,
      }
    );

    if (error) {
      throw new Error(error.message || 'Failed to complete News Intake review.');
    }

    const raw = (data || {}) as any;
    return {
      success: Boolean(raw.success),
      itemId: String(raw.itemId || itemId),
      reportId: String(raw.reportId || reportId),
      action: String(raw.action || 'needs_review') as NewsIntakeReviewCompletionResult['action'],
      duplicateStatus:
        raw.duplicateStatus === null || raw.duplicateStatus === undefined
          ? null
          : String(raw.duplicateStatus) as NewsIntakeReviewCompletionResult['duplicateStatus'],
      ready: Boolean(raw.ready),
    };
  }

  async getLocationTaxonomy(): Promise<NewsIntakeLocationTaxonomy> {
    assertConfigured();

    const { data, error } = await supabase.rpc('admin_get_location_taxonomy');
    if (error) {
      throw new Error(error.message || 'Failed to load canonical location taxonomy.');
    }

    const raw = (data || {}) as any;
    return {
      divisions: Array.isArray(raw.divisions) ? raw.divisions : [],
      districts: Array.isArray(raw.districts) ? raw.districts : [],
      upazilas: Array.isArray(raw.upazilas) ? raw.upazilas : [],
    };
  }

  async getTaxonomy(): Promise<NewsIntakeTaxonomy> {
    assertConfigured();

    const { data, error } = await supabase.rpc('admin_get_news_intake_taxonomy');
    if (error) {
      throw new Error(error.message || 'Failed to load News Intake taxonomy.');
    }

    const raw = (data || {}) as any;
    return {
      segments: Array.isArray(raw.segments)
        ? raw.segments.map((item: any) => ({
            id: String(item.id || ''),
            nameEn: String(item.nameEn || item.id || ''),
            nameBn: String(item.nameBn || item.nameEn || item.id || ''),
            order: Number(item.order || 0),
          }))
        : [],
      subcategories: Array.isArray(raw.subcategories)
        ? raw.subcategories.map((item: any) => ({
            id: String(item.id || ''),
            segmentId: String(item.segmentId || ''),
            nameEn: String(item.nameEn || item.id || ''),
            nameBn: String(item.nameBn || item.nameEn || item.id || ''),
            order: Number(item.order || 0),
            isSensitive: Boolean(item.isSensitive),
          }))
        : [],
    };
  }

  async preview(payload: NewsIntakePayload): Promise<NewsIntakePreview> {
    assertConfigured();

    const { data, error } = await supabase.rpc('admin_preview_sourced_report_intake', {
      p_payload: payload,
    });

    if (error) {
      throw new Error(error.message || 'Failed to check source and incident duplication.');
    }

    return data as NewsIntakePreview;
  }

  async publishTrustedCandidate(payload: NewsIntakePayload): Promise<{
    success: boolean;
    action: string;
    reportId: string;
    status: string;
    published: boolean;
    duplicateStatus?: string | null;
  }> {
    assertConfigured();

    const { data, error } = await supabase.rpc(
      'process_trusted_news_intake_candidate',
      { p_payload: payload }
    );

    if (error) {
      throw new Error(error.message || 'Failed to publish approved-source report.');
    }

    const raw = (data || {}) as any;
    return {
      success: Boolean(raw.success),
      action: String(raw.action || ''),
      reportId: String(raw.reportId || ''),
      status: String(raw.status || ''),
      published: Boolean(raw.published),
      duplicateStatus:
        raw.duplicateStatus === null || raw.duplicateStatus === undefined
          ? null
          : String(raw.duplicateStatus),
    };
  }

  async createDraft(payload: NewsIntakePayload): Promise<NewsIntakeCreateResult> {
    assertConfigured();

    const { data, error } = await supabase.rpc('admin_create_sourced_report_from_intake', {
      p_payload: payload,
    });

    if (error) {
      throw new Error(error.message || 'Failed to create sourced-report draft.');
    }

    return data as NewsIntakeCreateResult;
  }

  async mergeSource(
    complaintId: string,
    source: NewsIntakePayload['source']
  ): Promise<NewsIntakeMergeResult> {
    assertConfigured();

    const { data, error } = await supabase.rpc('admin_merge_intake_source', {
      p_complaint_id: complaintId,
      p_source: source,
    });

    if (error) {
      throw new Error(error.message || 'Failed to merge source into existing report.');
    }

    return data as NewsIntakeMergeResult;
  }
}

export const newsIntakeApi = new NewsIntakeApi();
export default newsIntakeApi;
