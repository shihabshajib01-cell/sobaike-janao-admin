import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { ActivityEvent, ActivityEventType } from '@/types/Dashboard';
import {
  FilePlus2,
  Search,
  Rss,
  CheckCircle2,
  Send,
  History,
  UserCheck,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/utils';

export interface ActivityTimelineProps {
  activities: ActivityEvent[];
  loading?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities, loading }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const typeConfigMap: Record<
    ActivityEventType,
    { icon: LucideIcon; bgClass: string; textClass: string; lineClass: string }
  > = {
    new_submission: {
      icon: FilePlus2,
      bgClass: 'bg-amber-100 dark:bg-amber-950/60',
      textClass: 'text-amber-700 dark:text-amber-400',
      lineClass: 'border-amber-200 dark:border-amber-900/40',
    },
    moved_to_review: {
      icon: Search,
      bgClass: 'bg-indigo-100 dark:bg-indigo-950/60',
      textClass: 'text-indigo-700 dark:text-indigo-400',
      lineClass: 'border-indigo-200 dark:border-indigo-900/40',
    },
    assigned_department: {
      icon: Send,
      bgClass: 'bg-blue-100 dark:bg-blue-950/60',
      textClass: 'text-blue-700 dark:text-blue-400',
      lineClass: 'border-blue-200 dark:border-blue-900/40',
    },
    report_published: {
      icon: Rss,
      bgClass: 'bg-sky-100 dark:bg-sky-950/60',
      textClass: 'text-sky-700 dark:text-sky-400',
      lineClass: 'border-sky-200 dark:border-sky-900/40',
    },
    admin_update: {
      icon: UserCheck,
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      textClass: 'text-slate-700 dark:text-slate-300',
      lineClass: 'border-slate-200 dark:border-slate-800',
    },
    status_resolved: {
      icon: CheckCircle2,
      bgClass: 'bg-emerald-100 dark:bg-emerald-950/60',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      lineClass: 'border-emerald-200 dark:border-emerald-900/40',
    },
  };

  if (loading || activities.length === 0) {
    return (
      <Card variant="default" className="h-full">
        <CardHeader>
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default" className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <CardTitle className="text-sm font-semibold">
                {isBn ? 'অপারেশনাল অ্যাক্টিভিটি টাইমলাইন' : 'Operational Activity Stream'}
              </CardTitle>
            </div>
            <CardDescription>
              {isBn
                ? 'প্ল্যাটফর্মের সাম্প্রতিক পরিবর্তন, পর্যালোচনা ও সমাধানের অডিট লগ'
                : 'Real-time audit log of review events, updates, and resolutions'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-3">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {activities.map((event) => {
              const config = typeConfigMap[event.type] || typeConfigMap.admin_update;
              const Icon = config.icon;

              const title = isBn ? event.titleBn : event.titleEn;
              const description = isBn ? event.descriptionBn : event.descriptionEn;

              return (
                <div key={event.id} className="relative group">
                  {/* Timeline node icon */}
                  <div
                    className={cn(
                      'absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-2xs transition-transform group-hover:scale-110',
                      config.bgClass,
                      config.textClass
                    )}
                  >
                    <Icon className="w-3 h-3" />
                  </div>

                  {/* Event content */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                        {title}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {event.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {description}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {event.actor}
                      </span>
                      <span>•</span>
                      <span>{event.role}</span>
                      {event.complaintId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-sky-600 dark:text-sky-400">
                            {event.complaintId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>{isBn ? 'স্বয়ংক্রিয় অডিট সিকোয়েন্স' : 'Immutable Event Feed'}</span>
        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {isBn ? 'লাইভ স্ট্রিম' : 'Live Sync'}
        </span>
      </div>
    </Card>
  );
};

export default ActivityTimeline;
