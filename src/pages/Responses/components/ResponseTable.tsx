import React from 'react';
import { ResponseItem, ResponseStatus, ResponseType } from '@/types/Response';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  ResponsiveDataView,
  ResponsiveDataTableView,
  ResponsiveDataCardView,
} from '@/components/ui/ResponsiveDataView';
import { useLanguage } from '@/context/LanguageContext';
import { Calendar, ChevronRight, Eye, FileText } from 'lucide-react';

export interface ResponseTableProps {
  responses: ResponseItem[];
  onViewDetails: (response: ResponseItem) => void;
  isLoading?: boolean;
}

export const ResponseTable: React.FC<ResponseTableProps> = ({
  responses,
  onViewDetails,
  isLoading,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getStatusBadge = (status: ResponseStatus) => {
    switch (status) {
      case 'pending_review':
        return <Badge status="warning">{isBn ? 'পর্যালোচনা অপেক্ষমাণ' : 'Pending Review'}</Badge>;
      case 'published':
        return <Badge status="success">{isBn ? 'প্রকাশিত' : 'Published'}</Badge>;
      case 'rejected':
        return <Badge status="error">{isBn ? 'প্রত্যাখ্যাত' : 'Rejected'}</Badge>;
      case 'unpublished':
        return <Badge status="default">{isBn ? 'অপ্রকাশিত' : 'Unpublished'}</Badge>;
      default:
        return <Badge status="default">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: ResponseType) => {
    if (type === 'citizen_information') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40 whitespace-nowrap">
          {isBn ? 'তথ্য / অভিজ্ঞতা' : 'Information / Experience'}
        </span>
      );
    }

    if (type === 'subject_response') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 whitespace-nowrap">
          {isBn ? 'উল্লিখিত ব্যক্তি / পক্ষ' : 'Mentioned Person / Party'}
        </span>
      );
    }

    return <span>{type}</span>;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <ResponsiveDataView>
      <ResponsiveDataTableView>
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>{isBn ? 'রেসপন্স আইডি' : 'Response ID'}</TableHead>
              <TableHead>{isBn ? 'রিপোর্ট আইডি' : 'Report ID'}</TableHead>
              <TableHead>{isBn ? 'ধরন' : 'Type'}</TableHead>
              <TableHead>{isBn ? 'প্রতিক্রিয়া' : 'Response'}</TableHead>
              <TableHead>{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
              <TableHead>{isBn ? 'জমা দেওয়া হয়েছে' : 'Submitted'}</TableHead>
              <TableHead className="text-right">{isBn ? 'পদক্ষেপ' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {responses.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => onViewDetails(item)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewDetails(item);
                  }
                }}
                tabIndex={0}
                aria-label={`${isBn ? 'রেসপন্স দেখুন' : 'View response'} #${item.id}`}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
              >
                <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  #{item.id}
                </TableCell>
                <TableCell className="font-mono text-xs text-sky-600 dark:text-sky-400 font-medium whitespace-nowrap">
                  #{item.complaintId}
                </TableCell>
                <TableCell>{getTypeBadge(item.responseType)}</TableCell>
                <TableCell className="min-w-0">
                  <p className="truncate text-slate-800 dark:text-slate-200 text-xs font-normal" title={item.content}>
                    {item.content || (
                      <span className="text-slate-400 italic">
                        {isBn ? 'কোনো বক্তব্য নেই' : 'No content'}
                      </span>
                    )}
                  </p>
                </TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(item);
                    }}
                    disabled={isLoading}
                    className="h-8 px-2.5 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40 font-medium"
                    aria-label={`${isBn ? 'দেখুন' : 'View'} #${item.id}`}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    <span>{isBn ? 'দেখুন' : 'View'}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveDataTableView>

      <ResponsiveDataCardView>
        <div className="space-y-3">
          {responses.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewDetails(item)}
              disabled={isLoading}
              className="w-full text-left p-4 space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60"
              aria-label={`${isBn ? 'রেসপন্স দেখুন' : 'View response'} #${item.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sky-700 dark:text-sky-400 text-xs">
                  #{item.id}
                </span>
                {getStatusBadge(item.status)}
              </div>

              <div className="space-y-2">
                <div>{getTypeBadge(item.responseType)}</div>
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                    {item.content || (isBn ? 'কোনো বক্তব্য নেই' : 'No content')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono truncate">#{item.complaintId}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(item.createdAt)}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </ResponsiveDataCardView>
    </ResponsiveDataView>
  );
};

export default ResponseTable;
