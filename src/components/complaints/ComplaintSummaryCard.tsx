import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge, BadgeStatus } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { Complaint, ComplaintLifecycleStatus, ComplaintUrgency } from '@/types/Complaint';
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  AlertTriangle,
  Building2,
  ThumbsUp,
  MessageSquare,
  Zap,
  Receipt,
  Flame,
} from 'lucide-react';
import { cn } from '@/utils';

export interface ComplaintSummaryCardProps {
  complaint: Complaint;
  className?: string;
}

export const ComplaintSummaryCard: React.FC<ComplaintSummaryCardProps> = ({
  complaint,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const statusBadgeMap: Record<
    ComplaintLifecycleStatus,
    { badgeStatus: BadgeStatus; labelEn: string; labelBn: string }
  > = {
    submitted: { badgeStatus: 'pending', labelEn: 'Submitted', labelBn: 'দাখিলকৃত' },
    published: { badgeStatus: 'published', labelEn: 'Published', labelBn: 'প্রকাশিত' },
    unpublished: { badgeStatus: 'default', labelEn: 'Unpublished', labelBn: 'অপ্রকাশিত' },
    rejected: { badgeStatus: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিলকৃত' },
    edited: { badgeStatus: 'info', labelEn: 'Edited', labelBn: 'সম্পাদিত' },
  };

  const urgencyBadgeMap: Record<
    ComplaintUrgency,
    { badgeStatus: BadgeStatus; labelEn: string; labelBn: string }
  > = {
    urgent: { badgeStatus: 'rejected', labelEn: 'Urgent Priority', labelBn: 'জরুরি অগ্রাধিকার' },
    high: { badgeStatus: 'pending', labelEn: 'High Priority', labelBn: 'উচ্চ অগ্রাধিকার' },
    medium: { badgeStatus: 'info', labelEn: 'Medium Priority', labelBn: 'মাঝারি অগ্রাধিকার' },
    low: { badgeStatus: 'default', labelEn: 'Low Priority', labelBn: 'সাধারণ' },
  };

  const statusCfg = statusBadgeMap[complaint.status] || {
    badgeStatus: 'default',
    labelEn: complaint.status,
    labelBn: complaint.status,
  };

  const urgencyCfg = urgencyBadgeMap[complaint.urgency] || urgencyBadgeMap.medium;

  const formatDate = (isoString: string): string => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  return (
    <Card variant="default" className={cn('overflow-hidden', className)}>
      {/* Top Banner / ID Strip */}
      <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {isBn ? 'প্রতিবেদন আইডি' : 'Report ID'}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-sky-700 dark:text-sky-400">
                {complaint.id}
              </span>
              <Badge status={statusCfg.badgeStatus} size="md" dot>
                {isBn ? statusCfg.labelBn : statusCfg.labelEn}
              </Badge>
              <Badge status={urgencyCfg.badgeStatus} variant="subtle" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {isBn ? urgencyCfg.labelBn : urgencyCfg.labelEn}
              </Badge>
            </div>
          </div>

          {/* Social Stats */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <ThumbsUp className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-semibold">{formatNumber(complaint.upvotesCount)}</span>
              <span className="text-slate-400">{isBn ? 'ভোট' : 'votes'}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold">{formatNumber(complaint.commentsCount)}</span>
              <span className="text-slate-400">{isBn ? 'মন্তব্য' : 'comments'}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Core Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category */}
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              {isBn ? 'মূল বিভাগ' : 'Category'}
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isBn ? complaint.categoryBn : complaint.categoryEn}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
              {isBn ? complaint.subcategoryBn : complaint.subcategoryEn}
            </span>
          </div>

          {/* Location Area */}
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {isBn ? 'অবস্থান' : 'Location'}
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {complaint.location.ward}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
              {complaint.location.zone}
            </span>
          </div>

          {/* Created Date */}
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {isBn ? 'দাখিলের সময়' : 'Submission Date'}
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatDate(complaint.createdAt)}
            </p>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isBn ? 'আপডেট:' : 'Updated:'} {formatDate(complaint.updatedAt)}
            </span>
          </div>

          {/* Assigned Department */}
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {isBn ? 'দায়িত্বপ্রাপ্ত বিভাগ' : 'Assigned Department'}
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {complaint.assignedDepartment || (isBn ? 'অনির্ধারিত' : 'Unassigned')}
            </p>
            <span className="text-xs text-slate-400">
              {complaint.assignedDepartment
                ? isBn
                  ? 'সরাসরি তদারকি'
                  : 'Active Department'
                : isBn
                ? 'পর্যালোচনায় বরাদ্দ হবে'
                : 'Pending routing'}
            </span>
          </div>
        </div>

        {/* Utility Service Quick Metrics Banner */}
        {complaint.recentBillAmount !== null && complaint.recentBillAmount !== undefined && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                  {isBn ? 'অতিরিক্ত বিদ্যুৎ বিল নিরীক্ষা' : 'Excess Electricity Bill Audit'}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {isBn ? 'চলতি বিল:' : 'Recent:'}{' '}
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    ৳ {formatNumber(complaint.recentBillAmount)}
                  </span>
                  {complaint.previousBillAmount !== null && complaint.previousBillAmount !== undefined && (
                    <>
                      {' '}
                      • {isBn ? 'পূর্ববর্তী:' : 'Prev:'}{' '}
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        ৳ {formatNumber(complaint.previousBillAmount)}
                      </span>
                      {' '}
                      (
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        +৳ {formatNumber(complaint.recentBillAmount - complaint.previousBillAmount)}
                      </span>
                      )
                    </>
                  )}
                </span>
              </div>
            </div>

            {complaint.previousBillAmount && complaint.previousBillAmount > 0 && (
              <Badge
                status="rejected"
                size="sm"
                className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
              >
                +
                {formatNumber(
                  Math.round(
                    ((complaint.recentBillAmount - complaint.previousBillAmount) /
                      complaint.previousBillAmount) *
                      100
                  )
                )}
                % {isBn ? 'বৃদ্ধি' : 'Surge'}
              </Badge>
            )}
          </div>
        )}

        {/* Utility Incident Outage Time Banner (for load shedding & gas outage) */}
        {(complaint.incidentDate || complaint.incidentTime) &&
          complaint.recentBillAmount === null && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                  {complaint.subcategoryId === 'gas-shortage' ? (
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                    {isBn ? 'বিভ্রাটের সময়কাল' : 'Incident Timing'}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {complaint.incidentDate && <span>{complaint.incidentDate}</span>}
                    {complaint.incidentTime && <span> • {complaint.incidentTime}</span>}
                  </span>
                </div>
              </div>

              {complaint.frequency && (
                <Badge status="pending" size="sm">
                  {complaint.frequency === 'repeated'
                    ? isBn
                      ? 'পুনরাবৃত্তিমূলক বিভ্রাট'
                      : 'Repeated Outage'
                    : complaint.frequency}
                </Badge>
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default ComplaintSummaryCard;
