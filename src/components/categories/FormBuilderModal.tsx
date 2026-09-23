import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Lock,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button, IconButton } from '@/components/ui/Button';
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

interface FormBuilderBaseProps {
  subcategoryId: string;
  subcategoryName: string;
  onPublished?: () => void;
}

interface FormBuilderPanelProps extends FormBuilderBaseProps {
  showInlineActions?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

interface FormBuilderModalProps extends FormBuilderBaseProps {
  isOpen: boolean;
  onClose: () => void;
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

const SYSTEM_FIELD_TYPES: Array<{ value: ReportingFieldType; label: string }> = [
  ...FIELD_TYPES,
  { value: 'location', label: 'Location' },
  { value: 'subject_party', label: 'Subject / party' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'mob_justice_details', label: 'Mob justice details' },
];

const CORE_TEXT_TYPES = FIELD_TYPES.filter(
  (option) => option.value === 'text' || option.value === 'textarea'
);

const optionLines = (options: ReportingFieldOption[]) =>
  options
    .map((option) => `${option.value} | ${option.labelEn} | ${option.labelBn}`)
    .join('\n');

const parseOptionLines = (value: string): ReportingFieldOption[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawValue, rawEn, rawBn] = line
        .split('|')
        .map((part) => part?.trim() || '');
      return {
        value: rawValue,
        labelEn: rawEn,
        labelBn: rawBn,
      };
    });

const normalizeKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 54);

const nextUniqueKey = (label: string, fields: ReportingFormField[]): string => {
  const normalized = normalizeKey(label) || 'field';
  const prefix = normalized.startsWith('custom_') ? normalized : `custom_${normalized}`;
  const existing = new Set(fields.map((field) => field.fieldKey));
  if (!existing.has(prefix)) return prefix;

  let suffix = 2;
  while (existing.has(`${prefix}_${suffix}`)) suffix += 1;
  return `${prefix}_${suffix}`;
};

const makeCustomField = (
  fieldKey: string,
  labelEn: string,
  labelBn: string,
  fieldType: ReportingFieldType,
  index: number
): ReportingFormField => ({
  fieldKey,
  fieldType,
  storageMode: 'custom_json',
  storageKey: fieldKey,
  labelEn,
  labelBn,
  required: false,
  active: true,
  sortOrder: index + 1,
  options: [],
  validation: {},
  config: {
    publicVisible: fieldType !== 'phone' && fieldType !== 'email',
  },
});

const isProtectedCoreField = (field: ReportingFormField): boolean =>
  field.storageMode === 'core_column' &&
  (field.storageKey === 'title' || field.storageKey === 'description');

const platformMaxFor = (field: ReportingFormField): number | null => {
  if (field.storageMode !== 'core_column') return null;
  if (field.storageKey === 'title') return 100;
  if (field.storageKey === 'description') return 2000;
  return null;
};

