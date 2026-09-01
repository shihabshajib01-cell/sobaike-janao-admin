import React from 'react';
import { ResponseItem } from '@/types/Response';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  ShieldCheck,
  Calendar,
  Building2,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils';

export interface MobileResponseCardListProps {
  responses: ResponseItem[];
  onSelectResponse: (response: ResponseItem) => void;
  isLoading?: boolean;
  className?: string;
}

export const MobileResponseCardList: React.FC<MobileResponseCardListProps> = ({
  responses,
  onSelectResponse,
  isLoading = false,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getStatusBadge = (status: ResponseItem['status']) => {
    switch (status) {
      case 'published':
        return (
          <Badge status="published" size="sm" dot>
            {isBn ? 'প্রকাশিত' : 'Published'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge status="approved" size="sm" dot>
            {isBn ? 'অনুমোদিত' : 'Approved'}
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge status="pending" size="sm" dot>
            {isBn ? 'পর্যালোচনাধীন' : 'Pending Review'}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge status="rejected" size="sm">
            {isBn ? 'বাতিলকৃত' : 'Rejected'}
          </Badge>
        );
      case 'unpublished':
        return (
          <Badge status="default" size="sm">
            {isBn ? 'অপ্রকাশিত' : 'Unpublished'}
          </Badge>
        );
      default:
        return <Badge status="default" size="sm">{status}</Badge>;
    }
  };

  const formatDate = (isoString: string): string => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 space-y-3 animate-pulse border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
        <p>{isBn ? 'কোনো প্রতিক্রিয়া পাওয়া যায়নি' : 'No responses found'}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {responses.map((item) => {
        const contentText = isBn ? item.contentBn : item.contentEn;
        const relatedTitle = isBn ? item.relatedTitleBn : item.relatedTitleEn;
        const hasMedia = item.media && item.media.length > 0;

        return (
          <Card
            key={item.id}
            variant="default"
            padding="none"
            onClick={() => onSelectResponse(item)}
            className={cn(
              'w-full text-left transition-all overflow-hidden border border-slate-200 dark:border-slate-800',
              'hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.99] cursor-pointer'
            )}
          >
            <div className="p-4 space-y-2.5">
              {/* Header: ID + Linked ID + Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-400 text-xs">
                    {item.id}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">
                    {item.relatedId}
                  </span>
                  {hasMedia && (
                    <span className="inline-flex items-center text-slate-400">
                      <ImageIcon className="w-3 h-3 text-sky-500" />
                    </span>
                  )}
                </div>
                <div>{getStatusBadge(item.status)}</div>
              </div>

              {/* Related Title */}
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {relatedTitle}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mt-1">
                  {contentText}
                </p>
              </div>

              {/* Author & Dept */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                    item.isOfficial
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  )}
                >
                  {item.author.avatar ? (
                    <img
                      src={item.author.avatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    item.author.name.charAt(0)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {isBn && item.author.nameBn ? item.author.nameBn : item.author.name}
                    </span>
                    {item.isOfficial && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    {isBn ? item.author.roleTitleBn : item.author.roleTitleEn}
                  </span>
                </div>
              </div>

              {/* Meta Row: Category + Date */}
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{isBn ? item.categoryBn : item.categoryEn}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[11px] text-slate-400">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{formatDate(item.createdAt)}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileResponseCardList;
