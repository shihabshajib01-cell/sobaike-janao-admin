import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge, BadgeStatus } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  ResponsiveDataView,
  ResponsiveDataTableView,
  ResponsiveDataCardView,
} from '@/components/ui/ResponsiveDataView';
import { useLanguage } from '@/context/LanguageContext';
import { RecentComplaintItem, LifecycleStatusKey } from '@/types/Dashboard';
import {
  ListFilter,
  ArrowRight,
  MapPin,
  Calendar,
  FileText,
  ChevronRight,
} from 'lucide-react';

export interface RecentComplaintsProps {
  complaints: RecentComplaintItem[];
  loading?: boolean;
}

export const RecentComplaints: React.FC<RecentComplaintsProps> = ({
  complaints,
  loading,
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const statusBadgeMap: Record<
    LifecycleStatusKey,
    { badgeStatus: BadgeStatus; labelEn: string; labelBn: string }
  > = {
    submitted: { badgeStatus: 'pending', labelEn: 'Submitted', labelBn: 'জমা পড়েছে' },
    published: { badgeStatus: 'published', labelEn: 'Published', labelBn: 'প্রকাশিত' },
    unpublished: { badgeStatus: 'default', labelEn: 'Unpublished', labelBn: 'অপ্রকাশিত' },
    rejected: { badgeStatus: 'rejected', labelEn: 'Rejected', labelBn: 'প্রত্যাখ্যাত' },
    edited: { badgeStatus: 'info', labelEn: 'Edited', labelBn: 'সম্পাদিত' },
  };

  if (loading) {
    return (
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 animate-pulse p-3"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <CardTitle className="text-sm font-semibold">
              {isBn ? 'সাম্প্রতিক প্রতিবেদন' : 'Recent Reports'}
            </CardTitle>
          </div>
          <CardDescription>
            {isBn
              ? 'প্ল্যাটফর্মে জমা পড়া সর্বশেষ প্রতিবেদনসমূহ'
              : 'Latest reports submitted to the platform'}
          </CardDescription>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/complaints')}
          className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700"
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          {isBn ? 'সকল অভিযোগ দেখুন' : 'View All Complaints'}
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {complaints.length === 0 ? (
          <div className="p-8 text-center border-t border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isBn ? 'এখনও কোনো প্রতিবেদন নেই' : 'No Reports Yet'}
            </p>
            <p className="type-meta text-slate-400 dark:text-slate-500">
              {isBn
                ? 'প্রতিবেদন জমা পড়লে এখানে দেখা যাবে।'
                : 'Reports will appear here after they are submitted.'}
            </p>
          </div>
        ) : (
          <ResponsiveDataView>
            <ResponsiveDataTableView>
              <Table bare className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>{isBn ? 'আইডি ও শিরোনাম' : 'ID & Title'}</TableHead>
                    <TableHead>{isBn ? 'বিভাগ' : 'Segment'}</TableHead>
                    <TableHead>{isBn ? 'অবস্থান' : 'Location'}</TableHead>
                    <TableHead>{isBn ? 'তারিখ' : 'Date'}</TableHead>
                    <TableHead className="text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="text-right">{isBn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((c) => {
                    const statusInfo = statusBadgeMap[c.status] || {
                      badgeStatus: 'default',
                      labelEn: c.status,
                      labelBn: c.status,
                    };

                    return (
                      <TableRow
                        key={c.id}
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/complaints/${c.id}`);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`${isBn ? 'প্রতিবেদন দেখুন' : 'View report'} ${c.id}`}
                        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                      >
                        <TableCell className="max-w-xs">
                          <div className="flex flex-col">
                            <span className="font-mono type-meta font-semibold text-sky-600 dark:text-sky-400">
                              #{c.id.slice(0, 8)}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate mt-0.5">
                              {isBn ? c.titleBn : c.titleEn}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-xs type-meta bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {isBn ? c.categoryBn : c.categoryEn}
                          </span>
                        </TableCell>

                        <TableCell className="text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {isBn ? c.locationBn : c.locationEn}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-1 type-meta">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{c.date}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          <Badge status={statusInfo.badgeStatus} size="sm">
                            {isBn ? statusInfo.labelBn : statusInfo.labelEn}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/complaints/${c.id}`);
                            }}
                            className="h-7 px-2 type-meta text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          >
                            {isBn ? 'পর্যালোচনা' : 'Review'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ResponsiveDataTableView>

            <ResponsiveDataCardView>
              <div className="p-3 space-y-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
                {complaints.map((c) => {
                  const statusInfo = statusBadgeMap[c.status] || {
                    badgeStatus: 'default',
                    labelEn: c.status,
                    labelBn: c.status,
                  };

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-mono type-meta font-semibold text-sky-600 dark:text-sky-400">
                            #{c.id.slice(0, 8)}
                          </span>
                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                            {isBn ? c.titleBn : c.titleEn}
                          </p>
                        </div>
                        <Badge status={statusInfo.badgeStatus} size="sm">
                          {isBn ? statusInfo.labelBn : statusInfo.labelEn}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {isBn ? c.categoryBn : c.categoryEn}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{isBn ? c.locationBn : c.locationEn}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          {c.date}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ResponsiveDataCardView>
          </ResponsiveDataView>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentComplaints;
