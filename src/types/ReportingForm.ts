export type ReportingFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'time'
  | 'month'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'phone'
  | 'email'
  | 'url'
  | 'location'
  | 'subject_party'
  | 'evidence'
  | 'privacy'
  | 'mob_justice_details';

export type ReportingStorageMode = 'core_column' | 'custom_json' | 'system_block';
export type ReportingSchemaStatus = 'draft' | 'published' | 'archived';
export type ReportingEngineMode = 'legacy' | 'schema';

export interface ReportingFieldOption {
  value: string;
  labelEn: string;
  labelBn: string;
}

export interface ReportingFormField {
  id?: string;
  fieldKey: string;
  fieldType: ReportingFieldType;
  storageMode: ReportingStorageMode;
  storageKey: string;
  labelEn: string;
  labelBn: string;
  helperEn?: string;
  helperBn?: string;
  placeholderEn?: string;
  placeholderBn?: string;
  required: boolean;
  active: boolean;
  sortOrder: number;
  options: ReportingFieldOption[];
  validation: Record<string, unknown>;
  config: Record<string, unknown>;
}

export interface ReportingFormSchema {
  id: string;
  scopeType: 'subcategory';
  scopeId: string;
  version: number;
  status: ReportingSchemaStatus;
  engineMode: ReportingEngineMode;
  notes?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
}

export interface ReportingFormBundle {
  schema: ReportingFormSchema | null;
  fields: ReportingFormField[];
}
