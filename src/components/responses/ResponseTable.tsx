import React from 'react';
import { ResponseItem } from '@/types/Response';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Eye,
  ShieldCheck,
  Building2,
  Clock,
  Image as ImageIcon,
  MessageSquare,
  FileText,
  User,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/utils';

import { MobileResponseCardList } from './MobileResponseCardList';

export interface ResponseTableProps {
  responses: ResponseItem[];
  onSelectResponse: (response: ResponseItem) => void;
  isLoading?: boolean;
  className?: string;
}

export const ResponseTable: React.FC<ResponseTableProps> = ({
  responses,
  onSelectResponse,
  isLoading,
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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-8 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center justify-between gap-4">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-sm" />
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-sm" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-sm" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs',
        className
      )}
    >
      {/* Desktop / Tablet Table View (Hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <th className="px-4 py-3 w-28">{isBn ? 'আইডি' : 'Response ID'}</th>
              <th className="px-4 py-3 w-56">{isBn ? 'সংযুক্ত অভিযোগ / পোস্ট' : 'Related Record'}</th>
              <th className="px-4 py-3 w-48">{isBn ? 'প্রেরক / কর্তৃপক্ষ' : 'Author'}</th>
              <th className="px-4 py-3">{isBn ? 'প্রতিক্রিয়ার বিবরণ' : 'Content Preview'}</th>
              <th className="px-4 py-3 w-20 text-center">{isBn ? 'মিডিয়া' : 'Media'}</th>
              <th className="px-4 py-3 w-32 text-center">{isBn ? 'স্থিতি' : 'Status'}</th>
              <th className="px-4 py-3 w-32 text-right">{isBn ? 'তারিখ' : 'Date'}</th>
              <th className="px-4 py-3 w-24 text-center">{isBn ? 'অ্যাকশন' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {responses.map((item) => {
              const hasMedia = item.media && item.media.length > 0;
              const contentText = isBn ? item.contentBn : item.contentEn;
              const relatedTitle = isBn ? item.relatedTitleBn : item.relatedTitleEn;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectResponse(item)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors duration-100 group"
                >
                  {/* 1. Response ID */}
                  <td className="px-4 py-3.5 align-top">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 flex items-center gap-1">
                      {item.id}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-sky-500" />
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                      {item.isOfficial ? (isBn ? 'দাপ্তরিক' : 'Official') : (isBn ? 'নাগরিক' : 'Citizen')}
                    </span>
                  </td>

                  {/* 2. Related Complaint / Post */}
                  <td className="px-4 py-3.5 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">
                          {item.relatedId}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.relatedType === 'complaint'
                            ? isBn ? 'অভিযোগ' : 'Complaint'
                            : isBn ? 'পোস্ট' : 'Post'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-1 font-medium" title={relatedTitle}>
                        {relatedTitle}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Building2 className="w-2.5 h-2.5" />
                        <span>{isBn ? item.categoryBn : item.categoryEn}</span>
                      </div>
                    </div>
                  </td>

                  {/* 3. Author Information */}
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5',
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
                            {isBn && item.author.nameBn ? item.author.nameBn : item.author.name}
                          </span>
                          {item.isOfficial && (
                            <span title="Official Verified Authority">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {isBn ? item.author.roleTitleBn : item.author.roleTitleEn}
                        </p>
                        {item.author.departmentEn && (
                          <p className="text-[10px] text-slate-400 truncate">
                            {isBn ? item.author.departmentBn : item.author.departmentEn}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 4. Content Preview */}
                  <td className="px-4 py-3.5 align-top">
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {contentText}
                    </p>
                    {item.publicContentEn && (
                      <span className="inline-block mt-1 text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                        ✓ {isBn ? 'পাবলিক সংস্করণ প্রস্তুত' : 'Public sanitized draft available'}
                      </span>
                    )}
                  </td>

                  {/* 5. Media Icon */}
                  <td className="px-4 py-3.5 align-top text-center">
                    {hasMedia ? (
                      <div
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800"
                        title={`${item.media?.length} photo attached`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-50 dark:bg-slate-800/40 text-slate-400"
                        title="Text-only response"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </td>

                  {/* 6. Status Badge */}
                  <td className="px-4 py-3.5 align-top text-center">
                    {getStatusBadge(item.status)}
                  </td>

                  {/* 7. Date */}
                  <td className="px-4 py-3.5 align-top text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </td>

                  {/* 8. Action */}
                  <td
                    className="px-4 py-3.5 align-top text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectResponse(item);
                    }}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      className="text-xs h-7 px-2.5 shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {isBn ? 'দেখুন' : 'View'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Stream (Shown only on small screens) */}
      <div className="block md:hidden">
        <MobileResponseCardList
          responses={responses}
          onSelectResponse={onSelectResponse}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ResponseTable;
