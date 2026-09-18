import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { useLanguage } from '@/context/LanguageContext';
import {
  TaxonomyItemType,
  TaxonomySegment,
  TaxonomySubcategory,
  TaxonomyUpdateInput,
} from '@/types/Category';

export interface CategoryEditModalProps {
  isOpen: boolean;
  itemType: TaxonomyItemType | null;
  item: TaxonomySegment | TaxonomySubcategory | null;
  segments?: TaxonomySegment[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: TaxonomyUpdateInput) => void;
}

const ICON_OPTIONS = [
  { value: 'shield', label: 'Shield' },
  { value: 'alert', label: 'Alert' },
  { value: 'heart', label: 'People / Care' },
  { value: 'road', label: 'Road / Transport' },
  { value: 'building', label: 'Building / Property' },
  { value: 'bolt', label: 'Utility / Power' },
  { value: 'map', label: 'Location' },
];

const THEME_OPTIONS = [
  { value: 'sky', label: 'Sky Blue' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
  { value: 'violet', label: 'Violet' },
  { value: 'slate', label: 'Slate' },
];

const GROUP_OPTIONS = [
  { value: '', label: 'None / General' },
  { value: 'general', label: 'General' },
  { value: 'violence', label: 'Violence' },
  { value: 'relationship_scam', label: 'Relationship scam' },
  { value: 'digital_intimate', label: 'Digital / intimate' },
];

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  itemType,
  item,
  segments = [],
  isSaving,
  error,
  onClose,
  onSave,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [order, setOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [shortNameEn, setShortNameEn] = useState('');
  const [shortNameBn, setShortNameBn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [slug, setSlug] = useState('');
  const [iconKey, setIconKey] = useState('shield');
  const [themeKey, setThemeKey] = useState('sky');
  const [parentSegmentId, setParentSegmentId] = useState('');
  const [categoryGroup, setCategoryGroup] = useState('');
  const [isSensitive, setIsSensitive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) return;
    setNameEn(item.nameEn);
    setNameBn(item.nameBn);
    setOrder(String(item.order));
    setActive(item.status === 'active');
    setDescriptionEn(item.descriptionEn || '');
    setDescriptionBn(item.descriptionBn || '');

    if (itemType === 'segment') {
      const segment = item as TaxonomySegment;
      setShortNameEn(segment.shortNameEn || segment.nameEn);
      setShortNameBn(segment.shortNameBn || segment.nameBn);
      setSlug(segment.slug || segment.id.replace(/_/g, '-'));
      setIconKey(segment.iconKey || 'shield');
      setThemeKey(segment.themeKey || 'sky');
      setParentSegmentId('');
      setCategoryGroup('');
      setIsSensitive(false);
    } else {
      const subcategory = item as TaxonomySubcategory;
      setParentSegmentId(subcategory.segmentId);
      setCategoryGroup(subcategory.categoryGroup || '');
      setIsSensitive(Boolean(subcategory.isSensitive));
      setShortNameEn('');
      setShortNameBn('');
      setSlug('');
      setIconKey('shield');
      setThemeKey('sky');
    }

    setValidationError(null);
  }, [isOpen, item, itemType]);

  if (!item || !itemType) return null;

  const canToggleActive = item.configStatus === 'published';

  const handleSave = () => {
    const trimmedNameEn = nameEn.trim();
    const trimmedNameBn = nameBn.trim();
    const parsedOrder = Number(order);

    if (!trimmedNameEn || !trimmedNameBn) {
      setValidationError(
        isBn ? 'ইংরেজি ও বাংলা—দুইটি নামই আবশ্যক।' : 'Both English and Bangla names are required.'
      );
      return;
    }

    if (!Number.isInteger(parsedOrder) || parsedOrder < 1 || parsedOrder > 999) {
      setValidationError(
        isBn ? 'প্রদর্শনের ক্রম ১–৯৯৯ এর মধ্যে হতে হবে।' : 'Sort order must be from 1 to 999.'
      );
      return;
    }

    if (itemType === 'segment') {
      const normalizedSlug = slug.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
        setValidationError(
          isBn
            ? 'Slug-এ ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন ব্যবহার করুন।'
            : 'Slug must use lowercase letters, numbers, and hyphens.'
        );
        return;
      }
    }

    if (itemType === 'subcategory' && !parentSegmentId) {
      setValidationError(isBn ? 'মূল ক্যাটাগরি নির্বাচন করুন।' : 'Select a parent category.');
      return;
    }

    setValidationError(null);
    onSave({
      itemType,
      id: item.id,
      nameEn: trimmedNameEn,
      nameBn: trimmedNameBn,
      status: active ? 'active' : 'inactive',
      order: parsedOrder,
      parentSegmentId: itemType === 'subcategory' ? parentSegmentId : undefined,
      shortNameEn: itemType === 'segment' ? shortNameEn.trim() : undefined,
      shortNameBn: itemType === 'segment' ? shortNameBn.trim() : undefined,
      descriptionEn,
      descriptionBn,
      slug: itemType === 'segment' ? slug.trim().toLowerCase() : undefined,
      iconKey: itemType === 'segment' ? iconKey : undefined,
      themeKey: itemType === 'segment' ? themeKey : undefined,
      categoryGroup: itemType === 'subcategory' ? categoryGroup || null : undefined,
      isSensitive: itemType === 'subcategory' ? isSensitive : undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title={
        itemType === 'segment'
          ? isBn
            ? 'ক্যাটাগরি সম্পাদনা'
            : 'Edit Category'
          : isBn
            ? 'সাব-ক্যাটাগরি সম্পাদনা'
            : 'Edit Subcategory'
      }
      description={
        itemType === 'subcategory'
          ? isBn
            ? 'মূল ক্যাটাগরি পরিবর্তন করলে আইটেমটি নিরাপত্তার জন্য নিষ্ক্রিয় হবে এবং পুনরায় Publish করতে হবে।'
            : 'Moving to another parent safely deactivates the item until it is published again.'
          : undefined
      }
      size="xl"
      closeOnBackdrop={!isSaving}
      footer={
        <div className="flex w-full flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} isLoading={isSaving}>
            {isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBn ? 'অনন্য ID পরিবর্তন করা যাবে না' : 'Unique ID is immutable'}
          </p>
          <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
            {item.id}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={isBn ? 'ইংরেজি নাম' : 'Name (English)'}
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
            disabled={isSaving}
            required
          />
          <Input
            label={isBn ? 'বাংলা নাম' : 'Name (Bangla)'}
            value={nameBn}
            onChange={(event) => setNameBn(event.target.value)}
            disabled={isSaving}
            required
          />

          {itemType === 'segment' && (
            <>
              <Input
                label={isBn ? 'সংক্ষিপ্ত ইংরেজি নাম' : 'Short name (English)'}
                value={shortNameEn}
                onChange={(event) => setShortNameEn(event.target.value)}
                disabled={isSaving}
              />
              <Input
                label={isBn ? 'সংক্ষিপ্ত বাংলা নাম' : 'Short name (Bangla)'}
                value={shortNameBn}
                onChange={(event) => setShortNameBn(event.target.value)}
                disabled={isSaving}
              />
              <Input
                label="Slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                disabled={isSaving}
                helperText="/category/your-slug"
              />
              <Input
                type="number"
                min="1"
                max="999"
                label={isBn ? 'প্রদর্শনের ক্রম' : 'Sort Order'}
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                disabled={isSaving}
              />
              <Select
                label={isBn ? 'আইকন' : 'Icon'}
                value={iconKey}
                onChange={(event) => setIconKey(event.target.value)}
                options={ICON_OPTIONS}
                disabled={isSaving}
              />
              <Select
                label={isBn ? 'থিম' : 'Theme'}
                value={themeKey}
                onChange={(event) => setThemeKey(event.target.value)}
                options={THEME_OPTIONS}
                disabled={isSaving}
              />
            </>
          )}

          {itemType === 'subcategory' && (
            <>
              <Select
                label={isBn ? 'মূল ক্যাটাগরি' : 'Parent Category'}
                value={parentSegmentId}
                onChange={(event) => setParentSegmentId(event.target.value)}
                options={segments
                  .filter((segment) => segment.configStatus !== 'archived')
                  .map((segment) => ({
                    value: segment.id,
                    label: isBn ? segment.nameBn : segment.nameEn,
                  }))}
                disabled={isSaving}
              />
              <Input
                type="number"
                min="1"
                max="999"
                label={isBn ? 'প্রদর্শনের ক্রম' : 'Sort Order'}
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                disabled={isSaving}
              />
              <Select
                label={isBn ? 'গ্রুপ' : 'Category Group'}
                value={categoryGroup}
                onChange={(event) => setCategoryGroup(event.target.value)}
                options={GROUP_OPTIONS}
                disabled={isSaving}
              />
              <div className="flex items-end rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <Switch
                  checked={isSensitive}
                  onChange={setIsSensitive}
                  disabled={isSaving}
                  label={isBn ? 'সংবেদনশীল বিষয়' : 'Sensitive category'}
                  description={
                    isBn
                      ? 'মডারেশন ও প্রকাশনায় বাড়তি সতর্কতা প্রয়োজন।'
                      : 'Signals extra care for moderation and publication.'
                  }
                />
              </div>
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea
            label={isBn ? 'ইংরেজি বিবরণ' : 'Description (English)'}
            value={descriptionEn}
            onChange={(event) => setDescriptionEn(event.target.value)}
            disabled={isSaving}
            rows={3}
          />
          <Textarea
            label={isBn ? 'বাংলা বিবরণ' : 'Description (Bangla)'}
            value={descriptionBn}
            onChange={(event) => setDescriptionBn(event.target.value)}
            disabled={isSaving}
            rows={3}
          />
        </div>

        <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
          <Switch
            checked={active}
            onChange={setActive}
            disabled={isSaving || !canToggleActive}
            label={isBn ? 'পাবলিক রিপোর্টিংয়ে সক্রিয়' : 'Active in public reporting'}
            description={
              !canToggleActive
                ? isBn
                  ? 'Draft/Ready/Archived আইটেম Publish না হওয়া পর্যন্ত Active করা যাবে না।'
                  : 'Draft, Ready, or Archived items cannot be activated until published.'
                : isBn
                  ? 'বন্ধ করলে নতুন রিপোর্টে এই আইটেমটি দেখানো হবে না।'
                  : 'Turn off to remove this item from new public reporting.'
            }
          />
        </div>

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

export default CategoryEditModal;
