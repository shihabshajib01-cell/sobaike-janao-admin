import React from 'react';
import {
  TaxonomySegment,
  TaxonomySubcategory,
  TaxonomySegmentNode,
} from '@/types/Category';
import { useLanguage } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  ResponsiveDataView,
  ResponsiveDataTableView,
  ResponsiveDataCardView,
} from '@/components/ui/ResponsiveDataView';
import {
  Folder,
  Tag,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowUpDown,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils';

export interface TaxonomyTreeProps {
  segments: TaxonomySegmentNode[];
  onInspectSegment: (segment: TaxonomySegmentNode) => void;
  onInspectSubcategory: (subcategory: TaxonomySubcategory, parentSegment: TaxonomySegment) => void;
  className?: string;
}

export const TaxonomyTree: React.FC<TaxonomyTreeProps> = ({
  segments,
  onInspectSegment,
  onInspectSubcategory,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className={cn('space-y-4', className)}>
      {segments.map((segment) => {
        const subcategories = segment.subcategories || [];
        const hasSubcategories = subcategories.length > 0;

        return (
          <div
            key={segment.id}
            id={`taxonomy-segment-card-${segment.id}`}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-shadow duration-150 hover:shadow-md"
          >
            <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Folder className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 break-words">
                      {isBn ? segment.nameBn : segment.nameEn}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      ({isBn ? segment.nameEn : segment.nameBn})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Badge status="default" variant="outline" size="sm" className="font-mono text-[11px]">
                      {segment.id}
                    </Badge>
                    <Badge
                      status={segment.status === 'active' ? 'success' : 'default'}
                      variant="subtle"
                      size="sm"
                      className="text-[11px]"
                    >
                      {segment.status === 'active' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {isBn ? 'সক্রিয়' : 'Active'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                        </span>
                      )}
                    </Badge>
                    {segment.configStatus !== 'published' && (
                      <Badge
                        status="warning"
                        variant="subtle"
                        size="sm"
                        className="text-[10px] capitalize"
                      >
                        {segment.configStatus}
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <ArrowUpDown className="w-3 h-3" />
                      #{segment.order}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-slate-800">
                <Badge status="default" variant="subtle" size="sm" className="text-xs font-semibold">
                  <Layers className="w-3 h-3 mr-1 text-slate-400" />
                  {subcategories.length} {isBn ? 'টি সাব-ক্যাটাগরি' : 'subcategories'}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onInspectSegment(segment)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                  className="h-8 px-2.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {isBn ? 'বিবরণ' : 'Details'}
                </Button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {hasSubcategories ? (
                <ResponsiveDataView>
                  <ResponsiveDataTableView>
                    <Table bare className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isBn ? 'সাব-ক্যাটাগরি' : 'Subcategory'}</TableHead>
                          <TableHead>{isBn ? 'শনাক্তকারী (ID)' : 'Identifier (ID)'}</TableHead>
                          <TableHead>{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                          <TableHead className="text-center">{isBn ? 'ক্রম' : 'Order'}</TableHead>
                          <TableHead className="text-right">{isBn ? 'অ্যাকশন' : 'Action'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subcategories.map((sub) => (
                          <TableRow
                            key={sub.id}
                            onClick={() => onInspectSubcategory(sub, segment)}
                            onKeyDown={(e) => {
                              if (e.target !== e.currentTarget) return;
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onInspectSubcategory(sub, segment);
                              }
                            }}
                            tabIndex={0}
                            aria-label={`${isBn ? 'সাব-ক্যাটাগরি দেখুন' : 'View subcategory'} ${isBn ? sub.nameBn : sub.nameEn}`}
                            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                  <Tag className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {isBn ? sub.nameBn : sub.nameEn}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {isBn ? sub.nameEn : sub.nameBn}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                                {sub.id}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  status={sub.status === 'active' ? 'success' : 'default'}
                                  variant="subtle"
                                  size="sm"
                                  className="text-[10px]"
                                >
                                  {sub.status === 'active' ? (
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {isBn ? 'সক্রিয়' : 'Active'}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />
                                      {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                                    </span>
                                  )}
                                </Badge>
                                {sub.configStatus !== 'published' && (
                                  <Badge
                                    status="warning"
                                    variant="subtle"
                                    size="sm"
                                    className="text-[10px] capitalize"
                                  >
                                    {sub.configStatus}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-center font-mono text-slate-400 text-xs whitespace-nowrap">
                              #{sub.order}
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInspectSubcategory(sub, segment);
                                }}
                                leftIcon={<Eye className="w-3 h-3" />}
                                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                {isBn ? 'বিবরণ' : 'Details'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ResponsiveDataTableView>

                  <ResponsiveDataCardView>
                    <div className="space-y-3">
                      {subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => onInspectSubcategory(sub, segment)}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onInspectSubcategory(sub, segment);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`${isBn ? 'সাব-ক্যাটাগরি দেখুন' : 'View subcategory'} ${isBn ? sub.nameBn : sub.nameEn}`}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                <Tag className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {isBn ? sub.nameBn : sub.nameEn}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {isBn ? sub.nameEn : sub.nameBn}
                                </p>
                              </div>
                            </div>

                            <Badge
                              status={sub.status === 'active' ? 'success' : 'default'}
                              variant="subtle"
                              size="sm"
                              className="shrink-0"
                            >
                              {sub.status === 'active' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-slate-500 dark:text-slate-400 truncate">{sub.id}</span>
                              {sub.configStatus !== 'published' && (
                                <Badge status="warning" variant="subtle" size="sm" className="text-[10px] capitalize">
                                  {sub.configStatus}
                                </Badge>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 text-slate-400 shrink-0">
                              <ArrowUpDown className="w-3 h-3" />
                              #{sub.order}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ResponsiveDataCardView>
                </ResponsiveDataView>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  {isBn ? 'কোনো সাব-ক্যাটাগরি নেই।' : 'No subcategories.'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaxonomyTree;
