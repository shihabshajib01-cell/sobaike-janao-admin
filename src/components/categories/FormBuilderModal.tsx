import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Lock, Plus, Save, Send, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { reportingFormApi } from '@/services/api/reportingFormApi';
import {
  ReportingFieldOption,
  ReportingFieldType,
  ReportingFormField,
  ReportingFormSchema,
} from '@/types/ReportingForm';

interface FormBuilderModalProps {
  isOpen: boolean;
  subcategoryId: string;
  subcategoryName: string;
  onClose: () => void;
  onPublished?: () => void;
}

const FIELD_TYPES: Array<{ value: ReportingFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'month', label: 'Month' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

const optionLines = (options: ReportingFieldOption[]) =>
  options.map((option) => `${option.value} | ${option.labelEn} | ${option.labelBn}`).join('\n');

const parseOptionLines = (value: string): ReportingFieldOption[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawValue, rawEn, rawBn] = line.split('|').map((part) => part?.trim() || '');
      return {
        value: rawValue,
        labelEn: rawEn || rawValue,
        labelBn: rawBn || rawEn || rawValue,
      };
    })
    .filter((option) => Boolean(option.value));

const newField = (index: number): ReportingFormField => ({
  fieldKey: `custom_field_${index + 1}`,
  fieldType: 'text',
  storageMode: 'custom_json',
  storageKey: `custom_field_${index + 1}`,
  labelEn: 'New field',
  labelBn: 'নতুন ফিল্ড',
  required: false,
  active: true,
  sortOrder: index + 1,
  options: [],
  validation: {},
  config: { publicVisible: true },
});

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  isOpen,
  subcategoryId,
  subcategoryName,
  onClose,
  onPublished,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [schema, setSchema] = useState<ReportingFormSchema | null>(null);
  const [fields, setFields] = useState<ReportingFormField[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await reportingFormApi.get(subcategoryId);
      setSchema(bundle.schema);
      setFields(bundle.fields);
      setNotes(bundle.schema?.notes || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load form configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, subcategoryId]);

  const normalizedFields = useMemo(
    () => fields.map((field, index) => ({ ...field, sortOrder: index + 1 })),
    [fields]
  );

  const updateField = (index: number, patch: Partial<ReportingFormField>) => {
    setFields((current) =>
      current.map((field, idx) => {
        if (idx !== index) return field;
        const next = { ...field, ...patch };
        if (patch.fieldKey && field.storageMode === 'custom_json' && field.storageKey === field.fieldKey) {
          next.storageKey = patch.fieldKey;
        }
        if (
          patch.fieldType &&
          patch.fieldType !== field.fieldType &&
          (patch.fieldType === 'phone' || patch.fieldType === 'email')
        ) {
          next.config = { ...field.config, ...patch.config, publicVisible: false };
        }
        return next;
      })
    );
    setSuccess(null);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => {
    const field = fields[index];
    if (field.config?.locked || field.storageMode === 'system_block') return;
    setFields((current) => current.filter((_, idx) => idx !== index));
  };

  const add = () => {
    setFields((current) => [...current, newField(current.length)]);
    setSuccess(null);
  };

  const validateClient = (): string | null => {
    if (fields.length === 0) return 'At least the protected Title and Description fields are required.';

    const keys = new Set<string>();
    for (const field of fields) {
      const key = field.fieldKey.trim();
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
        return `Invalid field key: ${key || '(empty)'}`;
      }
      if (keys.has(key)) return `Duplicate field key: ${key}`;
      keys.add(key);
      if (!field.labelEn.trim() || !field.labelBn.trim()) {
        return `Both labels are required for ${key}.`;
      }
      if (['select', 'radio', 'multiselect'].includes(field.fieldType) && field.options.length === 0) {
        return `Add at least one option for ${field.labelEn}.`;
      }
      if (
        (field.fieldType === 'phone' || field.fieldType === 'email') &&
        field.storageMode === 'custom_json' &&
        field.config?.publicVisible === true
      ) {
        return `${field.labelEn} contains sensitive contact information and cannot be public by default.`;
      }
    }

    const title = fields.find((field) => field.fieldKey === 'title');
    const description = fields.find((field) => field.fieldKey === 'description');
    if (!title?.active || !title.required || !description?.active || !description.required) {
      return 'Title and Description are protected required fields.';
    }
    return null;
  };

  const save = async () => {
    const problem = validateClient();
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await reportingFormApi.saveDraft(subcategoryId, normalizedFields, notes);
      setSuccess(
        isBn
          ? `Draft v${result.version} সংরক্ষিত হয়েছে।`
          : `Draft v${result.version} saved.`
      );
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to save form draft.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    const problem = validateClient();
    if (problem) {
      setError(problem);
      return;
    }

    setPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      await reportingFormApi.saveDraft(subcategoryId, normalizedFields, notes);
      const result = await reportingFormApi.publish(subcategoryId);
      setSuccess(
        isBn
          ? `Form v${result.version} প্রকাশিত হয়েছে।`
          : `Form v${result.version} published.`
      );
      await load();
      onPublished?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish form.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving || publishing ? () => {} : onClose}
      title={isBn ? 'ফর্ম বিল্ডার' : 'Form Builder'}
      description={`${subcategoryName} · ${subcategoryId}`}
      size="xl"
      closeOnBackdrop={!saving && !publishing}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={add} leftIcon={<Plus className="h-4 w-4" />}>
            {isBn ? 'ফিল্ড যোগ করুন' : 'Add field'}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={save}
              isLoading={saving}
              disabled={loading || publishing}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isBn ? 'Draft সংরক্ষণ' : 'Save Draft'}
            </Button>
            <Button
              variant="success"
              onClick={publish}
              isLoading={publishing}
              disabled={loading || saving}
              leftIcon={<Send className="h-4 w-4" />}
            >
              {isBn ? 'Form প্রকাশ করুন' : 'Publish Form'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {schema
                ? `${schema.status.toUpperCase()} · v${schema.version} · ${schema.engineMode}`
                : isBn
                  ? 'নতুন Schema'
                  : 'New schema'}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {isBn
                ? 'Title, Description ও system block নিরাপত্তার জন্য লক করা আছে; এগুলোর ক্রম পরিবর্তন করা যায়।'
                : 'Title, Description, and system blocks are protected; their order can still be changed.'}
            </span>
          </div>
        </div>

        <Textarea
          id="form-builder-notes"
          label={isBn ? 'পরিবর্তনের নোট' : 'Change notes'}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          disabled={loading || saving || publishing}
        />

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {isBn ? 'ফর্ম লোড হচ্ছে…' : 'Loading form…'}
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => {
              const locked =
                Boolean(field.config?.locked) || field.storageMode === 'system_block';
              const hasOptions = ['select', 'radio', 'multiselect'].includes(field.fieldType);
              const publicVisible = field.config?.publicVisible !== false;

              return (
                <div
                  key={field.id || `${field.fieldKey}-${index}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        #{index + 1}
                      </span>
                      <code className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {field.fieldKey}
                      </code>
                      {locked && <Lock className="h-3.5 w-3.5 text-slate-400" aria-label="Protected field" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label="Move field up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => move(index, 1)}
                        disabled={index === fields.length - 1}
                        aria-label="Move field down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      {!locked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          aria-label="Remove field"
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label={isBn ? 'ফিল্ড কী' : 'Field key'}
                      value={field.fieldKey}
                      onChange={(event) =>
                        updateField(index, {
                          fieldKey: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                        })
                      }
                      disabled={locked}
                    />
                    <Select
                      label={isBn ? 'ফিল্ড টাইপ' : 'Field type'}
                      value={field.fieldType}
                      onChange={(event) =>
                        updateField(index, { fieldType: event.target.value as ReportingFieldType })
                      }
                      disabled={field.storageMode === 'system_block' || locked}
                      options={FIELD_TYPES}
                    />
                    <Input
                      label={isBn ? 'ইংরেজি লেবেল' : 'Label (English)'}
                      value={field.labelEn}
                      onChange={(event) => updateField(index, { labelEn: event.target.value })}
                    />
                    <Input
                      label={isBn ? 'বাংলা লেবেল' : 'Label (Bangla)'}
                      value={field.labelBn}
                      onChange={(event) => updateField(index, { labelBn: event.target.value })}
                    />
                    <Input
                      label={isBn ? 'ইংরেজি হেল্পার' : 'Helper (English)'}
                      value={field.helperEn || ''}
                      onChange={(event) => updateField(index, { helperEn: event.target.value })}
                    />
                    <Input
                      label={isBn ? 'বাংলা হেল্পার' : 'Helper (Bangla)'}
                      value={field.helperBn || ''}
                      onChange={(event) => updateField(index, { helperBn: event.target.value })}
                    />
                  </div>

                  {hasOptions && (
                    <Textarea
                      className="mt-3"
                      label={
                        isBn
                          ? 'অপশন: value | English | বাংলা — প্রতি লাইনে একটি'
                          : 'Options: value | English | Bangla — one per line'
                      }
                      value={optionLines(field.options)}
                      onChange={(event) =>
                        updateField(index, { options: parseOptionLines(event.target.value) })
                      }
                      rows={4}
                    />
                  )}

                  {['text', 'textarea', 'number', 'currency'].includes(field.fieldType) && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {(field.fieldType === 'text' || field.fieldType === 'textarea') && (
                        <Input
                          type="number"
                          min="1"
                          label={isBn ? 'সর্বোচ্চ অক্ষর' : 'Max length'}
                          value={String((field.validation as any)?.maxLength || '')}
                          onChange={(event) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                maxLength: event.target.value ? Number(event.target.value) : undefined,
                              },
                            })
                          }
                        />
                      )}
                      {(field.fieldType === 'number' || field.fieldType === 'currency') && (
                        <>
                          <Input
                            type="number"
                            label={isBn ? 'সর্বনিম্ন' : 'Minimum'}
                            value={String((field.validation as any)?.min ?? '')}
                            onChange={(event) =>
                              updateField(index, {
                                validation: {
                                  ...field.validation,
                                  min: event.target.value ? Number(event.target.value) : undefined,
                                },
                              })
                            }
                          />
                          <Input
                            type="number"
                            label={isBn ? 'সর্বোচ্চ' : 'Maximum'}
                            value={String((field.validation as any)?.max ?? '')}
                            onChange={(event) =>
                              updateField(index, {
                                validation: {
                                  ...field.validation,
                                  max: event.target.value ? Number(event.target.value) : undefined,
                                },
                              })
                            }
                          />
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
                    <Switch
                      checked={field.required}
                      onChange={(checked) => updateField(index, { required: checked })}
                      disabled={locked}
                      label={isBn ? 'আবশ্যক' : 'Required'}
                    />
                    <Switch
                      checked={field.active}
                      onChange={(checked) => updateField(index, { active: checked })}
                      disabled={locked}
                      label={isBn ? 'ফর্মে দেখান' : 'Show in form'}
                    />
                    {field.storageMode === 'custom_json' && (
                      <Switch
                        checked={publicVisible}
                        onChange={(checked) =>
                          updateField(index, {
                            config: { ...field.config, publicVisible: checked },
                          })
                        }
                        label={isBn ? 'প্রকাশিত রিপোর্টে দেখান' : 'Show on published report'}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            {success}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FormBuilderModal;
