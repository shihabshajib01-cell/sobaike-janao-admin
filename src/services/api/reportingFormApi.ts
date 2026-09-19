import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  ReportingFormBundle,
  ReportingFormField,
  ReportingFormSchema,
} from '@/types/ReportingForm';

const normalizeField = (raw: any): ReportingFormField => ({
  id: raw?.id || undefined,
  fieldKey: String(raw?.fieldKey || ''),
  fieldType: raw?.fieldType,
  storageMode: raw?.storageMode,
  storageKey: String(raw?.storageKey || raw?.fieldKey || ''),
  labelEn: String(raw?.labelEn || ''),
  labelBn: String(raw?.labelBn || ''),
  helperEn: raw?.helperEn || undefined,
  helperBn: raw?.helperBn || undefined,
  placeholderEn: raw?.placeholderEn || undefined,
  placeholderBn: raw?.placeholderBn || undefined,
  required: Boolean(raw?.required),
  active: raw?.active !== false,
  sortOrder: Number(raw?.sortOrder || 0),
  options: Array.isArray(raw?.options) ? raw.options : [],
  validation: raw?.validation && typeof raw.validation === 'object' ? raw.validation : {},
  config: raw?.config && typeof raw.config === 'object' ? raw.config : {},
});

export class ReportingFormApi {
  async getPublished(subcategoryId: string): Promise<ReportingFormBundle> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase reporting form service is not configured.');
    }

    const { data, error } = await supabase.rpc('get_public_reporting_configuration');
    if (error) {
      throw new Error(`Failed to load published form configuration: ${error.message}`);
    }

    const raw = (data || {}) as any;
    const form = Array.isArray(raw.forms)
      ? raw.forms.find((item: any) => String(item?.subcategoryId || '') === subcategoryId)
      : null;

    if (!form) return { schema: null, fields: [] };

    return {
      schema: {
        id: String(form.schemaId || ''),
        scopeType: 'subcategory',
        scopeId: subcategoryId,
        version: Number(form.version || 0),
        status: 'published',
        engineMode: form.engineMode === 'schema' ? 'schema' : 'legacy',
        publishedAt: form.publishedAt || null,
      },
      fields: Array.isArray(form.fields) ? form.fields.map(normalizeField) : [],
    };
  }

  async get(subcategoryId: string): Promise<ReportingFormBundle> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase reporting form service is not configured.');
    }

    const { data, error } = await supabase.rpc('admin_get_reporting_form', {
      p_subcategory_id: subcategoryId,
    });

    if (error) {
      throw new Error(`Failed to load form configuration: ${error.message}`);
    }

    const raw = (data || {}) as any;
    return {
      schema: raw.schema ? (raw.schema as ReportingFormSchema) : null,
      fields: Array.isArray(raw.fields) ? raw.fields.map(normalizeField) : [],
    };
  }

  async saveDraft(
    subcategoryId: string,
    fields: ReportingFormField[],
    notes?: string
  ): Promise<{ schemaId: string; version: number }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase reporting form service is not configured.');
    }

    const payload = fields.map((field, index) => ({
      fieldKey: field.fieldKey.trim(),
      fieldType: field.fieldType,
      storageMode: field.storageMode,
      storageKey: field.storageKey.trim() || field.fieldKey.trim(),
      labelEn: field.labelEn.trim(),
      labelBn: field.labelBn.trim(),
      helperEn: field.helperEn?.trim() || null,
      helperBn: field.helperBn?.trim() || null,
      placeholderEn: field.placeholderEn?.trim() || null,
      placeholderBn: field.placeholderBn?.trim() || null,
      required: Boolean(field.required),
      active: field.active !== false,
      sortOrder: index + 1,
      options: field.options || [],
      validation: field.validation || {},
      config: field.config || {},
    }));

    const { data, error } = await supabase.rpc('admin_save_reporting_form_draft', {
      p_subcategory_id: subcategoryId,
      p_fields: payload,
      p_notes: notes?.trim() || null,
    });

    if (error) {
      throw new Error(`Failed to save form draft: ${error.message}`);
    }

    return {
      schemaId: String((data as any)?.schemaId || ''),
      version: Number((data as any)?.version || 0),
    };
  }

  async publish(subcategoryId: string): Promise<{ version: number }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase reporting form service is not configured.');
    }

    const { data, error } = await supabase.rpc('admin_publish_reporting_form', {
      p_subcategory_id: subcategoryId,
    });

    if (error) {
      throw new Error(`Failed to publish form: ${error.message}`);
    }

    return {
      version: Number((data as any)?.version || 0),
    };
  }
}

export const reportingFormApi = new ReportingFormApi();
export default reportingFormApi;
