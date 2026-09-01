import React from 'react';
import { AuditLog } from '@/types/AuditLog';
import { useLanguage } from '@/context/LanguageContext';
import { Card } from '@/components/ui/Card';
import { AuditEventBadge } from './AuditEventBadge';
import { Clock, User as UserIcon, Layers, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/utils';

export interface MobileAuditCardListProps {
  logs: AuditLog[];
  selectedLog?: AuditLog | null;
  onSelectLog: (log: AuditLog) => void;
  isLoading?: boolean;
  className?: string;
}

const MODULE_LABELS: Record<string, { en: string; bn: string }> = {
  complaints: { en: 'Complaints', bn: 'অভিযোগ' },
  feed: { en: 'Public Feed', bn: 'পাবলিক ফিড' },
  responses: { en: 'Responses', bn: 'প্রতিক্রিয়া' },
  categories: { en: 'Categories', bn: 'বিভাগ' },
  users: { en: 'Users', bn: 'ব্যবহারকারী' },
  system: { en: 'System', bn: 'সিস্টেম' },
};

export const MobileAuditCardList: React.FC<MobileAuditCardListProps> = ({
  logs,
  selectedLog,
  onSelectLog,
  isLoading = false,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const formatTimestamp = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
        <p>{isBn ? 'কোনো অডিট লগ পাওয়া যায়নি' : 'No audit logs found'}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {logs.map((log) => {
        const isSelected = selectedLog?.id === log.id;
        const moduleLabel = MODULE_LABELS[log.module]
          ? isBn
            ? MODULE_LABELS[log.module].bn
            : MODULE_LABELS[log.module].en
          : log.module;

        return (
          <Card
            key={log.id}
            variant="default"
            padding="none"
            onClick={() => onSelectLog(log)}
            className={cn(
              'w-full text-left transition-all overflow-hidden border border-slate-200 dark:border-slate-800',
              'hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.99] cursor-pointer',
              isSelected && 'ring-1 ring-sky-500 border-sky-500 dark:border-sky-500 bg-sky-50/20'
            )}
          >
            <div className="p-4 space-y-2.5">
              {/* Header: Action badge + Entity ID + Time */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AuditEventBadge action={log.action} />
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5 text-slate-400" />
                    {log.entityId}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatTimestamp(log.timestamp)}</span>
                </div>
              </div>

              {/* Main: Description */}
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                {isBn && log.descriptionBn ? log.descriptionBn : log.description}
              </p>

              {/* Meta: Actor + Module */}
              <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {log.actor.avatar ? (
                    <img
                      src={log.actor.avatar}
                      alt={log.actor.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-[10px] shrink-0">
                      <UserIcon className="w-3 h-3" />
                    </div>
                  )}
                  <span className="text-xs font-medium truncate">{log.actor.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                    <Layers className="w-2.5 h-2.5 text-sky-500" />
                    <span className="capitalize">{moduleLabel}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileAuditCardList;
