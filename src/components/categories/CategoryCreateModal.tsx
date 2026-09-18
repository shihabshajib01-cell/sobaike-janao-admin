import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileText,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { FormBuilderPanel } from './FormBuilderModal';
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
  onSave: (input: TaxonomyCreateInput) => Promise<boolean>;
  onCompleted?: () => void;
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
  onCompleted,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const isSubcategory = itemType === 'subcategory';

  const availableParents = useMemo(
    () => segments.filter((segment) => segment.configStatus !== 'archived'),
    [segments]
  );

  const allIds = useMemo(
    () =>
      new Set([
        ...segments.map((segment) => segment.id),
        ...segments.flatMap((segment) =>
          segment.subcategories.map((sub) => sub.id)
        ),
      ]),
    [segments]
  );

  const [id, setId] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [parentSegmentId, setParentSegmentId] = useState('');
  const [order, setOrder] = useState('1');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [createdSubcategory, setCreatedSubcategory] = useState<{
    id: string;
    nameEn: string;
    nameBn: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setCreatedSubcategory(null);
      return;
    }

    if (createdSubcategory) return;

    const firstParent = availableParents[0]?.id || '';
    setId('');
    setNameEn('');
    setNameBn('');
    setParentSegmentId(isSubcategory ? firstParent : '');

    if (itemType === 'segment') {
      const nextOrder =
        Math.max(0, ...segments.map((segment) => segment.order)) + 1;
      setOrder(String(nextOrder));
    } else {
      const parent = availableParents.find(
        (segment) => segment.id === firstParent
      );
      const nextOrder =
        Math.max(
          0,
          ...(parent?.subcategories.map((sub) => sub.order) || [])
        ) + 1;
      setOrder(String(nextOrder));
    }

    setValidationError(null);
    setCurrentStep(1);
  }, [
    isOpen,
    itemType,
    isSubcategory,
    segments,
    availableParents,
    createdSubcategory,
  ]);

  const handleParentChange = (nextParentId: string) => {
    setParentSegmentId(nextParentId);
    const parent = availableParents.find(
      (segment) => segment.id === nextParentId
    );
    const nextOrder =
      Math.max(
        0,
        ...(parent?.subcategories.map((sub) => sub.order) || [])
      ) + 1;
    setOrder(String(nextOrder));
  };

  const validateStepOne = (): TaxonomyCreateInput | null => {
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
      return null;
    }

    if (allIds.has(normalizedId)) {
      setValidationError(
        isBn
          ? 'এই ID ইতোমধ্যে ব্যবহৃত হয়েছে।'
          : 'This ID is already in use.'
      );
      return null;
    }

    if (!trimmedNameEn || !trimmedNameBn) {
      setValidationError(
        isBn
          ? 'ইংরেজি ও বাংলা—দুইটি নামই আবশ্যক।'
          : 'Both English and Bangla names are required.'
      );
      return null;
    }

    if (isSubcategory && !parentSegmentId) {
      setValidationError(
        isBn
          ? 'একটি মূল ক্যাটাগরি নির্বাচন করুন।'
          : 'Select a parent category.'
      );
      return null;
    }

    if (
      !Number.isInteger(parsedOrder) ||
      parsedOrder < 1 ||
      parsedOrder > 999
    ) {
      setValidationError(
        isBn
          ? 'ক্রম ১ থেকে ৯৯৯-এর মধ্যে পূর্ণসংখ্যা হতে হবে।'
          : 'Order must be an integer from 1 to 999.'
      );
      return null;
    }

    setValidationError(null);
    return {
      itemType,
      id: normalizedId,
      parentSegmentId: isSubcategory ? parentSegmentId : undefined,
      nameEn: trimmedNameEn,
      nameBn: trimmedNameBn,
      order: parsedOrder,
    };
  };

  const handleSave = async () => {
    const input = validateStepOne();
    if (!input) return;

    const saved = await onSave(input);
    if (!saved) return;

    if (!isSubcategory) {
      onClose();
      return;
    }

    setCreatedSubcategory({
      id: input.id,
      nameEn: input.nameEn,
      nameBn: input.nameBn,
    });
    setCurrentStep(2);
  };

  const handleFormPublished = () => {
    onCompleted?.();
    onClose();
  };

  const stepper = isSubcategory ? (
    <nav
      aria-label={isBn ? 'সাব-ক্যাটাগরি তৈরির ধাপ' : 'Subcategory creation steps'}
      className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <ol className="grid grid-cols-2 gap-2">
        {[
          {
            step: 1 as const,
            icon: Layers,
            en: 'Subcategory',
            bn: 'সাব-ক্যাটাগরি',
          },
          {
            step: 2 as const,
            icon: FileText,
            en: 'Form Builder',
            bn: 'ফর্ম বিল্ডার',
          },
        ].map((item) => {
          const active = currentStep === item.step;
          const completed = currentStep > item.step;
          const Icon = item.icon;

          return (
            <li
              key={item.step}
              aria-current={active ? 'step' : undefined}
              className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 ${active
                ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
                : completed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400'}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${completed
                  ? 'bg-emerald-600 text-white'
                  : active
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                {completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block type-technical font-semibold uppercase tracking-wide">
                  {isBn ? `ধাপ ${item.step}` : `Step ${item.step}`}
                </span>
                <span className="block truncate type-secondary font-semibold">
                  {isBn ? item.bn : item.en}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  ) : null;

  const stepOneContent = (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 type-helper text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {isBn
            ? 'Draft আইটেম Public রিপোর্টিংয়ে দেখাবে না। সাব-ক্যাটাগরির ক্ষেত্রে পরের ধাপে Form Builder খুলবে।'
            : 'Draft items stay hidden from Public reporting. For a subcategory, the Form Builder opens as Step 2.'}
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
        placeholder={
          isSubcategory ? 'example_subcategory' : 'example_category'
        }
        helperText={
          isBn
            ? 'ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও আন্ডারস্কোর। তৈরি হওয়ার পর ID পরিবর্তন করা যাবে না।'
            : 'Lowercase letters, numbers, and underscores. The ID becomes immutable after creation.'
        }
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

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
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 type-helper text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{validationError || error}</p>
        </div>
      )}
    </div>
  );

  const footer =
    currentStep === 1 ? (
      <>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onClose}
          disabled={isSaving}
        >
          {isBn ? 'বাতিল' : 'Cancel'}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={() => void handleSave()}
          isLoading={isSaving}
          disabled={
            isSaving ||
            (isSubcategory && availableParents.length === 0)
          }
        >
          {isSubcategory
            ? isBn
              ? 'Draft তৈরি করে পরবর্তী ধাপ'
              : 'Create Draft & Continue'
            : isBn
              ? 'Draft তৈরি করুন'
              : 'Create Draft'}
        </Button>
      </>
    ) : undefined;

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
        isSubcategory
          ? isBn
            ? 'সাব-ক্যাটাগরি তথ্য ও রিপোর্টিং ফর্ম—দুই ধাপে সম্পন্ন করুন।'
            : 'Complete the subcategory details and reporting form in two steps.'
          : isBn
            ? 'নতুন আইটেমটি প্রথমে Draft হিসেবে তৈরি হবে।'
            : 'The new item will be created as a Draft first.'
      }
      size={isSubcategory ? 'xl' : 'md'}
      closeOnBackdrop={!isSaving}
      footer={footer}
    >
      <div className="space-y-5">
        {stepper}

        {currentStep === 1 && stepOneContent}

        {currentStep === 2 && createdSubcategory && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 type-helper text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              {isBn
                ? 'Draft তৈরি হয়েছে। এখন রিপোর্টিং ফর্ম কনফিগার ও Publish করুন। Form Publish হলেও সাব-ক্যাটাগরি Public-এ যাবে না—তার Details থেকে আলাদাভাবে Publish করতে হবে।'
                : 'The draft is created. Configure and publish its reporting form now. Publishing the form does not make the subcategory public; taxonomy publishing remains a separate final safety action.'}
            </div>

            <FormBuilderPanel
              subcategoryId={createdSubcategory.id}
              subcategoryName={
                isBn
                  ? createdSubcategory.nameBn
                  : createdSubcategory.nameEn
              }
              onPublished={handleFormPublished}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CategoryCreateModal;
