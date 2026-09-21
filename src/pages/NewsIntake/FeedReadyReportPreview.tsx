import React from 'react';
import {
  BatteryCharging,
  Building2,
  Eye,
  HeartHandshake,
  MapPin,
  Newspaper,
  Share2,
  ShieldAlert,
  ShieldCheck,
  TrafficCone,
  ZapOff,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tag } from '@/components/ui/Tag';
import { Complaint } from '@/types/Complaint';
import { NewsIntakeReport } from '@/types/NewsIntake';

interface FeedReadyReportPreviewProps {
  complaint?: Complaint;
  stagedReport?: NewsIntakeReport;
  previewId?: string;
  isBn: boolean;
  selected: boolean;
  publishable?: boolean;
  disabled?: boolean;
  categoryLabelBn?: string;
  categoryLabelEn?: string;
  onToggle: () => void;
}

const DEFAULT_CATEGORY_STYLE = {
  labelBn: 'ক্যাটাগরি',
  labelEn: 'Category',
  badgeClass:
    'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  icon: Newspaper,
};

const CATEGORY_STYLES: Record<
  string,
  {
    labelBn: string;
    labelEn: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  }
> = {
  harassment: {
    labelBn: 'হয়রানি',
    labelEn: 'Harassment',
    badgeClass:
      'border-[#D2A5B4] bg-[#E9D2DA] text-[#7C3850] dark:border-[#694052] dark:bg-[#2B1B21] dark:text-[#F0C4D2]',
    icon: HeartHandshake,
  },
  extortion: {
    labelBn: 'চাঁদাবাজি ও ঘুষ',
    labelEn: 'Extortion & Bribery',
    badgeClass:
      'border-[#D6AA97] bg-[#EAD4CB] text-[#813F23] dark:border-[#704532] dark:bg-[#2C1D17] dark:text-[#F1C6B4]',
    icon: ShieldAlert,
  },
  public_safety: {
    labelBn: 'জননিরাপত্তা',
    labelEn: 'Public Safety',
    badgeClass:
      'border-[#BBACC2] bg-[#DDD6E1] text-[#594464] dark:border-[#5A4962] dark:bg-[#241D28] dark:text-[#E1CFE8]',
    icon: ShieldCheck,
  },
  road_transport: {
    labelBn: 'সড়ক ও যাতায়াত',
    labelEn: 'Road & Transport',
    badgeClass:
      'border-[#C8AEA0] bg-[#E4D6D0] text-[#6D4532] dark:border-[#62483B] dark:bg-[#291F1B] dark:text-[#E8CABB]',
    icon: TrafficCone,
  },
  load_shedding: {
    labelBn: 'ইউটিলিটি',
    labelEn: 'Utility',
    badgeClass:
      'border-[#ABC6C5] bg-[#D5E2E2] text-[#416968] dark:border-[#3D5F5E] dark:bg-[#172625] dark:text-[#C1E0DF]',
    icon: ZapOff,
  },
  illegal_occupation: {
    labelBn: 'অবৈধ দখল',
    labelEn: 'Illegal Occupation',
    badgeClass:
      'border-[#CC9E9E] bg-[#E5CECF] text-[#722E2E] dark:border-[#673B3C] dark:bg-[#2A1A1B] dark:text-[#F0BFC0]',
    icon: Building2,
  },
  rickshaw: {
    labelBn: 'চার্জিং',
    labelEn: 'Charging',
    badgeClass:
      'border-[#8CBDAA] bg-[#C6DED5] text-[#135C40] dark:border-[#315E4C] dark:bg-[#14251E] dark:text-[#B5DDCC]',
    icon: BatteryCharging,
  },
};

const hasBanglaScript = (value?: string | null) =>
  Boolean(value && /[ঀ-৿]/u.test(value));

const hasLatinScript = (value?: string | null) =>
  Boolean(value && /[A-Za-z]/.test(value));

const safeBanglaFallback = (value?: string | null) =>
  value && hasBanglaScript(value) && !hasLatinScript(value) ? value : '';

const safeEnglishFallback = (value?: string | null) =>
  value && hasLatinScript(value) && !hasBanglaScript(value) ? value : '';

const getPublicTitle = (complaint: Complaint, isBn: boolean) => {
  const preferences = complaint.publicationPreferences;
  if (isBn) {
    return (
      preferences?.publicTitleBn ||
      complaint.titleBn ||
      preferences?.publicTitleEn ||
      complaint.titleEn ||
      complaint.id
    );
  }
  return (
    preferences?.publicTitleEn ||
    complaint.titleEn ||
    preferences?.publicTitleBn ||
    complaint.titleBn ||
    complaint.id
  );
};

