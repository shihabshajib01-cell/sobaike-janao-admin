import React from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Tag } from '@/components/ui/Tag';
import {
  ReportDuplicateCandidate,
  ReportDuplicateCheckResult,
} from '@/types/Complaint';

interface SourcedReportDuplicateReviewProps {
  isBn: boolean;
  loading: boolean;
  error: string | null;
  result: ReportDuplicateCheckResult | null;
  selectedCandidateId: string | null;
  reviewNote: string;
  isConfirming: boolean;
  onRetry: () => void;
  onSelectCandidate: (candidateId: string | null) => void;
  onReviewNoteChange: (value: string) => void;
  onConfirmDistinct: (candidateId: string) => void;
}

const REASON_LABELS: Record<string, { en: string; bn: string }> = {
  same_subcategory: { en: 'same complaint type', bn: 'একই অভিযোগের ধরন' },
  same_incident_date: { en: 'same incident date', bn: 'একই ঘটনার তারিখ' },
  same_district: { en: 'same district', bn: 'একই জেলা' },
  same_upazila_or_thana: { en: 'same upazila / thana', bn: 'একই উপজেলা / থানা' },
  same_area: { en: 'same area', bn: 'একই এলাকা' },
  same_normalized_title: { en: 'same normalized headline', bn: 'একই স্বাভাবিকীকৃত শিরোনাম' },
  strong_title_overlap: { en: 'strong headline overlap', bn: 'শিরোনামে শক্ত মিল' },
  title_overlap: { en: 'headline overlap', bn: 'শিরোনামে মিল' },
};

function candidateTitle(candidate: ReportDuplicateCandidate, isBn: boolean) {
  return (
    (isBn ? candidate.titleBn || candidate.titleEn : candidate.titleEn || candidate.titleBn) ||
    candidate.complaintId
  );
}

function candidateLocation(candidate: ReportDuplicateCandidate) {
  return [candidate.area, candidate.upazilaOrThana, candidate.district].filter(Boolean).join(', ');
}

function openComplaint(complaintId: string) {
  const base = `${window.location.origin}${window.location.pathname}`;
  window.open(`${base}#/complaints/${encodeURIComponent(complaintId)}`, '_blank', 'noopener,noreferrer');
}

