import React from 'react';
import { AlertTriangle, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { ComplaintConfiguredFields } from '@/types/Complaint';

interface ConfiguredComplaintFieldsCardProps {
  data?: ComplaintConfiguredFields;
  error?: string | null;
  onRetry?: () => void;
}

const formatValue = (value: unknown, isBn: boolean): string => {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (typeof value === 'boolean') return value ? (isBn ? 'হ্যাঁ' : 'Yes') : (isBn ? 'না' : 'No');
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined && String(item).trim() !== '')
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join(', ');
  }
  return String(value ?? '');
};

export const ConfiguredComplaintFieldsCard: React.FC<ConfiguredComplaintFieldsCardProps> = ({
  data,
  error,
  onRetry,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const metadataByStorageKey = new Map(
    (data?.fields || []).map((field) => [field.storageKey, field])
  );

  const rows = Object.entries(data?.answers || {})
    .map(([storageKey, value]) => {
      const field = metadataByStorageKey.get(storageKey);
      return {
        storageKey,
        fieldKey: field?.fieldKey || storageKey,
        labelEn: field?.labelEn || storageKey,
        labelBn: field?.labelBn || field?.labelEn || storageKey,
        fieldType: field?.fieldType || 'text',
        sortOrder: field?.sortOrder ?? 999,
        value,
      };
    })
    .filter((row) => formatValue(row.value, isBn).trim())
    .sort((a, b) => a.sortOrder - b.sortOrder || a.fieldKey.localeCompare(b.fieldKey));

  if (!error && rows.length === 0) return null;

  return (
    <Card variant="default">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>{isBn ? 'কনফিগার করা অতিরিক্ত তথ্য' : 'Configured Additional Information'}</span>
        </CardTitle>
        {data?.formSchemaVersion ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isBn ? 'ফর্ম সংস্করণ' : 'Form version'} {data.formSchemaVersion}
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="pt-4">
        {error ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">
                {isBn ? 'অতিরিক্ত কনফিগার করা তথ্য লোড করা যায়নি।' : error}
              </p>
            </div>
            {onRetry ? (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
              </Button>
            ) : null}
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div
                key={row.storageKey}
                className={
                  row.fieldType === 'textarea' || row.fieldType === 'multiselect'
                    ? 'rounded-lg border border-slate-200 p-3 dark:border-slate-800 sm:col-span-2'
                    : 'rounded-lg border border-slate-200 p-3 dark:border-slate-800'
                }
              >
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  {isBn ? row.labelBn : row.labelEn}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatValue(row.value, isBn)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
};

export default ConfiguredComplaintFieldsCard;
