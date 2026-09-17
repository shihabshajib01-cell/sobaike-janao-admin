import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Lock, MapPin, Save, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useLanguage } from '@/context/LanguageContext';
import { complaintApi } from '@/services';
import { publicationApi } from '@/services/api/publicationApi';
import {
  Complaint,
  ComplaintPublicationDraft,
  ComplaintTimelineEvent,
} from '@/types/Complaint';

export interface PublicationEditorModalProps {
  complaint: Complaint;
  isOpen: boolean;
  onClose: () => void;
  onComplaintUpdated?: (
    complaint: Complaint,
    timeline: ComplaintTimelineEvent[],
    timelineError?: string | null
  ) => void;
}

const TITLE_LIMIT = 180;
const SUMMARY_LIMIT = 220;

const normalize = (value?: string | null) =>
  (value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');

const truncateAtWord = (value: string, limit: number) => {
  const clean = value.trim().replace(/\s+/g, ' ');
  if (clean.length <= limit) return clean;
  const clipped = clean.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
};

const isGenericTitle = (title: string, complaint: Complaint) => {
  const candidate = normalize(title);
  if (!candidate) return true;

  const labels = [
    complaint.categoryBn,
    complaint.categoryEn,
    complaint.subcategoryBn,
    complaint.subcategoryEn,
    complaint.subcategoryId,
  ]
    .map(normalize)
    .filter(Boolean);

  return labels.some(
    (label) =>
      label === candidate ||
      (candidate.length >= 4 && label.includes(candidate)) ||
      (label.length >= 4 && candidate.includes(label))
  );
};

const buildSuggestedTitleBn = (complaint: Complaint, location: string) => {
  const prefix = location ? `${location}-এ ` : '';

  switch (complaint.subcategoryId) {
    case 'bribe-demanded-service':
      return `${prefix}ঘুষের অভিযোগ`;
    case 'shop-business':
      return `${prefix}দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদাবাজির অভিযোগ`;
    case 'transport-movement':
      return `${prefix}পরিবহন খাতে চাঁদাবাজির অভিযোগ`;
    case 'construction-property':
      return `${prefix}নির্মাণ/সম্পত্তি সংক্রান্ত চাঁদাবাজির অভিযোগ`;
    case 'threat-money-demand':
      return `${prefix}হুমকি দিয়ে টাকা দাবির অভিযোগ`;
    default: {
      const label = complaint.subcategoryBn || complaint.categoryBn || 'ঘটনা';
      return `${prefix}${label} সংক্রান্ত অভিযোগ`;
    }
  }
};

const buildSuggestedTitleEn = (complaint: Complaint, location: string) => {
  const suffix = location ? ` in ${location}` : '';

  switch (complaint.subcategoryId) {
    case 'bribe-demanded-service':
      return `Bribery complaint reported${suffix}`;
    case 'shop-business':
      return `Extortion from shops and businesses reported${suffix}`;
    case 'transport-movement':
      return `Transport extortion complaint reported${suffix}`;
    case 'construction-property':
      return `Construction or property extortion reported${suffix}`;
    case 'threat-money-demand':
      return `Coercive money demand reported${suffix}`;
    default: {
      const label = complaint.subcategoryEn || complaint.categoryEn || 'Incident';
      return `${label} complaint reported${suffix}`;
    }
  }
};

const buildInitialDraft = (complaint: Complaint): ComplaintPublicationDraft => {
  const preferences = complaint.publicationPreferences;
  const canShowLocation = preferences?.showGeneralLocation === true;
  const canShowDescription = preferences?.showDescription === true;
  const location = canShowLocation
    ? complaint.location?.ward?.trim() || complaint.location?.zone?.trim() || ''
    : '';

  const rawTitleBn = complaint.titleBn?.trim() || '';
  const rawTitleEn = complaint.titleEn?.trim() || '';

  const publicTitleBn =
    preferences?.publicTitleBn?.trim() ||
    (!isGenericTitle(rawTitleBn, complaint) ? rawTitleBn : '') ||
    buildSuggestedTitleBn(complaint, location);

  const publicTitleEn =
    preferences?.publicTitleEn?.trim() ||
    (!isGenericTitle(rawTitleEn, complaint) ? rawTitleEn : '') ||
    buildSuggestedTitleEn(complaint, location);

  const descriptionBn = complaint.descriptionBn?.trim() || complaint.descriptionEn?.trim() || '';
  const descriptionEn = complaint.descriptionEn?.trim() || complaint.descriptionBn?.trim() || '';

  return {
    publicTitleBn: truncateAtWord(publicTitleBn, TITLE_LIMIT),
    publicTitleEn: truncateAtWord(publicTitleEn, TITLE_LIMIT),
    publicSummaryBn: canShowDescription
      ? truncateAtWord(preferences?.publicSummaryBn || descriptionBn, SUMMARY_LIMIT)
      : '',
    publicSummaryEn: canShowDescription
      ? truncateAtWord(preferences?.publicSummaryEn || descriptionEn, SUMMARY_LIMIT)
      : '',
  };
};

export const PublicationEditorModal: React.FC<PublicationEditorModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onComplaintUpdated,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [previewLanguage, setPreviewLanguage] = useState<'bn' | 'en'>(language);
  const [draft, setDraft] = useState<ComplaintPublicationDraft>(() =>
    buildInitialDraft(complaint)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const canShowDescription = complaint.publicationPreferences?.showDescription === true;
  const canShowLocation = complaint.publicationPreferences?.showGeneralLocation === true;

  useEffect(() => {
    if (!isOpen) return;
    setDraft(buildInitialDraft(complaint));
    setPreviewLanguage(language);
    setError(null);
    setSavedMessage(null);
  }, [complaint, isOpen, language]);

  const preview = useMemo(() => {
    const bn = previewLanguage === 'bn';
    const title = bn
      ? draft.publicTitleBn || draft.publicTitleEn
      : draft.publicTitleEn || draft.publicTitleBn;
    const summary = canShowDescription
      ? bn
        ? draft.publicSummaryBn || draft.publicSummaryEn
        : draft.publicSummaryEn || draft.publicSummaryBn
      : '';
    const category = bn ? complaint.categoryBn : complaint.categoryEn;
    const location = canShowLocation
      ? complaint.location?.addressBn ||
        complaint.location?.addressEn ||
        complaint.location?.ward ||
        complaint.location?.zone ||
        (bn ? 'অবস্থান গোপন' : 'Location withheld')
      : bn
        ? 'অবস্থান গোপন'
        : 'Location withheld';
    const publishedDate = new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date());

    return { title, summary, category, location, publishedDate };
  }, [
    canShowDescription,
    canShowLocation,
    complaint.categoryBn,
    complaint.categoryEn,
    complaint.location,
    draft,
    previewLanguage,
  ]);

  const updateDraft = (key: keyof ComplaintPublicationDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSavedMessage(null);
  };

  const refreshComplaint = async () => {
    const refreshed = await complaintApi.getComplaintDetail(complaint.id, {
      loadEvidence: false,
      loadReporterLocation: false,
    });

    if (refreshed && onComplaintUpdated) {
      onComplaintUpdated(
        refreshed.complaint,
        refreshed.timeline,
        refreshed.timelineError || null
      );
    }
  };

  const validateForPublish = () => {
    if (!draft.publicTitleBn.trim() && !draft.publicTitleEn.trim()) {
      setError(
        isBn
          ? 'প্রকাশের আগে অন্তত একটি পাবলিক শিরোনাম প্রয়োজন।'
          : 'At least one public headline is required before publishing.'
      );
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      await publicationApi.saveDraft(complaint.id, draft);
      await refreshComplaint();
      setSavedMessage(
        isBn
          ? 'পাবলিক পোস্টের খসড়া সংরক্ষণ করা হয়েছে।'
          : 'Public post draft saved.'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save publication draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validateForPublish()) return;

    setIsPublishing(true);
    setError(null);
    setSavedMessage(null);
    try {
      await publicationApi.publish(complaint.id, draft);
      await refreshComplaint();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish complaint.');
    } finally {
      setIsPublishing(false);
    }
  };

  const busy = isSaving || isPublishing;
  const originalTitle = isBn
    ? complaint.titleBn || complaint.titleEn
    : complaint.titleEn || complaint.titleBn;
  const originalDescription = isBn
    ? complaint.descriptionBn || complaint.descriptionEn
    : complaint.descriptionEn || complaint.descriptionBn;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'পাবলিক পোস্ট প্রস্তুত করুন' : 'Prepare Public Post'}
      description={
        isBn
          ? `অভিযোগ ${complaint.id} এর মূল তথ্য অপরিবর্তিত রেখে পাবলিক ফিডের উপস্থাপনাটি প্রস্তুত করুন।`
          : `Prepare the public presentation for complaint ${complaint.id} without changing the citizen submission.`
      }
      size="xl"
      className="max-w-5xl"
      closeOnBackdrop={!busy}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveDraft}
              isLoading={isSaving}
              disabled={isPublishing}
              leftIcon={<Save className="h-3.5 w-3.5" />}
            >
              {isBn ? 'খসড়া সংরক্ষণ' : 'Save Draft'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePublish}
              isLoading={isPublishing}
              disabled={isSaving}
              leftIcon={<Share2 className="h-3.5 w-3.5" />}
              className="bg-sky-600 text-white hover:bg-sky-700"
            >
              {isBn ? 'পাবলিশ করুন' : 'Publish Live'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        )}
        {savedMessage && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            {savedMessage}
          </p>
        )}

        <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isBn ? 'নাগরিকের মূল প্রতিবেদন — শুধু দেখার জন্য' : 'Citizen Submission — Read Only'}
            </h4>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {originalTitle || complaint.id}
          </p>
          {originalDescription && (
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {originalDescription}
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isBn ? 'পাবলিক উপস্থাপনা' : 'Public Presentation'}
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'এই শিরোনাম ও সংক্ষিপ্তসারই পাবলিক কার্ডে ব্যবহৃত হবে। মূল অভিযোগ পরিবর্তন হবে না।'
                  : 'These fields are used by the public card. The original complaint remains unchanged.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Input
                  label={isBn ? 'পাবলিক শিরোনাম (বাংলা)' : 'Public Headline (Bangla)'}
                  value={draft.publicTitleBn}
                  onChange={(event) => updateDraft('publicTitleBn', event.target.value)}
                  maxLength={TITLE_LIMIT}
                  disabled={busy}
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {draft.publicTitleBn.length}/{TITLE_LIMIT}
                </p>
              </div>
              <div>
                <Input
                  label={isBn ? 'পাবলিক শিরোনাম (ইংরেজি)' : 'Public Headline (English)'}
                  value={draft.publicTitleEn}
                  onChange={(event) => updateDraft('publicTitleEn', event.target.value)}
                  maxLength={TITLE_LIMIT}
                  disabled={busy}
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {draft.publicTitleEn.length}/{TITLE_LIMIT}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Textarea
                  label={isBn ? 'পাবলিক সংক্ষিপ্তসার (বাংলা)' : 'Public Summary (Bangla)'}
                  value={draft.publicSummaryBn}
                  onChange={(event) => updateDraft('publicSummaryBn', event.target.value)}
                  rows={5}
                  maxLength={SUMMARY_LIMIT}
                  disabled={busy || !canShowDescription}
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {draft.publicSummaryBn.length}/{SUMMARY_LIMIT}
                </p>
              </div>
              <div>
                <Textarea
                  label={isBn ? 'পাবলিক সংক্ষিপ্তসার (ইংরেজি)' : 'Public Summary (English)'}
                  value={draft.publicSummaryEn}
                  onChange={(event) => updateDraft('publicSummaryEn', event.target.value)}
                  rows={5}
                  maxLength={SUMMARY_LIMIT}
                  disabled={busy || !canShowDescription}
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {draft.publicSummaryEn.length}/{SUMMARY_LIMIT}
                </p>
              </div>
            </div>

            {!canShowDescription && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                {isBn
                  ? 'নাগরিক বিস্তারিত বিবরণ প্রকাশের অনুমতি দেননি। তাই পাবলিক সংক্ষিপ্তসার কার্ডে দেখানো হবে না।'
                  : 'The citizen did not permit the description to be published, so the public summary will remain hidden.'}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isBn ? 'পাবলিক কার্ড প্রিভিউ' : 'Public Card Preview'}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isBn ? 'লাইভ ফিডের কনটেন্ট হায়ারার্কি' : 'Live-feed content hierarchy'}
                </p>
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setPreviewLanguage('bn')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${previewLanguage === 'bn' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  বাংলা
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLanguage('en')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${previewLanguage === 'en' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  EN
                </button>
              </div>
            </div>

            <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div>
                <p className="inline-flex min-h-[26px] items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {preview.category}
                </p>
              </div>

              <h3 className="line-clamp-2 break-words text-[17px] font-bold leading-[1.4] text-slate-950 dark:text-slate-50 md:text-[20px] md:font-semibold md:leading-[30px]">
                {preview.title || (previewLanguage === 'bn' ? 'পাবলিক শিরোনাম' : 'Public headline')}
              </h3>

              {preview.summary && (
                <p className="line-clamp-3 break-words text-sm font-normal leading-[1.55] text-slate-600 dark:text-slate-300 md:text-base md:leading-[26px]">
                  {preview.summary}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="flex min-w-0 items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <p className="max-w-[190px] truncate">{preview.location}</p>
                  </div>
                  <p aria-hidden="true">•</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                    <p>{preview.publishedDate}</p>
                  </div>
                </div>
                <p className="shrink-0 font-semibold text-slate-800 dark:text-slate-200">
                  {previewLanguage === 'bn' ? 'বিস্তারিত →' : 'Details →'}
                </p>
              </div>
            </article>

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              {canShowLocation
                ? isBn
                  ? 'লোকেশন নাগরিকের প্রকাশনা পছন্দ অনুযায়ী দেখানো হচ্ছে।'
                  : 'Location is shown according to the citizen publication preference.'
                : isBn
                  ? 'নাগরিকের পছন্দ অনুযায়ী লোকেশন গোপন থাকবে।'
                  : 'Location remains withheld according to the citizen preference.'}
            </p>
          </section>
        </div>
      </div>
    </Modal>
  );
};

export default PublicationEditorModal;