export const FormBuilderPanel: React.FC<FormBuilderPanelProps> = ({
  subcategoryId,
  subcategoryName,
  onPublished,
  showInlineActions = true,
  onBusyChange,
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

  const [isAddingField, setIsAddingField] = useState(false);
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameBn, setNewNameBn] = useState('');
  const [newFieldType, setNewFieldType] = useState<ReportingFieldType>('text');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [fieldKeyTouched, setFieldKeyTouched] = useState(false);
  const [newFieldError, setNewFieldError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await reportingFormApi.get(subcategoryId);
      setSchema(bundle.schema);
      setFields(bundle.fields);
      setNotes(bundle.schema?.notes || '');
    } catch (err: any) {
      setError(
        isBn
          ? 'ফর্ম কনফিগারেশন লোড করা যায়নি। আবার চেষ্টা করুন।'
          : err?.message || 'Failed to load form configuration.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [subcategoryId]);

  const normalizedFields = useMemo(
    () => fields.map((field, index) => ({ ...field, sortOrder: index + 1 })),
    [fields]
  );

  const busy = loading || saving || publishing;

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  const updateField = (index: number, patch: Partial<ReportingFormField>) => {
    setFields((current) =>
      current.map((field, idx) => {
        if (idx !== index) return field;

        const next = { ...field, ...patch };
        if (
          patch.fieldKey &&
          field.storageMode === 'custom_json' &&
          field.storageKey === field.fieldKey
        ) {
          next.storageKey = patch.fieldKey;
        }

        if (
          patch.fieldType &&
          patch.fieldType !== field.fieldType &&
          (patch.fieldType === 'phone' || patch.fieldType === 'email')
        ) {
          next.config = {
            ...field.config,
            ...patch.config,
            publicVisible: false,
          };
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
    setSuccess(null);
  };

  const remove = (index: number) => {
    const field = fields[index];
    if (
      field.storageMode === 'system_block' ||
      isProtectedCoreField(field) ||
      field.config?.locked
    ) {
      return;
    }
    setFields((current) => current.filter((_, idx) => idx !== index));
    setSuccess(null);
  };

  const openAddField = () => {
    setIsAddingField(true);
    setNewNameEn('');
    setNewNameBn('');
    setNewFieldType('text');
    setNewFieldKey('');
    setFieldKeyTouched(false);
    setNewFieldError(null);
  };

  const cancelAddField = () => {
    setIsAddingField(false);
    setNewFieldError(null);
  };

  const handleNewNameEn = (value: string) => {
    setNewNameEn(value);
    if (!fieldKeyTouched) {
      setNewFieldKey(nextUniqueKey(value, fields));
    }
  };

  const confirmAddField = () => {
    const labelEn = newNameEn.trim();
    const labelBn = newNameBn.trim();
    const key = newFieldKey.trim().toLowerCase();

    if (!labelEn || !labelBn) {
      setNewFieldError(
        isBn
          ? 'কাস্টম ফিল্ডের ইংরেজি ও বাংলা—দুইটি নাম দিন।'
          : 'Enter both English and Bangla names for the custom field.'
      );
      return;
    }

    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
      setNewFieldError(
        isBn
          ? 'ফিল্ড কী ছোট হাতের ইংরেজি অক্ষর দিয়ে শুরু হবে এবং শুধু অক্ষর, সংখ্যা ও আন্ডারস্কোর ব্যবহার করবে।'
          : 'Field key must start with a lowercase letter and use only letters, numbers, and underscores.'
      );
      return;
    }

    if (fields.some((field) => field.fieldKey === key)) {
      setNewFieldError(
        isBn ? 'এই ফিল্ড কী ইতোমধ্যে ব্যবহৃত হয়েছে।' : 'This field key is already in use.'
      );
      return;
    }

    setFields((current) => [
      ...current,
      makeCustomField(key, labelEn, labelBn, newFieldType, current.length),
    ]);
    setIsAddingField(false);
    setNewFieldError(null);
    setSuccess(null);
  };

  const validateClient = (): string | null => {
    if (fields.length === 0) {
      return isBn
        ? 'প্রয়োজনীয় শিরোনাম ও বিবরণ ফিল্ড অবশ্যই রাখতে হবে।'
        : 'At least the required Title and Description fields are required.';
    }

    const keys = new Set<string>();
    for (const field of fields) {
      const key = field.fieldKey.trim();
      const displayName = isBn ? field.labelBn || field.labelEn || key : field.labelEn || key;

      if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
        return isBn
          ? `অবৈধ ফিল্ড কী: ${key || '(ফাঁকা)'}`
          : `Invalid field key: ${key || '(empty)'}`;
      }
      if (keys.has(key)) {
        return isBn ? `একই ফিল্ড কী একাধিকবার আছে: ${key}` : `Duplicate field key: ${key}`;
      }
      keys.add(key);

      if (!field.labelEn.trim() || !field.labelBn.trim()) {
        return isBn
          ? `${key} ফিল্ডের ইংরেজি ও বাংলা—দুইটি লেবেলই আবশ্যক।`
          : `Both labels are required for ${key}.`;
      }

      if (['select', 'radio', 'multiselect'].includes(field.fieldType)) {
        if (field.options.length === 0) {
          return isBn
            ? `${displayName} ফিল্ডে অন্তত একটি অপশন যোগ করুন।`
            : `Add at least one option for ${displayName}.`;
        }

        const optionValues = new Set<string>();
        for (const option of field.options) {
          const value = option.value.trim();
          const labelEn = option.labelEn.trim();
          const labelBn = option.labelBn.trim();

          if (!value || !labelEn || !labelBn) {
            return isBn
              ? `${displayName} ফিল্ডের প্রতিটি অপশনে value, English label এবং বাংলা label দিতে হবে।`
              : `Every option for ${displayName} must include a value, English label, and Bangla label.`;
          }

          if (optionValues.has(value)) {
            return isBn
              ? `${displayName} ফিল্ডে একই option value একাধিকবার আছে: ${value}`
              : `Duplicate option value for ${displayName}: ${value}`;
          }
          optionValues.add(value);
        }
      }

      const platformMax = platformMaxFor(field);
      const configuredMax = Number(field.validation?.maxLength || 0);
      if (platformMax && configuredMax > platformMax) {
        return isBn
          ? `${displayName} ফিল্ডে সর্বোচ্চ ${platformMax} অক্ষরের বেশি অনুমোদন করা যাবে না।`
          : `${displayName} cannot exceed the platform maximum of ${platformMax} characters.`;
      }

      if (
        (field.fieldType === 'phone' || field.fieldType === 'email') &&
        field.storageMode === 'custom_json' &&
        field.config?.publicVisible === true
      ) {
        return isBn
          ? `${displayName} ফিল্ডে সংবেদনশীল যোগাযোগের তথ্য থাকতে পারে, তাই এটি ডিফল্টভাবে পাবলিক করা যাবে না।`
          : `${displayName} contains sensitive contact information and cannot be public by default.`;
      }
    }

    const title = fields.find(
      (field) =>
        field.storageMode === 'core_column' && field.storageKey === 'title'
    );
    const description = fields.find(
      (field) =>
        field.storageMode === 'core_column' && field.storageKey === 'description'
    );

    if (!title?.active || !title.required || !description?.active || !description.required) {
      return isBn
        ? 'প্রয়োজনীয় শিরোনাম ও বিবরণ storage field সক্রিয় ও Required থাকতে হবে।'
        : 'The required Title and Description storage fields must remain enabled.';
    }

    if (!['text', 'textarea'].includes(title.fieldType)) {
      return isBn
        ? 'শিরোনাম ফিল্ড অবশ্যই text-compatible হতে হবে।'
        : 'Title must remain a text-compatible field.';
    }
    if (!['text', 'textarea'].includes(description.fieldType)) {
      return isBn
        ? 'বিবরণ ফিল্ড অবশ্যই text-compatible হতে হবে।'
        : 'Description must remain a text-compatible field.';
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
      const result = await reportingFormApi.saveDraft(
        subcategoryId,
        normalizedFields,
        notes
      );
      setSuccess(
        isBn
          ? `Draft v${result.version} সংরক্ষিত হয়েছে।`
          : `Draft v${result.version} saved.`
      );
      await load();
    } catch (err: any) {
      setError(
        isBn
          ? 'ফর্মের Draft সংরক্ষণ করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।'
          : err?.message || 'Failed to save form draft.'
      );
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
      await reportingFormApi.saveDraft(
        subcategoryId,
        normalizedFields,
        notes
      );
      const result = await reportingFormApi.publish(subcategoryId);
      setSuccess(
        isBn
          ? `Form v${result.version} প্রকাশিত হয়েছে।`
          : `Form v${result.version} published.`
      );
      await load();
      onPublished?.();
    } catch (err: any) {
      setError(
        isBn
          ? 'ফর্ম প্রকাশ করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।'
          : err?.message || 'Failed to publish form.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const actions = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="secondary"
        onClick={openAddField}
        disabled={busy || isAddingField}
        leftIcon={<Plus />}
      >
        {isBn ? 'কাস্টম ফিল্ড যোগ করুন' : 'Add custom field'}
      </Button>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          onClick={save}
          isLoading={saving}
          disabled={loading || publishing}
          leftIcon={<Save />}
        >
          {isBn ? 'Draft সংরক্ষণ' : 'Save Draft'}
        </Button>
        <Button
          type="button"
          variant="success"
          onClick={publish}
          isLoading={publishing}
          disabled={loading || saving}
          leftIcon={<Send />}
        >
          {isBn ? 'Form প্রকাশ করুন' : 'Publish Form'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="type-secondary font-semibold text-slate-700 dark:text-slate-200">
              {schema
                ? `${schema.status.toUpperCase()} · v${schema.version} · ${schema.engineMode}`
                : isBn
                  ? 'নতুন Schema'
                  : 'New schema'}
            </p>
            <p className="mt-1 type-helper text-slate-500 dark:text-slate-400">
              {isBn
                ? 'Title ও Description-এর দৃশ্যমান নাম, লেবেল, হেল্পার, প্লেসহোল্ডার, টেক্সট টাইপ ও ক্রম সম্পাদনা করা যায়। শুধু তাদের প্রয়োজনীয় storage mapping, Required এবং Show in form নিরাপদ রাখা হয়।'
                : 'Title and Description names, labels, helpers, placeholders, text type, and order are editable. Only their required storage mapping, Required state, and Show in form state stay protected.'}
            </p>
          </div>
          <p className="type-technical font-mono text-slate-400">
            {subcategoryName} · {subcategoryId}
          </p>
        </div>
      </div>

      <Textarea
        id="form-builder-notes"
        label={isBn ? 'পরিবর্তনের নোট' : 'Change notes'}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={2}
        disabled={busy}
      />

      {isAddingField && (
        <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900/70 dark:bg-sky-950/20">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="type-card-title font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? 'নতুন কাস্টম ফিল্ড' : 'New custom field'}
              </h3>
              <p className="mt-1 type-helper text-slate-600 dark:text-slate-300">
                {isBn
                  ? 'প্রথমেই ফিল্ডের আসল নাম দিন—আর “New field” প্লেসহোল্ডার তৈরি হবে না।'
                  : 'Name the field first. The builder will no longer create anonymous “New field” placeholders.'}
              </p>
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={isBn ? 'কাস্টম ফিল্ড বাতিল' : 'Cancel custom field'}
              icon={<X />}
              onClick={cancelAddField}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={isBn ? 'কাস্টম নাম (English)' : 'Custom name (English)'}
              value={newNameEn}
              onChange={(event) => handleNewNameEn(event.target.value)}
              placeholder="e.g. Witness name"
              required
            />
            <Input
              label={isBn ? 'কাস্টম নাম (বাংলা)' : 'Custom name (Bangla)'}
              value={newNameBn}
              onChange={(event) => setNewNameBn(event.target.value)}
              placeholder="যেমন: সাক্ষীর নাম"
              required
            />
            <Input
              label={isBn ? 'ফিল্ড কী' : 'Field key'}
              value={newFieldKey}
              onChange={(event) => {
                setFieldKeyTouched(true);
                setNewFieldKey(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '')
                    .slice(0, 64)
                );
              }}
              helperText={
                isBn
                  ? 'নাম থেকে স্বয়ংক্রিয়ভাবে তৈরি হয়; প্রয়োজন হলে পরিবর্তন করুন।'
                  : 'Generated from the name; edit it if needed before adding.'
              }
              required
            />
            <Select
              label={isBn ? 'ফিল্ড টাইপ' : 'Field type'}
              value={newFieldType}
              onChange={(event) =>
                setNewFieldType(event.target.value as ReportingFieldType)
              }
              options={FIELD_TYPES}
            />
          </div>

          {newFieldError && (
            <p role="alert" className="mt-3 type-helper text-red-700 dark:text-red-300">
              {newFieldError}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="primary" onClick={confirmAddField}>
              {isBn ? 'ফর্মে যোগ করুন' : 'Add to form'}
            </Button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="py-12 text-center type-secondary text-slate-500">
          {isBn ? 'ফর্ম লোড হচ্ছে…' : 'Loading form…'}
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const systemBlock = field.storageMode === 'system_block';
            const privacySystemBlock =
              systemBlock && field.fieldType === 'privacy';
            const protectedCore = isProtectedCoreField(field);
            const cannotRemove =
              systemBlock || protectedCore || Boolean(field.config?.locked);
            const hasOptions = ['select', 'radio', 'multiselect'].includes(
              field.fieldType
            );
            const publicVisible = field.config?.publicVisible !== false;
            const typeOptions = systemBlock
              ? SYSTEM_FIELD_TYPES
              : protectedCore
                ? CORE_TEXT_TYPES
                : FIELD_TYPES;
            const platformMax = platformMaxFor(field);

            return (
              <section
                key={field.id || `${field.storageKey}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="type-technical font-semibold text-slate-700 dark:text-slate-200">
                      #{index + 1}
                    </span>
                    <code className="max-w-[220px] truncate rounded bg-slate-100 px-2 py-1 type-technical text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {field.fieldKey}
                    </code>
                    {(systemBlock || protectedCore) && (
                      <span
                        className="inline-flex items-center gap-1 type-technical text-slate-400"
                        title={
                          protectedCore
                            ? 'Required storage mapping is protected'
                            : 'System block'
                        }
                      >
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        {protectedCore
                          ? isBn
                            ? 'Core'
                            : 'Core'
                          : isBn
                            ? 'System'
                            : 'System'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || busy}
                      aria-label="Move field up"
                      icon={<ArrowUp />}
                    />
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => move(index, 1)}
                      disabled={index === fields.length - 1 || busy}
                      aria-label="Move field down"
                      icon={<ArrowDown />}
                    />
                    {!cannotRemove && (
                      <IconButton
                        variant="danger"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={busy}
                        aria-label="Remove field"
                        icon={<Trash2 />}
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label={isBn ? 'ফিল্ড কী' : 'Field key'}
                    value={field.fieldKey}
                    onChange={(event) =>
                      updateField(index, {
                        fieldKey: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, ''),
                      })
                    }
                    disabled={systemBlock || busy}
                    helperText={
                      protectedCore
                        ? isBn
                          ? 'দৃশ্যমান কী পরিবর্তন করা যায়; core storage mapping অপরিবর্তিত থাকে।'
                          : 'Editable display key; the core storage mapping stays unchanged.'
                        : undefined
                    }
                  />

                  <Select
                    label={isBn ? 'ফিল্ড টাইপ' : 'Field type'}
                    value={field.fieldType}
                    onChange={(event) => {
                      const fieldType = event.target.value as ReportingFieldType;
                      const sensitivePublicType =
                        fieldType === 'phone' || fieldType === 'email';
                      updateField(index, {
                        fieldType,
                        config: sensitivePublicType
                          ? { ...field.config, publicVisible: false }
                          : field.config,
                      });
                    }}
                    disabled={systemBlock || busy}
                    options={typeOptions}
                  />

                  <Input
                    label={isBn ? 'ইংরেজি লেবেল' : 'Label (English)'}
                    value={field.labelEn}
                    onChange={(event) =>
                      updateField(index, { labelEn: event.target.value })
                    }
                    disabled={busy}
                  />

                  <Input
                    label={isBn ? 'বাংলা লেবেল' : 'Label (Bangla)'}
                    value={field.labelBn}
                    onChange={(event) =>
                      updateField(index, { labelBn: event.target.value })
                    }
                    disabled={busy}
                  />

                  <Input
                    label={isBn ? 'ইংরেজি হেল্পার' : 'Helper (English)'}
                    value={field.helperEn || ''}
                    onChange={(event) =>
                      updateField(index, { helperEn: event.target.value })
                    }
                    disabled={busy}
                  />

                  <Input
                    label={isBn ? 'বাংলা হেল্পার' : 'Helper (Bangla)'}
                    value={field.helperBn || ''}
                    onChange={(event) =>
                      updateField(index, { helperBn: event.target.value })
                    }
                    disabled={busy}
                  />

                  {!systemBlock && (
                    <>
                      <Input
                        label={isBn ? 'ইংরেজি প্লেসহোল্ডার' : 'Placeholder (English)'}
                        value={field.placeholderEn || ''}
                        onChange={(event) =>
                          updateField(index, {
                            placeholderEn: event.target.value,
                          })
                        }
                        disabled={busy}
                      />
                      <Input
                        label={isBn ? 'বাংলা প্লেসহোল্ডার' : 'Placeholder (Bangla)'}
                        value={field.placeholderBn || ''}
                        onChange={(event) =>
                          updateField(index, {
                            placeholderBn: event.target.value,
                          })
                        }
                        disabled={busy}
                      />
                    </>
                  )}
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
                      updateField(index, {
                        options: parseOptionLines(event.target.value),
                      })
                    }
                    rows={4}
                    disabled={busy}
                  />
                )}

                {['text', 'textarea', 'number', 'currency'].includes(
                  field.fieldType
                ) && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(field.fieldType === 'text' ||
                      field.fieldType === 'textarea') && (
                      <>
                        {!protectedCore && (
                          <Input
                            type="number"
                            min="0"
                            label={isBn ? 'সর্বনিম্ন অক্ষর' : 'Min length'}
                            value={String(
                              (field.validation as any)?.minLength ?? ''
                            )}
                            onChange={(event) =>
                              updateField(index, {
                                validation: {
                                  ...field.validation,
                                  minLength: event.target.value
                                    ? Number(event.target.value)
                                    : undefined,
                                },
                              })
                            }
                            disabled={busy}
                          />
                        )}
                        <Input
                          type="number"
                          min="1"
                          max={platformMax ?? undefined}
                          label={isBn ? 'সর্বোচ্চ অক্ষর' : 'Max length'}
                          value={String(
                            (field.validation as any)?.maxLength || ''
                          )}
                          onChange={(event) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                maxLength: event.target.value
                                  ? Number(event.target.value)
                                  : undefined,
                              },
                            })
                          }
                          helperText={
                            platformMax
                              ? isBn
                                ? `প্ল্যাটফর্ম সীমা: ${platformMax}`
                                : `Platform limit: ${platformMax}`
                              : undefined
                          }
                          disabled={busy}
                        />
                      </>
                    )}

                    {(field.fieldType === 'number' ||
                      field.fieldType === 'currency') && (
                      <>
                        <Input
                          type="number"
                          label={isBn ? 'সর্বনিম্ন' : 'Minimum'}
                          value={String(
                            (field.validation as any)?.min ?? ''
                          )}
                          onChange={(event) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                min: event.target.value
                                  ? Number(event.target.value)
                                  : undefined,
                              },
                            })
                          }
                          disabled={busy}
                        />
                        <Input
                          type="number"
                          label={isBn ? 'সর্বোচ্চ' : 'Maximum'}
                          value={String(
                            (field.validation as any)?.max ?? ''
                          )}
                          onChange={(event) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                max: event.target.value
                                  ? Number(event.target.value)
                                  : undefined,
                              },
                            })
                          }
                          disabled={busy}
                        />
                      </>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
                  <Switch
                    checked={field.required}
                    onChange={(checked) =>
                      updateField(index, { required: checked })
                    }
                    disabled={systemBlock || protectedCore || busy}
                    label={isBn ? 'আবশ্যক' : 'Required'}
                  />
                  <Switch
                    checked={field.active}
                    onChange={(checked) =>
                      updateField(index, { active: checked })
                    }
                    disabled={
                      (systemBlock && !privacySystemBlock) ||
                      protectedCore ||
                      busy
                    }
                    label={
                      privacySystemBlock
                        ? isBn
                          ? 'গোপনীয়তার অপশন দেখান'
                          : 'Show privacy options'
                        : isBn
                          ? 'ফর্মে দেখান'
                          : 'Show in form'
                    }
                  />
                  {field.storageMode === 'custom_json' && (
                    <Switch
                      checked={publicVisible}
                      disabled={
                        field.fieldType === 'phone' ||
                        field.fieldType === 'email' ||
                        busy
                      }
                      onChange={(checked) =>
                        updateField(index, {
                          config: {
                            ...field.config,
                            publicVisible: checked,
                          },
                        })
                      }
                      label={
                        isBn
                          ? 'প্রকাশিত রিপোর্টে দেখান'
                          : 'Show on published report'
                      }
                    />
                  )}
                </div>

                {privacySystemBlock && (
                  <p className="mt-3 type-helper text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'এই অপশন চালু করলে নাগরিক প্রয়োজনে অজ্ঞাতনামা থাকতে, শুধু অ্যাডমিনের জন্য যোগাযোগের তথ্য দিতে, অথবা অনুমোদিত হলে পরিচয় প্রকাশের অনুরোধ করতে পারবেন। সংবাদ-উৎস থেকে তৈরি প্রতিবেদন অজ্ঞাতনামাই থাকে।'
                      : 'Enable this only when the subcategory should offer anonymous, admin-only contact, or approved public-identity choices. Reports created from news sources remain anonymous.'}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 type-helper text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 type-helper text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {success}
        </div>
      )}

      {showInlineActions && (
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          {actions}
        </div>
      )}
    </div>
  );
};

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  isOpen,
  subcategoryId,
  subcategoryName,
  onClose,
  onPublished,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [panelBusy, setPanelBusy] = useState(false);

  const handleClose = () => {
    if (!panelBusy) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isBn ? 'ফর্ম বিল্ডার' : 'Form Builder'}
      description={`${subcategoryName} · ${subcategoryId}`}
      size="xl"
      closeOnBackdrop={!panelBusy}
    >
      {isOpen && (
        <FormBuilderPanel
          subcategoryId={subcategoryId}
          subcategoryName={subcategoryName}
          onPublished={onPublished}
          onBusyChange={setPanelBusy}
        />
      )}
    </Modal>
  );
};

export default FormBuilderModal;