const getPublicSummary = (complaint: Complaint, isBn: boolean) => {
  const preferences = complaint.publicationPreferences;
  if (preferences?.showDescription === false) return '';

  if (isBn) {
    return (
      preferences?.publicSummaryBn ||
      complaint.descriptionBn ||
      preferences?.publicSummaryEn ||
      complaint.descriptionEn ||
      ''
    );
  }
  return (
    preferences?.publicSummaryEn ||
    complaint.descriptionEn ||
    preferences?.publicSummaryBn ||
    complaint.descriptionBn ||
    ''
  );
};

const getPublicLocation = (complaint: Complaint, isBn: boolean) => {
  if (complaint.publicationPreferences?.showGeneralLocation === false) {
    return isBn ? 'অবস্থান গোপন' : 'Location withheld';
  }

  const location = complaint.location;
  const composed = [location?.area, location?.upazilaOrThana, location?.district]
    .filter(Boolean)
    .join(', ');

  if (isBn) {
    return (
      safeBanglaFallback(location?.addressBn) ||
      safeBanglaFallback(location?.formattedAddress) ||
      safeBanglaFallback(composed) ||
      'অবস্থান গোপন'
    );
  }

  return (
    safeEnglishFallback(location?.addressEn) ||
    safeEnglishFallback(location?.formattedAddress) ||
    safeEnglishFallback(composed) ||
    'Location withheld'
  );
};

const getReportedSubject = (complaint: Complaint) => {
  if (complaint.publicationPreferences?.showSubjectName !== true) return '';
  const party = complaint.parties?.find(
    (item) => item.name?.trim() || item.identifyingDescription?.trim()
  );
  return party?.name?.trim() || party?.identifyingDescription?.trim() || '';
};

const getReportedOrganization = (complaint: Complaint) => {
  if (complaint.publicationPreferences?.showOrganization !== true) return '';
  const party = complaint.parties?.find((item) => item.organization?.trim());
  return party?.organization?.trim() || '';
};

const formatAmount = (value: number, isBn: boolean) =>
  new Intl.NumberFormat(isBn ? 'bn-BD' : 'en-BD', {
    maximumFractionDigits: 2,
  }).format(value);

