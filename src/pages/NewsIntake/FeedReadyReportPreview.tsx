import React from 'react';
import {
  Banknote,
  BatteryCharging,
  Building2,
  Car,
  Eye,
  Heart,
  MapPin,
  Share2,
  Shield,
  Zap,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tag } from '@/components/ui/Tag';
import { Complaint } from '@/types/Complaint';

interface FeedReadyReportPreviewProps {
  complaint: Complaint;
  isBn: boolean;
  selected: boolean;
  publishable?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

const CATEGORY_STYLES: Record<
  string,
  {
    labelBn: string;
    labelEn: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  harassment: {
    labelBn: 'হয়রানি',
    labelEn: 'Harassment',
    badgeClass: 'border-[#D2A5B4] bg-[#E9D2DA] text-[#7C3850]',
    icon: Heart,
  },
  extortion: {
    labelBn: 'চাঁদাবাজি ও ঘুষ',
    labelEn: 'Extortion & Bribery',
    badgeClass: 'border-[#D6AA97] bg-[#EAD4CB] text-[#813F23]',
    icon: Banknote,
  },
  public_safety: {
    labelBn: 'জননিরাপত্তা',
    labelEn: 'Public Safety',
    badgeClass: 'border-[#BBACC2] bg-[#DDD6E1] text-[#594464]',
    icon: Shield,
  },
  road_transport: {
    labelBn: 'সড়ক ও যাতায়াত',
    labelEn: 'Road & Transport',
    badgeClass: 'border-[#C8AEA0] bg-[#E4D6D0] text-[#6D4532]',
    icon: Car,
  },
  load_shedding: {
    labelBn: 'ইউটিলিটি',
    labelEn: 'Utility',
    badgeClass: 'border-[#ABC6C5] bg-[#D5E2E2] text-[#416968]',
    icon: Zap,
  },
  illegal_occupation: {
    labelBn: 'অবৈধ দখল',
    labelEn: 'Illegal Occupation',
    badgeClass: 'border-[#C59A9B] bg-[#E5CECF] text-[#722E2F]',
    icon: Building2,
  },
  rickshaw: {
    labelBn: 'চার্জিং',
    labelEn: 'Charging',
    badgeClass: 'border-[#9AC5B2] bg-[#D2E5DC] text-[#356B54]',
    icon: BatteryCharging,
  },
};

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
  return (
    location?.formattedAddress ||
    [location?.area, location?.upazilaOrThana, location?.district]
      .filter(Boolean)
      .join(', ') ||
    location?.addressBn ||
    location?.addressEn ||
    (isBn ? 'অবস্থান গোপন' : 'Location withheld')
  );
};

export const FeedReadyReportPreview: React.FC<FeedReadyReportPreviewProps> = ({
  complaint,
  isBn,
  selected,
  publishable = true,
  disabled = false,
  onToggle,
}) => {
  const category =
    CATEGORY_STYLES[complaint.categoryId] || CATEGORY_STYLES.public_safety;
  const CategoryIcon = category.icon;
  const title = getPublicTitle(complaint, isBn);
  const summary = getPublicSummary(complaint, isBn);
  const location = getPublicLocation(complaint, isBn);
  const shouldShowSummary =
    summary.trim().length > 0 && summary.trim() !== title.trim();
  const status = String(complaint.status || '');
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
          {publishable ? (
            <Checkbox
              id={`news-intake-publish-${complaint.id}`}
              label={isBn ? 'প্রকাশের জন্য নির্বাচন করুন' : 'Select for publishing'}
              checked={selected}
              onChange={onToggle}
              disabled={disabled}
              aria-label={
                isBn ? `${title} প্রকাশের জন্য নির্বাচন করুন` : `Select ${title} for publishing`
              }
            />
          ) : (
            <p className="type-label font-medium text-slate-700 dark:text-slate-300">
              {statusLabel}
            </p>
          )}
        </div>
        <Tag tone={statusTone}>{statusLabel}</Tag>
      </div>

      <article
        className="select-none space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm sm:space-y-3 sm:p-5"
        aria-label={isBn ? 'পাবলিক ফিড প্রিভিউ' : 'Public feed preview'}
      >
        <div className="flex items-center justify-between gap-3 text-sm leading-5">
          <span
            className={`inline-flex min-h-[26px] shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-semibold leading-none ${category.badgeClass}`}
          >
            <CategoryIcon className="size-3.5" />
            <span>{isBn ? category.labelBn : category.labelEn}</span>
          </span>
          <p className="shrink-0 whitespace-nowrap text-sm text-slate-600">
            {isBn ? 'এখনই' : 'Just now'}
          </p>
        </div>

        <h3 className="line-clamp-2 break-words text-xl font-semibold leading-[30px] text-slate-950">
          {title}
        </h3>

        {shouldShowSummary && (
          <p className="line-clamp-2 break-words text-base leading-[26px] text-slate-700">
            {summary}
          </p>
        )}

        <div className="flex items-center border-t border-slate-200 pt-3 text-sm text-slate-600">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-sky-600" aria-hidden="true" />
            <p className="truncate text-sm font-medium text-slate-600">{location}</p>
          </div>

          <span className="mx-3 h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />

          <div
            className="flex shrink-0 items-center gap-1.5 text-slate-600"
            aria-label={isBn ? '০ ভিউ' : '0 views'}
          >
            <Eye className="size-4" aria-hidden="true" />
            <span className="whitespace-nowrap text-sm">{isBn ? '০' : '0'}</span>
          </div>

          <span className="mx-3 h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />

          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            aria-hidden="true"
          >
            <Share2 className="size-4" />
          </span>
        </div>
      </article>
    </div>
  );
};

export default FeedReadyReportPreview;
