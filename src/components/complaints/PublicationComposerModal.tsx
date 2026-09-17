import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Share2, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useLanguage } from '@/context/LanguageContext';
import { Complaint, ComplaintPublicationDraft, ComplaintTimelineEvent } from '@/types/Complaint';
import { complaintApi } from '@/services';
import { publishComplaintPresentation } from '@/services/api/publicationApi';

interface PublicationComposerModalProps {
  isOpen: boolean;
  complaint: Complaint;
  onClose: () => void;
  onComplaintUpdated?: (
    complaint: Complaint,
    timeline: ComplaintTimelineEvent[],
    timelineError?: string | null
  ) => void;
  onPublished?: (message: string) => void;
}

function initialDraft(complaint: Complaint): ComplaintPublicationDraft {
  const prefs = complaint.publicationPreferences;
  return {
    publicTitleBn: prefs?.publicTitleBn || complaint.titleBn || '',
    publicTitleEn: prefs?.publicTitleEn || complaint.titleEn || '',
    publicSummaryBn: prefs?.publicSummaryBn || complaint.descriptionBn || '',
    publicSummaryEn: prefs?.publicSummaryEn || complaint.descriptionEn || '',
  };
}

export const PublicationComposerModal: React.FC<PublicationComposerModalProps> = ({
  isOpen,
  complaint,
  onClose,
  onComplaintUpdated,
  onPublished,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [draft, setDraft] = useState<ComplaintPublicationDraft>(() => initialDraft(complaint));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialDraft(complaint));
      setError(null);
    }
  }, [isOpen, complaint]);

  const showDescription = complaint.publicationPreferences?.showDescription === true;
  const showLocation = complaint.publicationPreferences?.showGeneralLocation === true;

  const previewTitle = useMemo(
    () => (isBn ? draft.publicTitleBn || draft.publicTitleEn : draft.publicTitleEn || draft.publicTitleBn).trim(),
    [draft.publicTitleBn, draft.publicTitleEn, isBn]
  );
  const previewSummary = useMemo(
    () => (isBn ? draft.publicSummaryBn || draft.publicSummaryEn : draft.publicSummaryEn || draft.publicSummaryBn).trim(),
    [draft.publicSummaryBn, draft.publicSummaryEn, isBn]
  );
  const previewCategory = isBn ? complaint.categoryBn : complaint.categoryEn;
  const previewSubcategory = isBn ? complaint.subcategoryBn : complaint.subcategoryEn;
  const previewLocation = showLocation
    ? complaint.location?.addressBn || complaint.location?.addressEn || complaint.location?.ward || complaint.location?.zone || ''
    : '';

  const setField = (field: keyof ComplaintPublicationDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handlePublish = async () => {
    if (!draft.publicTitleBn.trim() && !draft.publicTitleEn.trim()) {
      setError(
        isBn
          ? 'প্রকাশের আগে অন্তত একটি পাবলিক শিরোনাম দিন।'
          : 'Add at least one public headline before publishing.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await publishComplaintPresentation(complaint.id, draft);
      const refreshed = await complaintApi.getComplaintDetail(complaint.id, {
        loadEvidence: false,
        loadReporterLocation: false,
      });

      if (!refreshed) {
        throw new Error(`Failed to reload complaint ${complaint.id} after publication.`);
      }

      const preservedComplaint: Complaint = {
        ...refreshed.complaint,
        media:
          refreshed.complaint.media && refreshed.complaint.media.length > 0
            ? refreshed.complaint.media
            : complaint.media,
      };

      onComplaintUpdated?.(
        preservedComplaint,
        refreshed.timeline,
        refreshed.timelineError || null
      );
      onPublished?.(
        isBn
          ? 'অভিযোগটি প্রস্তুত করা পাবলিক শিরোনাম ও সারাংশসহ প্রকাশিত হয়েছে।'
          : 'Complaint published with the prepared public headline and summary.'
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'পাবলিক পোস্ট প্রস্তুত ও প্রকাশ' : 'Prepare & Publish Public Post'}
      description={
        isBn
          ? `অভিযোগ ${complaint.id}-এর মূল নাগরিক তথ্য অপরিবর্তিত রেখে পাবলিক ফিডের উপস্থাপনাটি প্রস্তুত করুন।`
          : `Prepare the public presentation for complaint ${complaint.id} without changing the citizen's original submission.`
      }
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <p className="hidden text-xs text-slate-500 sm:block">
            {isBn ? 'মূল অভিযোগ অপরিবর্তিত থাকবে' : 'Original complaint remains unchanged'}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handlePublish}
              leftIcon={<Share2 className="h-3.5 w-3.5" />}
              className="bg-sky-600 text-white hover:bg-sky-700"
            >
              <span>{isBn ? 'পাবলিক ফিডে প্রকাশ করুন' : 'Publish Live'}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid max-h-[72vh] grid-cols-1 gap-5 overflow-y-auto pr-1 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {isBn ? 'মূল নাগরিক জমা' : 'Original citizen submission'}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
              {isBn ? complaint.titleBn || complaint.titleEn : complaint.titleEn || complaint.titleBn}
            </p>
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {isBn
                ? complaint.descriptionBn || complaint.descriptionEn
                : complaint.descriptionEn || complaint.descriptionBn}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={isBn ? 'পাবলিক শিরোনাম (বাংলা)' : 'Public Headline (Bangla)'}
              value={draft.publicTitleBn}
              onChange={(event) => setField('publicTitleBn', event.target.value)}
              placeholder="পাবলিক ফিডে দেখানো শিরোনাম..."
              disabled={isSubmitting}
            />
            <Input
              label={isBn ? 'পাবলিক শিরোনাম (ইংরেজি)' : 'Public Headline (English)'}
              value={draft.publicTitleEn}
              onChange={(event) => setField('publicTitleEn', event.target.value)}
              placeholder="Headline shown on the public feed..."
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Textarea
              label={isBn ? 'পাবলিক সারাংশ (বাংলা)' : 'Public Summary (Bangla)'}
              value={draft.publicSummaryBn}
              onChange={(event) => setField('publicSummaryBn', event.target.value)}
              rows={4}
              disabled={isSubmitting || !showDescription}
            />
            <Textarea
              label={isBn ? 'পাবলিক সারাংশ (ইংরেজি)' : 'Public Summary (English)'}
              value={draft.publicSummaryEn}
              onChange={(event) => setField('publicSummaryEn', event.target.value)}
              rows={4}
              disabled={isSubmitting || !showDescription}
            />
          </div>

          {!showDescription && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {isBn
                ? 'নাগরিকের প্রকাশনা পছন্দ অনুযায়ী বিবরণ পাবলিক ফিডে দেখানো হবে না।'
                : 'The citizen publication preference does not allow the description to appear publicly.'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isBn ? 'পাবলিক কার্ড প্রিভিউ' : 'Public card preview'}
            </p>
            <Eye className="h-4 w-4 text-slate-400" />
          </div>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                  {previewCategory}
                </span>
                {previewSubcategory && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {previewSubcategory}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold leading-7 text-slate-950 dark:text-white">
                {previewTitle || (isBn ? 'পাবলিক শিরোনাম লিখুন' : 'Enter a public headline')}
              </h3>

              {showDescription && previewSummary && (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {previewSummary}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <div className="flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {previewLocation || (isBn ? 'অবস্থান গোপন' : 'Location withheld')}
                  </span>
                </div>
                <span>{isBn ? 'প্রকাশের পর' : 'After publish'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <span className="text-xs text-slate-500">{isBn ? 'শেয়ার' : 'Share'}</span>
              <span className="text-xs font-medium text-sky-700 dark:text-sky-300">
                {isBn ? 'বিস্তারিত' : 'Details'}
              </span>
            </div>
          </article>

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {isBn
              ? 'প্রিভিউটি পাবলিক ফিডের একই তথ্য-ক্রম অনুসরণ করে: ক্যাটাগরি → শিরোনাম → সারাংশ → অবস্থান → অ্যাকশন।'
              : 'The preview follows the live feed information hierarchy: category → headline → summary → location → actions.'}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default PublicationComposerModal;
