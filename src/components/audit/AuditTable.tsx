import React from 'react';
import { Eye, Clock, User as UserIcon, Layers, FileText } from 'lucide-react';
import { AuditLog } from '@/types/AuditLog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { AuditEventBadge } from './AuditEventBadge';
import { AuditEmptyState } from './AuditEmptyState';
import { MobileAuditCardList } from './MobileAuditCardList';
import { useLanguage } from '@/context/LanguageContext';

export interface AuditTableProps {
  logs: AuditLog[];
  selectedLog?: AuditLog | null;
  onSelectLog: (log: AuditLog) => void;
  hasFilters?: boolean;
  onResetFilters?: () => void;
  isLoading?: boolean;
}

const MODULE_LABELS: Record<string, { en: string; bn: string }> = {
  complaints: { en: 'Complaints', bn: 'অভিযোগ' },
  feed: { en: 'Public Feed', bn: 'পাবলিক ফিড' },
  responses: { en: 'Responses', bn: 'প্রতিক্রিয়া' },
  categories: { en: 'Categories', bn: 'বিভাগ' },
  users: { en: 'Users', bn: 'ব্যবহারকারী' },
  system: { en: 'System', bn: 'সিস্টেম' },
};

export const AuditTable: React.FC<AuditTableProps> = ({
  logs,
  selectedLog,
  onSelectLog,
  hasFilters = false,
  onResetFilters,
  isLoading = false,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (!isLoading && logs.length === 0) {
    return <AuditEmptyState hasFilters={hasFilters} onResetFilters={onResetFilters} />;
  }

  const formatTimestamp = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">{isBn ? 'সময়' : 'Time'}</TableHead>
              <TableHead className="w-[200px]">{isBn ? 'অ্যাক্টর' : 'Actor'}</TableHead>
              <TableHead className="w-[130px]">{isBn ? 'মডিউল' : 'Module'}</TableHead>
              <TableHead className="w-[130px]">{isBn ? 'অ্যাকশন' : 'Action'}</TableHead>
              <TableHead className="w-[140px]">{isBn ? 'টার্গেট এন্টিটি' : 'Entity'}</TableHead>
              <TableHead className="min-w-[200px]">{isBn ? 'বিবরণ' : 'Description'}</TableHead>
              <TableHead className="w-[90px] text-right">{isBn ? 'অ্যাকশন' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              const moduleLabel = MODULE_LABELS[log.module]
                ? isBn
                  ? MODULE_LABELS[log.module].bn
                  : MODULE_LABELS[log.module].en
                : log.module;

              return (
                <TableRow
                  key={log.id}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50/70 dark:bg-sky-950/20'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                  onClick={() => onSelectLog(log)}
                >
                  {/* 1. Time */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{formatTimestamp(log.timestamp)}</span>
                    </div>
                  </TableCell>

                  {/* 2. Actor */}
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {log.actor.avatar ? (
                        <img
                          src={log.actor.avatar}
                          alt={log.actor.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-xs border border-slate-200 dark:border-slate-700 shrink-0">
                          {log.actor.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {log.actor.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 truncate">
                          {log.actor.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* 3. Module */}
                  <TableCell>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      <Layers className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="capitalize">{moduleLabel}</span>
                    </div>
                  </TableCell>

                  {/* 4. Action */}
                  <TableCell>
                    <AuditEventBadge action={log.action} />
                  </TableCell>

                  {/* 5. Entity */}
                  <TableCell>
                    <div className="inline-flex items-center gap-1 text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>{log.entityId}</span>
                    </div>
                  </TableCell>

                  {/* 6. Description */}
                  <TableCell>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 max-w-[280px]">
                      {isBn && log.descriptionBn ? log.descriptionBn : log.description}
                    </p>
                  </TableCell>

                  {/* 7. Action Button */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLog(log);
                      }}
                      leftIcon={<Eye className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                      className="text-xs"
                    >
                      {isBn ? 'দেখুন' : 'Details'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden">
        <MobileAuditCardList
          logs={logs}
          selectedLog={selectedLog}
          onSelectLog={onSelectLog}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default AuditTable;
