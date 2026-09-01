import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge, BadgeStatus } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { ComplaintTimelineEvent, TimelineEventType, ComplaintLifecycleStatus } from '@/types/Complaint';
import {
  History,
  CheckCircle2,
  Clock,
  HelpCircle,
  Share2,
  FileCheck,
  Building,
  User,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/utils';

export interface ComplaintTimelineProps {
  timeline: ComplaintTimelineEvent[];
  loading?: boolean;
  className?: string;
}

export const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({
  timeline = [],
  loading = false,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const formatTimestamp = (isoString: string): string => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case 'submitted':
        return <User className="w-3.5 h-3.5 text-amber-500" />;
      case 'status_change':
        return <Clock className="w-3.5 h-3.5 text-indigo-500" />;
      case 'assigned':
        return <Building className="w-3.5 h-3.5 text-sky-500" />;
      case 'info_requested':
        return <HelpCircle className="w-3.5 h-3.5 text-blue-500" />;
      case 'official_update':
        return <Share2 className="w-3.5 h-3.5 text-teal-500" />;
      case 'resolved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <FileCheck className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status?: ComplaintLifecycleStatus) => {
    if (!status) return null;
    const badgeMap: Record<ComplaintLifecycleStatus, { status: BadgeStatus; labelEn: string; labelBn: string }> = {
      submitted: { status: 'pending', labelEn: 'Submitted', labelBn: 'দাখিলকৃত' },
      published: { status: 'published', labelEn: 'Published', labelBn: 'প্রকাশিত' },
      rejected: { status: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিলকৃত' },
      edited: { status: 'info', labelEn: 'Edited', labelBn: 'সম্পাদিত' },
    };
    const cfg = badgeMap[status] || { status: 'default', labelEn: status, labelBn: status };
    return (
      <Badge status={cfg.status} size="sm">
        {isBn ? cfg.labelBn : cfg.labelEn}
      </Badge>
    );
  };

  return (
    <Card variant="default" className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>{isBn ? 'কার্যক্রম ও অডিট টাইমলাইন' : 'Audit Trail & Lifecycle History'}</span>
        </CardTitle>

        <span className="text-xs text-slate-400 font-mono">
          {timeline.length} {isBn ? 'টি ধাপ' : 'Events'}
        </span>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            {isBn ? 'কোনো টাইমলাইন তথ্য পাওয়া যায়নি।' : 'No timeline records logged yet.'}
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timeline.map((event, idx) => {
              const isLast = idx === timeline.length - 1;
              return (
                <div key={event.id || idx} className="relative group">
                  {/* Timeline node icon */}
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center group-hover:border-indigo-500 transition-colors shadow-2xs">
                    {getEventIcon(event.type)}
                  </div>

                  {/* Content body */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {isBn ? event.titleBn : event.titleEn}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>

                    {/* Actor label */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {event.actorName}
                      </span>
                      <span>•</span>
                      <span>{event.actorRole}</span>
                    </div>

                    {/* Status transition chips if present */}
                    {(event.fromStatus || event.toStatus) && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {event.fromStatus && getStatusBadge(event.fromStatus)}
                        {event.fromStatus && event.toStatus && (
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        )}
                        {event.toStatus && getStatusBadge(event.toStatus)}
                      </div>
                    )}

                    {/* Description narrative */}
                    {(event.descriptionBn || event.descriptionEn) && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed bg-slate-50/70 dark:bg-slate-800/40 p-2 rounded border border-slate-100 dark:border-slate-800/60">
                        {isBn
                          ? event.descriptionBn || event.descriptionEn
                          : event.descriptionEn || event.descriptionBn}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplaintTimeline;
