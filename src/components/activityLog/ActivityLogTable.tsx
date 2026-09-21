import React from 'react';
import { AuditLogItem } from '@/types/AuditLog';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { ResponsiveDataView, ResponsiveDataTableView, ResponsiveDataCardView } from '@/components/ui/ResponsiveDataView';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  getAuditActionMeta,
  formatTargetType,
  getSeverityClasses,
  formatAuditTimestamp,
  getActorDisplayInfo,
  formatAuditSummary,
} from '@/utils/auditLogUtils';
import {
  History,
  Eye,
  Clock,
  User,
} from 'lucide-react';
import { cn } from '@/utils';

export interface ActivityLogTableProps {
  logs: AuditLogItem[];
  onViewDetails: (log: AuditLogItem) => void;
}

export const ActivityLogTable: React.FC<ActivityLogTableProps> = ({
  logs,
  onViewDetails,
}) => {
  const { language } = useLanguage();

  if (logs.length === 0) {
    return (
      <div
        id="empty-activity-state"
        className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
      >
        <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          {language === 'bn' ? 'কোনো কার্যক্রম পাওয়া যায়নি' : 'No Activity Logs Found'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          {language === 'bn'
            ? 'বর্তমান অনুসন্ধানের শর্ত বা ফিল্টারের সাথে মিলে এমন কোনো অডিট রেকর্ড নেই।'
            : 'No audit records match the current filter or query parameters.'}
        </p>
      </div>
    );
  }

  return (
    <ResponsiveDataView id="activity-log-table-container">
      {/* Desktop Table View */}
      <ResponsiveDataTableView>
        <Table className="text-sm" id="activity-logs-table">
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="whitespace-nowrap">
                {language === 'bn' ? 'সময়' : 'Timestamp'}
              </TableHead>
              <TableHead scope="col" className="whitespace-nowrap">
                {language === 'bn' ? 'কার্যক্রম' : 'Action'}
              </TableHead>
              <TableHead scope="col" className="whitespace-nowrap">
                {language === 'bn' ? 'কর্তৃপক্ষ (অ্যাক্টর)' : 'Actor'}
              </TableHead>
              <TableHead scope="col" className="whitespace-nowrap">
                {language === 'bn' ? 'টার্গেট' : 'Target'}
              </TableHead>
              <TableHead scope="col">
                {language === 'bn' ? 'বিবরণ সংক্ষেপ' : 'Summary'}
              </TableHead>
              <TableHead scope="col" className="text-right whitespace-nowrap">
                {language === 'bn' ? 'পদক্ষেপ' : 'Action'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const meta = getAuditActionMeta(log.action);
              const severity = getSeverityClasses(meta.severity);
              const ActionIcon = meta.icon;
              const time = formatAuditTimestamp(log.created_at, language);

              const summarySnippet = formatAuditSummary(log, language);
              const actorInfo = getActorDisplayInfo(log, language);

              return (
                <TableRow
                  key={log.id}
                  id={`audit-row-${log.id}`}
                  onClick={() => onViewDetails(log)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onViewDetails(log);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`${language === 'bn' ? 'অডিট বিস্তারিত দেখুন' : 'View audit details'} ${log.id}`}
                  className="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                >
                  {/* Timestamp */}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium">{time.date}</span>
                      <span className="text-slate-400 dark:text-slate-500">{time.time}</span>
                    </div>
                  </TableCell>

                  {/* Action Badge */}
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-2xs',
                        severity.badge
                      )}
                    >
                      <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{language === 'bn' ? meta.labelBn : meta.labelEn}</span>
                    </span>
                  </TableCell>

                  {/* Actor */}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="max-w-[160px] truncate">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {actorInfo.primary}
                        </p>
                        {actorInfo.secondary && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {actorInfo.secondary}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Target */}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {formatTargetType(log.target_type, language)}
                      </span>
                      <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-semibold max-w-[130px] truncate">
                        {log.target_id || '—'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Summary Snippet */}
                  <TableCell className="max-w-[240px]">
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {summarySnippet || '—'}
                    </p>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      id={`btn-view-log-${log.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(log);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {language === 'bn' ? 'বিস্তারিত' : 'Details'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ResponsiveDataTableView>

      {/* Responsive Card List View */}
      <ResponsiveDataCardView className="p-3 space-y-3 bg-slate-50/40 dark:bg-slate-950/20">
        {logs.map((log) => {
          const meta = getAuditActionMeta(log.action);
          const severity = getSeverityClasses(meta.severity);
          const ActionIcon = meta.icon;
          const time = formatAuditTimestamp(log.created_at, language);
          const actorInfo = getActorDisplayInfo(log, language);

          return (
            <div
              key={log.id}
              id={`mobile-audit-card-${log.id}`}
              onClick={() => onViewDetails(log)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewDetails(log);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${language === 'bn' ? 'অডিট বিস্তারিত দেখুন' : 'View audit details'} ${log.id}`}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-2xs',
                    severity.badge
                  )}
                >
                  <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === 'bn' ? meta.labelBn : meta.labelEn}</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  {time.date}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-start justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400 pt-0.5">{language === 'bn' ? 'কর্তৃপক্ষ:' : 'Actor:'}</span>
                  <div className="text-right max-w-[200px]">
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">
                      {actorInfo.primary}
                    </span>
                    {actorInfo.secondary && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                        {actorInfo.secondary}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">{language === 'bn' ? 'টার্গেট:' : 'Target:'}</span>
                  <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {formatTargetType(log.target_type, language)}: {log.target_id || '—'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-end">
                <Button
                  id={`btn-view-mobile-log-${log.id}`}
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(log);
                  }}
                  className="w-full flex items-center justify-center"
                >
                  <Eye className="w-4 h-4" />
                  <span>{language === 'bn' ? 'বিস্তারিত অডিট রেকর্ড দেখুন' : 'View Audit Details'}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </ResponsiveDataCardView>
    </ResponsiveDataView>
  );
};