const getPreviewPublishedTime = (complaint: Complaint, isBn: boolean) => {
  if (complaint.status !== 'published') {
    return isBn ? 'এখনই' : 'Just now';
  }

  const timestamp = complaint.updatedAt || complaint.createdAt;
  const published = new Date(timestamp).getTime();
  if (!Number.isFinite(published)) return isBn ? 'প্রকাশিত' : 'Published';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - published) / 60000));
  if (diffMinutes < 60) {
    const value = Math.max(1, diffMinutes);
    return isBn ? `${new Intl.NumberFormat('bn-BD').format(value)} মিনিট আগে` : `${value} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return isBn
      ? `${new Intl.NumberFormat('bn-BD').format(diffHours)} ঘণ্টা আগে`
      : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return isBn
    ? `${new Intl.NumberFormat('bn-BD').format(diffDays)} দিন আগে`
    : `${diffDays}d ago`;
};

export const FeedReadyReportPreview: React.FC<FeedReadyReportPreviewProps> = ({
  complaint,
  stagedReport,
  previewId,
  isBn,
  selected,
  publishable = true,
  disabled = false,
  categoryLabelBn,
  categoryLabelEn,
  onToggle,
}) => {
  const id = complaint?.id || previewId || `staged-${stagedReport?.subcategoryId || 'report'}`;
  const categoryId = complaint?.categoryId || stagedReport?.segmentId || '';
  const subcategoryId = complaint?.subcategoryId || stagedReport?.subcategoryId || '';
  const category = CATEGORY_STYLES[categoryId] || DEFAULT_CATEGORY_STYLE;
  const CategoryIcon = category.icon;

  const title = complaint
    ? getPublicTitle(complaint, isBn)
    : stagedReport?.titleBn || stagedReport?.titleEn || id;
  const summary = complaint
    ? getPublicSummary(complaint, isBn)
    : stagedReport?.descriptionBn || stagedReport?.descriptionEn || '';
  const stagedLocation = [
    stagedReport?.formattedAddress,
    stagedReport?.road,
    stagedReport?.area,
    stagedReport?.upazilaOrThana,
    stagedReport?.district,
  ].find((value) => Boolean(value?.trim())) || '';
  const location = complaint
    ? getPublicLocation(complaint, isBn)
    : stagedLocation || (isBn ? 'অবস্থান গোপন' : 'Location withheld');

  const reportedSubject = complaint ? getReportedSubject(complaint) : '';
  const reportedOrganization = complaint ? getReportedOrganization(complaint) : '';
  const previewPublishedTime = complaint
    ? getPreviewPublishedTime(complaint, isBn)
    : isBn ? 'এখনই' : 'Just now';
  const shouldShowSummary =
    summary.trim().length > 0 && summary.trim() !== title.trim();
  const recentBillAmount = complaint?.recentBillAmount ??
    (stagedReport?.recentBillAmount ? Number(stagedReport.recentBillAmount) : null);
  const previousBillAmount = complaint?.previousBillAmount ??
    (stagedReport?.previousBillAmount ? Number(stagedReport.previousBillAmount) : null);
  const shouldShowBill =
    subcategoryId === 'excess-electricity-bill' ||
    recentBillAmount !== null && recentBillAmount !== undefined;
  const status = String(complaint?.status || 'submitted');
  const statusLabel = publishable
    ? (isBn ? 'ফিড-রেডি' : 'Feed ready')
    : status === 'published'
      ? (isBn ? 'প্রকাশিত' : 'Published')
      : status === 'unpublished'
        ? (isBn ? 'প্রকাশ বন্ধ' : 'Unpublished')
        : (isBn ? 'রিভিউ প্রয়োজন' : 'Needs review');
  const statusTone =
    publishable || status === 'published'
      ? 'success'
      : status === 'submitted'
        ? 'warning'
        : 'neutral';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/70 dark:bg-emerald-950/25">
        <div className="min-w-0">
          <Checkbox
            id={`news-intake-publish-${id}`}
            label={
              publishable
                ? isBn ? 'প্রকাশের জন্য নির্বাচন করুন' : 'Select for publishing'
                : status === 'published'
                  ? isBn ? 'ইতিমধ্যে প্রকাশিত' : 'Already published'
                  : isBn ? 'রিভিউ শেষে নির্বাচন করা যাবে' : 'Review before selection'
            }
            checked={publishable ? selected : false}
            onChange={publishable ? onToggle : () => undefined}
            disabled={disabled || !publishable}
            aria-label={
              publishable
                ? isBn ? `${title} প্রকাশের জন্য নির্বাচন করুন` : `Select ${title} for publishing`
                : status === 'published'
                  ? isBn ? `${title} ইতিমধ্যে প্রকাশিত` : `${title} is already published`
                  : isBn ? `${title} রিভিউ শেষে নির্বাচন করা যাবে` : `Review ${title} before selection`
            }
          />
        </div>
        <Tag tone={statusTone}>{statusLabel}</Tag>
      </div>

      <div
        className={
          publishable && selected
            ? 'rounded-2xl ring-2 ring-emerald-200/70 dark:ring-emerald-900/50'
            : ''
        }
        data-news-intake-preview-selected={publishable && selected ? 'true' : 'false'}
      >
      <article
        className="select-none space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm sm:space-y-3 sm:p-5 dark:border-slate-800 dark:bg-slate-950"
        aria-label={isBn ? 'পাবলিক ফিড প্রিভিউ' : 'Public feed preview'}
      >
        <div className="flex items-center justify-between gap-3 text-sm leading-5">
          <span
            className={`inline-flex min-h-[26px] shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-semibold leading-none ${category.badgeClass}`}
          >
            <CategoryIcon className="size-3.5" aria-hidden="true" />
            <span>{isBn ? (categoryLabelBn || category.labelBn) : (categoryLabelEn || category.labelEn)}</span>
          </span>
          <p className="shrink-0 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
            {previewPublishedTime}
          </p>
        </div>

        <h3 className="type-h3 line-clamp-2 break-words text-slate-950 dark:text-slate-50">
          {title}
        </h3>

        {(reportedSubject || reportedOrganization) && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {isBn ? 'প্রতিবেদনে উল্লিখিত পক্ষ:' : 'Reported subject:'}
            </p>
            <p className="max-w-full truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
              {[reportedSubject, reportedOrganization].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        {shouldShowBill && recentBillAmount !== null && recentBillAmount !== undefined && (
          <div className="flex max-w-full flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isBn ? 'সাম্প্রতিক বিল' : 'Recent bill'}: ৳{formatAmount(recentBillAmount, isBn)}
            </p>
            {previousBillAmount !== null && previousBillAmount !== undefined && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                ({isBn ? 'পূর্বে: ' : 'prev: '}৳{formatAmount(previousBillAmount, isBn)})
              </p>
            )}
          </div>
        )}

        {shouldShowSummary && (
          <p className="line-clamp-2 break-words text-base leading-[26px] text-slate-700 dark:text-slate-300">
            {summary}
          </p>
        )}

        <div className="flex items-center border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <p className="truncate text-sm font-medium text-slate-600 dark:text-slate-400">
              {location}
            </p>
          </div>

          <span className="mx-3 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

          <div
            className="flex shrink-0 items-center gap-1.5 text-slate-600 dark:text-slate-400"
            aria-label={isBn ? '০ ভিউ' : '0 views'}
          >
            <Eye className="size-4" aria-hidden="true" />
            <span className="whitespace-nowrap text-sm">{isBn ? '০' : '0'}</span>
          </div>

          <span className="mx-3 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
            aria-hidden="true"
          >
            <Share2 className="size-4" />
          </span>
        </div>
      </article>
      </div>
    </div>
  );
};

export default FeedReadyReportPreview;
