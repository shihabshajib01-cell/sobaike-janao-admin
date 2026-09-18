import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Pencil, RefreshCw, Upload } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button, Input, Modal, PageHeader, Switch, Textarea } from '@/components/ui';
import {
  BannerContent,
  ManagedBanner,
  bannerApi,
} from '@/services/api/bannerApi';

const cloneContent = (value: BannerContent): BannerContent => ({ ...value });

const hasDraftChanges = (banner: ManagedBanner) =>
  JSON.stringify(banner.draftContent) !== JSON.stringify(banner.publishedContent);

const PUBLIC_BANNER_ASSET_PREFIX =
  'https://shihabshajib01-cell.github.io/sobaike-janao/illustrations/services/';
const IMMUTABLE_BANNER_ASSET_PREFIX =
  'https://raw.githubusercontent.com/shihabshajib01-cell/sobaike-janao/a05ab893a4cf70034c63b4cdd8d12dd944056944/public/illustrations/services/';

const getBannerImageFallback = (src: string): string | null => {
  if (!src.startsWith(PUBLIC_BANNER_ASSET_PREFIX)) return null;
  return `${IMMUTABLE_BANNER_ASSET_PREFIX}${src.slice(PUBLIC_BANNER_ASSET_PREFIX.length)}`;
};

interface BannerImageProps {
  src: string | null | undefined;
  className: string;
  placeholderClassName?: string;
  loading?: 'eager' | 'lazy';
}

const BannerImage: React.FC<BannerImageProps> = ({
  src,
  className,
  placeholderClassName = 'flex h-full w-full items-center justify-center',
  loading = 'lazy',
}) => {
  const [activeSrc, setActiveSrc] = useState(src || '');
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setActiveSrc(src || '');
    setFailed(!src);
  }, [src]);

  if (failed || !activeSrc) {
    return (
      <div className={placeholderClassName} aria-hidden="true">
        <ImageIcon className="h-10 w-10 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt=""
      aria-hidden="true"
      className={className}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        const fallback = getBannerImageFallback(activeSrc);
        if (fallback && fallback !== activeSrc) {
          setActiveSrc(fallback);
          return;
        }
        setFailed(true);
      }}
    />
  );
};

