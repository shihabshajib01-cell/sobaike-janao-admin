import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User as UserIcon,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  Info,
  Calendar,
  Hash,
  Activity,
  Code2,
} from 'lucide-react';
import { AuditLog } from '@/types/AuditLog';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { AuditEventBadge } from './AuditEventBadge';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/utils';

export interface AuditDetailDrawerProps {
  log: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
}

const MODULE_LABELS: Record<string, { en: string; bn: string }> = {
  complaints: { en: 'Complaints Management', bn: 'অভিযোগ ব্যবস্থাপনা' },
  feed: { en: 'Public Feed Moderation', bn: 'পাবলিক ফিড মডারেশন' },
  responses: { en: 'Official Responses', bn: 'অফিসিয়াল প্রতিক্রিয়া' },
  categories: { en: 'Category Taxonomy', bn: 'ক্যাটাগরি ও ট্যাক্সোনমি' },
  users: { en: 'Users & Roles', bn: 'ব্যবহারকারী ও রোল' },
  system: { en: 'System Settings', bn: 'সিস্টেম সেটিংস' },
};

export const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({
  log,
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [mobileTab, setMobileTab] = useState<'overview' | 'actor' | 'payload'>('overview');

  useEffect(() => {
    if (isOpen) {
      setMobileTab('overview');
    }
  }, [isOpen, log?.id]);

  if (!log) return null;

  const hasPayload = Boolean(log.metadata && Object.keys(log.metadata).length > 0);

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const moduleLabel = MODULE_LABELS[log.module]
    ? isBn
      ? MODULE_LABELS[log.module].bn
      : MODULE_LABELS[log.module].en
    : log.module;

  const overviewSection = (
    <div className="space-y-4">
      {/* 1. Header Event Banner */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AuditEventBadge action={log.action} size="md" />
            <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
              {log.id}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {new Date(log.timestamp).toLocaleDateString()}
          </span>
        </div>

        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
          {isBn && log.descriptionBn ? log.descriptionBn : log.description}
        </p>
      </div>

      {/* 2. Event Metadata Grid */}
      <div className="space-y-2.5">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'ইভেন্ট মেটাডাটা' : 'Event Information'}
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {isBn ? 'টাইমস্ট্যাম্প' : 'Timestamp'}
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200">
              {formatDateTime(log.timestamp)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-500" />
              {isBn ? 'প্রাসঙ্গিক মডিউল' : 'Associated Module'}
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {moduleLabel}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block flex items-center gap-1">
              <FileText className="w-3 h-3 text-emerald-500" />
              {isBn ? 'টার্গেট এন্টিটি আইডি' : 'Target Entity ID'}
            </span>
            <span className="font-mono font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] inline-block">
              {log.entityId}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block flex items-center gap-1">
              <Hash className="w-3 h-3 text-indigo-500" />
              {isBn ? 'এন্টিটি ধরন' : 'Entity Type'}
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {log.entityType || 'General Entity'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const actorSection = (
    <div className="space-y-2.5">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {isBn ? 'অ্যাক্টরের তথ্য' : 'Operator / Actor'}
      </h5>

      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {log.actor.avatar ? (
            <img
              src={log.actor.avatar}
              alt={log.actor.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm border border-slate-200 dark:border-slate-700">
              {log.actor.name.charAt(0)}
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {log.actor.name}
            </h4>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {log.actor.email}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
            {log.actor.role || 'operator'}
          </span>
          <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
            {log.actor.id}
          </span>
        </div>
      </div>
    </div>
  );

  const payloadSection = hasPayload && (
    <div className="space-y-2.5">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        {isBn ? 'কার্যক্রম সংক্রান্ত পরিবর্তন' : 'Operation Payload & Parameters'}
      </h5>

      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 font-mono text-xs">
        {Object.entries(log.metadata || {}).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between border-b border-slate-150 dark:border-slate-700/60 pb-1.5 last:border-0 last:pb-0">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">{key}</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium text-[11px] truncate max-w-[200px]">
              {String(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'অডিট ইভেন্ট বিবরণ' : 'Audit Event Details'}
      description={log.id}
      size="md"
      mobileSheet={true}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isBn ? 'সিস্টেম অডিট ট্রেইল রেকর্ড' : 'System Audit Trail Record'}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </Button>
        </div>
      }
    >
      {/* Mobile Tab Header (<sm) */}
      <div className="sm:hidden -mt-1 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => setMobileTab('overview')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
              mobileTab === 'overview'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isBn ? 'সারসংক্ষেপ' : 'Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('actor')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
              mobileTab === 'actor'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{isBn ? 'অ্যাক্টর' : 'Actor'}</span>
          </button>

          {hasPayload && (
            <button
              type="button"
              onClick={() => setMobileTab('payload')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
                mobileTab === 'payload'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{isBn ? 'পেলোড' : 'Payload'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Content (<sm) */}
      <div className="sm:hidden space-y-4">
        {mobileTab === 'overview' && overviewSection}
        {mobileTab === 'actor' && actorSection}
        {mobileTab === 'payload' && payloadSection}
      </div>

      {/* Desktop Stack (sm+) - Unchanged */}
      <div className="hidden sm:block space-y-5">
        {overviewSection}
        {actorSection}
        {payloadSection}
      </div>
    </Drawer>
  );
};

export default AuditDetailDrawer;
