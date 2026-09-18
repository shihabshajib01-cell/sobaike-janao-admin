import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  TaxonomyCreateInput,
  TaxonomyItemType,
  TaxonomySegmentNode,
} from '@/types/Category';

export interface CategoryCreateModalProps {
  isOpen: boolean;
  itemType: TaxonomyItemType;
  segments: TaxonomySegmentNode[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: TaxonomyCreateInput) => void;
}

const ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export const CategoryCreateModal: React.FC<CategoryCreateModalProps> = ({
  isOpen,
  itemType,
  segments,
  isSaving,
  error,
  onClose,
  onSave,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const availableParents = useMemo(
    () => segments.filter((segment) => segment.configStatus !== 'archived'),
    [segments]
  );

  const allIds = useMemo(
    () =>
      new Set([
        ...segments.map((segment) => segment.id),
        ...segments.flatMap((segment) => segment.subcategories.map((sub) => sub.id)),
      ]),
    [segments]
  );

  const [id, setId] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [parentSegmentId, setParentSegmentId] = useState('');
  const [order, setOrder] = useState('1');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const firstParent = availableParents[0]?.id || '';
    setId('');
    setNameEn('');
    setNameBn('');
    setParentSegmentId(itemType === 'subcategory' ? firstParent : '');

    if (itemType === 'segment') {
      const nextOrder = Math.max(0, ...segments.map((segment) => segment.order)) + 1;
      setOrder(String(nextOrder));
    } else {
      const parent = availableParents.find((segment) => segment.id === firstParent);
      const nextOrder = Math.max(0, ...(parent?.subcategories.map((sub) => sub.order) || [])) + 1;
      setOrder(String(nextOrder));
    }

    setValidationError(null);
  }, [isOpen, itemType, segments, availableParents]);

  const handleParentChange = (nextParentId: string) => {
    setParentSegmentId(nextParentId);
    const parent = availableParents.find((segment) => segment.id === nextParentId);
    const nextOrder = Math.max(0, ...(parent?.subcategories.map((sub) => sub.order) || [])) + 1;
    setOrder(String(nextOrder));
  };

  const handleSave = () => {
    const normalizedId = id.trim().toLowerCase();
    const trimmedNameEn = nameEn.trim();
    const trimmedNameBn = nameBn.trim();
    const parsedOrder = Number(order);

    if (!normalizedId || !ID_PATTERN.test(normalizedId)) {
      setValidationError(
        isBn
          ? 'ID-তে শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও আন্ডারস্কোর ব্যবহার করুন।'
          : 'Use only lowercase letters, numbers, and underscores in the ID.'
      );
      return;
    }

    if (allIds.has(normalizedId)) {
      setValidationError(
        isBn ? 'এই ID ইতোমধ্যে ব্যবহৃত হয়েছে।' : 'This ID is already in use.'
      );
      return;
    }

    if (!trimmedNameEn || !trimmedNameBn) {
      setValidationError(
        isBn ? 'ইংরেজি ও বাংলা—দুইটি নামই আবশ্যক।' : 'Both English and Bangla names are required.'
      );
      return;
    }

    if (itemType === 'subcategory' && !parentSegmentId) {
      setValidationError(
        isBn ? 'একটি মূল ক্যাটাগরি নির্বাচন করুন।' : 'Select a parent category.'
      );
      return;
    }

    if (!Number.isInteger(parsedOrder) || parsedOrder < 1 || parsedOrder > 999) {
      setValidationError(
        isBn ? 'ক্রম ১ থেকে ৯৯৯-এর মধ্যে পূর্ণসংখ্যা হতে হবে।' : 'Order must be an integer from 1 to 999.'
      );
      return;
    }

    setValidationError(null);
    onSave({
      itemType,
      id: normalizedId,
      parentSegmentId: itemType === 'subcategory' ? parentSegmentId : undefined,
      nameEn: trimmedNameEn,
      nameBn: trimmedNameBn,
      order: parsedOrder,
    });
  };

  const isSubcategory = itemType === 'subcategory';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title={
        isSubcategory
          ? isBn
            ? 'নতুন সাব-ক্যাটাগরি'
            : 'New Subcategory'
          : isBn
            ? 'নতুন ক্যাটাগরি'
            : 'New Category'
      }
      description={
        isBn
          ? 'নতুন আইটেমটি প্রথমে Draft হিসেবে তৈরি হবে।'
          : 'The new item will be created as a Draft first.'
      }
      size="md"
      closeOnBackdrop={!isSaving}
      footer={
        <div className="flex w-full flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving || (isSubcategory && availableParents.length === 0)}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {isBn ? 'Draft তৈরি করুন' : 'Create Draft'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {isBn
              ? 'Draft আইটেম Public রিপোর্টিংয়ে দেখাবে না এবং এই ধাপে Active করা যাবে না।'
              : 'Draft items are hidden from Public reporting and cannot be activated in this phase.'}
          </p>
        </div>

        {isSubcategory && (
          <Select
            id="taxonomy-parent-segment"
            label={isBn ? 'মূল ক্যাটাগরি' : 'Parent Category'}
            value={parentSegmentId}
            onChange={(event) => handleParentChange(event.target.value)}
            disabled={isSaving || availableParents.length === 0}
            options={availableParents.map((segment) => ({
              value: segment.id,
              label: `${isBn ? segment.nameBn : segment.nameEn} (${segment.id})`,
            }))}
            helperText={
              availableParents.length === 0
                ? isBn
                  ? 'কোনো উপলভ্য ক্যাটাগরি নেই।'
                  : 'No available parent category.'
                : undefined
            }
          />
        )}

        <Input
          id="taxonomy-create-id"
          label={isBn ? 'অনন্য ID' : 'Unique ID'}
          value={id}
          onChange={(event) => setId(event.target.value.toLowerCase())}
          disabled={isSaving}
          placeholder={isSubcategory ? 'example_subcategory' : 'example_category'}
          helperText={
            isBn
              ? 'ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও আন্ডারস্কোর। পরে পরিবর্তন করা যাবে না।'
              : 'Lowercase letters, numbers, and underscores. This cannot be changed later.'
          }
          required
        />

        <Input
          id="taxonomy-create-name-en"
          label={isBn ? 'ইংরেজি নাম' : 'Name (English)'}
          value={nameEn}
          onChange={(event) => setNameEn(event.target.value)}
          disabled={isSaving}
          required
        />

        <Input
          id="taxonomy-create-name-bn"
          label={isBn ? 'বাংলা নাম' : 'Name (Bangla)'}
          value={nameBn}
          onChange={(event) => setNameBn(event.target.value)}
          disabled={isSaving}
          required
        />

        <Input
          id="taxonomy-create-order"
          type="number"
          min="1"
          max="999"
          step="1"
          label={isBn ? 'প্রদর্শনের ক্রম' : 'Sort Order'}
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          disabled={isSaving}
          required
        />

        {(validationError || error) && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{validationError || error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CategoryCreateModal;