export const BannersPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [banners, setBanners] = useState<ManagedBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ManagedBanner | null>(null);
  const [form, setForm] = useState<BannerContent | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setBanners(await bannerApi.getAll());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load banners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  useEffect(
    () => () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview]
  );

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => a.draftContent.sortOrder - b.draftContent.sortOrder),
    [banners]
  );

  const openEditor = (banner: ManagedBanner) => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setSelected(banner);
    setForm(cloneContent(banner.draftContent));
    setImageFile(null);
    setImagePreview(banner.draftContent.illustrationSrc);
    setActionError(null);
    setNotice(null);
  };

  const closeEditor = () => {
    if (saving || publishing) return;
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setSelected(null);
    setForm(null);
    setImageFile(null);
    setImagePreview(null);
    setActionError(null);
  };

  const updateField = <K extends keyof BannerContent>(key: K, value: BannerContent[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setActionError(null);
  };

  const saveDraft = async (): Promise<BannerContent | null> => {
    if (!selected || !form) return null;
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const savedContent = await bannerApi.saveDraft(selected.categoryKey, form, imageFile);
      setForm(savedContent);
      setImageFile(null);
      setImagePreview(savedContent.illustrationSrc);
      await loadBanners();
      setNotice(isBn ? 'খসড়া সংরক্ষণ করা হয়েছে।' : 'Draft saved successfully.');
      return savedContent;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to save banner draft.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publishChanges = async () => {
    if (!selected || !form) return;
    setPublishing(true);
    setActionError(null);
    setNotice(null);
    try {
      const savedContent = await bannerApi.saveDraft(selected.categoryKey, form, imageFile);
      setForm(savedContent);
      setImageFile(null);
      await bannerApi.publish(selected.categoryKey);
      await loadBanners();
      setNotice(isBn ? 'ব্যানার প্রকাশ করা হয়েছে।' : 'Banner published successfully.');
      setSelected(null);
      setForm(null);
      setImagePreview(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to publish banner.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isBn ? 'ব্যানার ব্যবস্থাপনা' : 'Banner Management'}
        description={
          isBn
            ? 'হোম হিরো স্লাইডার ও ক্যাটাগরি হিরো ব্যানারের প্রকাশিত কনটেন্ট একই জায়গা থেকে পরিচালনা করুন।'
            : 'Manage the shared content used by the Home hero slider and category hero banners without a code deployment.'
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw />}
            onClick={() => void loadBanners()}
            disabled={loading}
          >
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
        }
      />

      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/60 dark:bg-sky-950/30">
        <p className="text-sm font-medium text-sky-900 dark:text-sky-100">
          {isBn ? 'নিরাপদ কনটেন্ট নিয়ন্ত্রণ' : 'Safe content control'}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-sky-700 dark:text-sky-300">
          {isBn
            ? 'CTA কোথায় যাবে, রিপোর্টিং ফ্লো, স্লাইডার আচরণ এবং ডিজাইন টোকেন কোডে সুরক্ষিত আছে। এখানে শুধু অনুমোদিত ব্যানার কনটেন্ট ও ছবি সম্পাদনা ও প্রকাশ করা যায়।'
            : 'CTA destinations, reporting flow, slider behavior, and design tokens remain protected in code. This module only edits and publishes approved banner content and imagery.'}
        </p>
      </div>

      {notice && !selected && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{loadError}</p>
          <Button className="mt-3" size="sm" onClick={() => void loadBanners()}>
            {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
          </Button>
        </div>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedBanners.map((banner) => {
            const draftChanged = hasDraftChanges(banner);
            const content = banner.publishedContent;
            return (
              <article
                key={banner.categoryKey}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="aspect-[16/7] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <BannerImage
                    src={content.illustrationSrc}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {isBn ? content.titleBn : content.titleEn}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {banner.categoryKey}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                        draftChanged
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}
                    >
                      {draftChanged
                        ? isBn
                          ? 'খসড়া পরিবর্তন'
                          : 'Draft changes'
                        : isBn
                          ? 'প্রকাশিত'
                          : 'Published'}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {isBn ? content.desktopDescriptionBn : content.desktopDescriptionEn}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isBn ? 'ভার্সন' : 'Version'} {banner.version}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Pencil />}
                      onClick={() => openEditor(banner)}
                    >
                      {isBn ? 'সম্পাদনা' : 'Edit'}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={Boolean(selected && form)}
        onClose={closeEditor}
        title={isBn ? 'ব্যানার সম্পাদনা' : 'Edit Banner'}
        description={
          selected
            ? `${selected.categoryKey} · ${isBn ? 'খসড়া → প্রিভিউ → প্রকাশ' : 'Draft → Preview → Publish'}`
            : undefined
        }
        size="xl"
        closeOnBackdrop={!saving && !publishing}
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor} disabled={saving || publishing}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button variant="secondary" onClick={() => void saveDraft()} isLoading={saving} disabled={publishing}>
              {isBn ? 'খসড়া সংরক্ষণ' : 'Save Draft'}
            </Button>
            <Button variant="success" onClick={() => void publishChanges()} isLoading={publishing} disabled={saving}>
              {isBn ? 'সংরক্ষণ ও প্রকাশ' : 'Save & Publish'}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-6">
            {actionError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {actionError}
              </div>
            )}
            {notice && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                {notice}
              </div>
            )}

            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isBn ? 'ব্যানার ছবি' : 'Banner Image'}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isBn ? 'JPG, PNG, WebP বা AVIF · সর্বোচ্চ 5 MB' : 'JPG, PNG, WebP or AVIF · maximum 5 MB'}
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                <BannerImage
                  src={imagePreview}
                  className="aspect-[16/7] w-full object-cover"
                  placeholderClassName="flex aspect-[16/7] w-full items-center justify-center"
                  loading="eager"
                />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                <Upload className="h-4 w-4" />
                {isBn ? 'ছবি পরিবর্তন' : 'Replace image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  onChange={onImageChange}
                />
              </label>
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isBn ? 'হোম ক্যারোসেল' : 'Home Carousel'}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'হোম পেজে এই ব্যানার দেখানো হবে কি না এবং ব্যানারের ক্রম নিয়ন্ত্রণ করুন। ক্যাটাগরি পেজের ব্যানার অপরিবর্তিত থাকবে।'
                    : 'Control whether this banner appears on Home and where it appears in the carousel. The category-page banner remains available.'}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start">
                <Switch
                  checked={form.showOnHome}
                  onChange={(checked) => updateField('showOnHome', checked)}
                  label={isBn ? 'হোমে দেখান' : 'Show on Home'}
                  description={
                    isBn
                      ? 'বন্ধ করলে হোম ক্যারোসেল থেকে ব্যানারটি লুকানো থাকবে।'
                      : 'Turn off to hide this banner from the Home carousel.'
                  }
                />
                <Input
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  label={isBn ? 'ক্রম' : 'Order'}
                  value={form.sortOrder}
                  disabled={!form.showOnHome}
                  onChange={(e) =>
                    updateField(
                      'sortOrder',
                      Math.max(1, Math.min(99, Math.trunc(Number(e.target.value) || 1)))
                    )
                  }
                  helperText={isBn ? '১–৯৯' : '1–99'}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? 'বাংলা কনটেন্ট' : 'Bengali Content'}
              </h2>
              <Input label="শিরোনাম" value={form.titleBn} onChange={(e) => updateField('titleBn', e.target.value)} required />
              <Textarea label="মোবাইল বর্ণনা" value={form.mobileDescriptionBn} onChange={(e) => updateField('mobileDescriptionBn', e.target.value)} rows={2} required />
              <Textarea label="ট্যাবলেট বর্ণনা" value={form.tabletDescriptionBn} onChange={(e) => updateField('tabletDescriptionBn', e.target.value)} rows={2} required />
              <Textarea label="ডেস্কটপ বর্ণনা" value={form.desktopDescriptionBn} onChange={(e) => updateField('desktopDescriptionBn', e.target.value)} rows={3} required />
              <Input label="CTA লেবেল" value={form.primaryCtaBn} onChange={(e) => updateField('primaryCtaBn', e.target.value)} required />
            </section>

            <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? 'ইংরেজি কনটেন্ট' : 'English Content'}
              </h2>
              <Input label="Title" value={form.titleEn} onChange={(e) => updateField('titleEn', e.target.value)} required />
              <Textarea label="Mobile description" value={form.mobileDescriptionEn} onChange={(e) => updateField('mobileDescriptionEn', e.target.value)} rows={2} required />
              <Textarea label="Tablet description" value={form.tabletDescriptionEn} onChange={(e) => updateField('tabletDescriptionEn', e.target.value)} rows={2} required />
              <Textarea label="Desktop description" value={form.desktopDescriptionEn} onChange={(e) => updateField('desktopDescriptionEn', e.target.value)} rows={3} required />
              <Input label="CTA label" value={form.primaryCtaEn} onChange={(e) => updateField('primaryCtaEn', e.target.value)} required />
            </section>

            <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? 'প্রিভিউ' : 'Preview'}
              </h2>
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <BannerImage
                  src={imagePreview}
                  className="aspect-[16/7] w-full object-cover"
                  placeholderClassName="flex aspect-[16/7] w-full items-center justify-center"
                  loading="eager"
                />
                <div className="space-y-2 p-4">
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {isBn ? form.titleBn : form.titleEn}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {isBn ? form.desktopDescriptionBn : form.desktopDescriptionEn}
                  </p>
                  <span className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    {isBn ? form.primaryCtaBn : form.primaryCtaEn}
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BannersPage;