export const SourcedReportDuplicateReview: React.FC<SourcedReportDuplicateReviewProps> = ({
  isBn,
  loading,
  error,
  result,
  selectedCandidateId,
  reviewNote,
  isConfirming,
  onRetry,
  onSelectCandidate,
  onReviewNoteChange,
  onConfirmDistinct,
}) => {
  if (loading) {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
        <p className="font-semibold">
          {isBn ? 'ডুপ্লিকেট ঘটনা যাচাই হচ্ছে…' : 'Checking for duplicate incidents…'}
        </p>
        <p className="mt-1">
          {isBn
            ? 'যাচাই শেষ না হওয়া পর্যন্ত প্রকাশ বন্ধ থাকবে।'
            : 'Publishing stays disabled until the check completes.'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {isBn ? 'ডুপ্লিকেট যাচাই সম্পন্ন হয়নি' : 'Duplicate check could not be completed'}
            </p>
            <p className="mt-1 break-words">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              leftIcon={<RefreshCw />}
              onClick={onRetry}
            >
              <span>{isBn ? 'আবার যাচাই করুন' : 'Retry Check'}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!result || !result.applicable) return null;

  if (result.status === 'clear') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              {isBn ? 'ডুপ্লিকেট ঘটনা পাওয়া যায়নি' : 'No duplicate incident found'}
            </p>
            <p className="mt-1">
              {isBn
                ? 'বর্তমান উৎস ও ঘটনার তথ্য অনুযায়ী রিপোর্টটি প্রকাশের জন্য ডুপ্লিকেট যাচাই পাস করেছে। প্রকাশের মুহূর্তে সার্ভার আবার যাচাই করবে।'
                : 'The report passed the duplicate check using its current source and incident data. The server will check again at publication time.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasExactSource = result.status === 'exact' || result.exactSourceDuplicates.length > 0;

  return (
    <div className="space-y-3">
      <div
        className={
          hasExactSource || result.status === 'match'
            ? 'rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            : 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
        }
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              {hasExactSource
                ? isBn
                  ? 'এই উৎসটি ইতিমধ্যে ব্যবহার করা হয়েছে'
                  : 'This source is already in the system'
                : result.status === 'match'
                  ? isBn
                    ? 'সম্ভবত একই ঘটনার রিপোর্ট ইতিমধ্যে আছে'
                    : 'A likely duplicate incident already exists'
                  : isBn
                    ? 'একই ধরনের সম্ভাব্য ঘটনা পাওয়া গেছে'
                    : 'Possible duplicate incidents need review'}
            </p>
            <p className="mt-1">
              {isBn
                ? 'রিভিউ শেষ না হওয়া পর্যন্ত এই সোর্সড রিপোর্ট প্রকাশ করা যাবে না। একই ঘটনা হলে নতুন পোস্ট তৈরি করবেন না।'
                : 'This sourced report cannot be published until review is complete. If it is the same incident, do not create another public post.'}
            </p>
          </div>
        </div>
      </div>

      {result.exactSourceDuplicates.map((duplicate) => (
        <div
          key={`source-${duplicate.complaintId}-${duplicate.canonicalUrl || ''}`}
          className="rounded-lg border border-rose-200 bg-white p-3 dark:border-rose-900 dark:bg-slate-900"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {duplicate.titleBn || duplicate.titleEn || duplicate.complaintId}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {duplicate.complaintId}
            {duplicate.publisherName ? ` · ${duplicate.publisherName}` : ''}
          </p>
          {duplicate.canonicalUrl && (
            <a
              href={duplicate.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all text-xs text-sky-700 underline underline-offset-2 dark:text-sky-300"
            >
              {duplicate.canonicalUrl}
            </a>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            leftIcon={<ExternalLink />}
            onClick={() => openComplaint(duplicate.complaintId)}
          >
            <span>{isBn ? 'বিদ্যমান রিপোর্ট খুলুন' : 'Open Existing Report'}</span>
          </Button>
          <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
            {isBn
              ? 'একই উৎসকে আলাদা ঘটনা হিসেবে ওভাররাইড করা যাবে না।'
              : 'An exact source duplicate cannot be overridden as a separate incident.'}
          </p>
        </div>
      ))}

      {result.candidates.map((candidate) => {
        const isSelected = selectedCandidateId === candidate.complaintId;
        const reasons = candidate.reasons
          .map((reason) => REASON_LABELS[reason]?.[isBn ? 'bn' : 'en'] || reason)
          .filter(Boolean);

        return (
          <div
            key={candidate.complaintId}
            className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {candidateTitle(candidate, isBn)}
                  </p>
                  <Tag tone={candidate.matchLevel === 'match' ? 'danger' : 'warning'}>
                    {candidate.matchLevel === 'match'
                      ? isBn
                        ? 'শক্ত মিল'
                        : 'Likely Match'
                      : isBn
                        ? 'রিভিউ প্রয়োজন'
                        : 'Review'}
                  </Tag>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {candidate.complaintId}
                  {candidate.incidentDate ? ` · ${candidate.incidentDate}` : ''}
                  {candidateLocation(candidate) ? ` · ${candidateLocation(candidate)}` : ''}
                </p>
                {reasons.length > 0 && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">
                      {isBn ? 'মিলের কারণ:' : 'Why it matched:'}
                    </span>{' '}
                    {reasons.join(', ')}
                  </p>
                )}
                {candidate.sources.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold">
                      {isBn ? 'বিদ্যমান উৎস:' : 'Existing source:'}
                    </span>{' '}
                    {candidate.sources
                      .map((source) => source.publisherName || source.sourceTitle || source.canonicalUrl)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ExternalLink />}
                onClick={() => openComplaint(candidate.complaintId)}
              >
                <span>{isBn ? 'বিদ্যমান রিপোর্ট খুলুন' : 'Open Existing Report'}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ShieldCheck />}
                onClick={() => onSelectCandidate(isSelected ? null : candidate.complaintId)}
              >
                <span>{isBn ? 'আলাদা ঘটনা হিসেবে নিশ্চিত করুন' : 'Confirm Separate Incident'}</span>
              </Button>
            </div>

            {isSelected && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <Textarea
                  label={isBn ? 'রিভিউ নোট *' : 'Review Note *'}
                  value={reviewNote}
                  onChange={(event) => onReviewNoteChange(event.target.value)}
                  rows={2}
                  placeholder={
                    isBn
                      ? 'কেন এটি আলাদা ঘটনা—তারিখ, স্থান, ব্যক্তি বা ঘটনার পার্থক্য লিখুন…'
                      : 'Explain why this is a separate incident—different place, people, event facts, or other evidence…'
                  }
                  disabled={isConfirming}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'এই সিদ্ধান্ত অডিট লগে সংরক্ষিত হবে। ঘটনার মূল তথ্য পরে বদলালে সিদ্ধান্তটি স্বয়ংক্রিয়ভাবে বাতিল হবে এবং আবার যাচাই লাগবে।'
                    : 'This decision is audited. If incident-defining data changes later, the override expires automatically and review is required again.'}
                </p>
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isConfirming}
                    disabled={reviewNote.trim().length < 8 || isConfirming}
                    onClick={() => onConfirmDistinct(candidate.complaintId)}
                  >
                    <span>{isBn ? 'আলাদা ঘটনা নিশ্চিত করুন' : 'Confirm as Separate'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!hasExactSource && result.candidates.length > 0 && (
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {isBn
            ? 'একই ঘটনা হলে এই ডায়ালগ বন্ধ করে বর্তমান রিপোর্টটি “Duplicate” কারণ দিয়ে বাতিল করুন। পরে সোর্স-মার্জ ও আপডেট ফ্লো একই ডুপ্লিকেট ইঞ্জিন ব্যবহার করবে।'
            : 'If this is the same incident, close this dialog and reject the current report as Duplicate. The upcoming source-merge/update flow will use this same duplicate engine.'}
        </p>
      )}
    </div>
  );
};

export default SourcedReportDuplicateReview;
