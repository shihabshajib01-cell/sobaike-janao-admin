import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Smartphone,
  Globe,
  Monitor,
  Copy,
  Check,
  Shield,
  Layers,
  Compass,
  FileCode,
} from 'lucide-react';
import { PublicVisitSession } from '@/types/LocationActivity';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { LocationPermissionBadge } from './LocationPermissionBadge';
import { useLanguage } from '@/context/LanguageContext';

export interface LocationActivityDetailDrawerProps {
  session: PublicVisitSession | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LocationActivityDetailDrawer: React.FC<LocationActivityDetailDrawerProps> = ({
  session,
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!session) return null;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const screenResolution =
    session.screen_width && session.screen_height
      ? `${session.screen_width} × ${session.screen_height} px`
      : '—';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'সেশন ও লোকেশন বিবরণ' : 'Session & Location Details'}
      description={
        isBn
          ? `সেশন আইডি: ${session.session_id.slice(0, 12)}...`
          : `Session ID: ${session.session_id.slice(0, 12)}...`
      }
      size="lg"
      mobileSheet
      footer={
        <div className="flex items-center justify-end w-full">
          <Button variant="secondary" size="sm" onClick={onClose}>
            <span>{isBn ? 'বন্ধ করুন' : 'Close'}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Section A: Location Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isBn ? '১. লোকেশন ও অনুমতি' : '1. Location & Permission'}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-850/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                {isBn ? 'অনুমতি অবস্থা' : 'Permission Status'}
              </span>
              <LocationPermissionBadge status={session.permission_status} />
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                {isBn ? 'নির্ভুলতা (Accuracy)' : 'Accuracy Radius'}
              </span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {session.accuracy_meters !== null && session.accuracy_meters !== undefined
                  ? `±${Math.round(session.accuracy_meters)} meters`
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                {isBn ? 'অক্ষাংশ (Latitude)' : 'Latitude'}
              </span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {session.latitude !== null && session.latitude !== undefined
                  ? session.latitude.toFixed(6)
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                {isBn ? 'দ্রাঘিমাংশ (Longitude)' : 'Longitude'}
              </span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {session.longitude !== null && session.longitude !== undefined
                  ? session.longitude.toFixed(6)
                  : '—'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                {isBn ? 'লোকেশন সর্বশেষ আপডেট' : 'Location Updated At'}
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {formatDateTime(session.location_updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Section B: Session & Visitor Identifiers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isBn ? '২. সেশন ও পরিচয়' : '2. Session & Identifiers'}
            </h4>
          </div>

          <div className="space-y-2.5 text-xs bg-slate-50 dark:bg-slate-850/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {/* Session ID */}
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                {isBn ? 'সেশন আইডি (Session ID)' : 'Session ID'}
              </span>
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100 break-all select-all">
                  {session.session_id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(session.session_id, 'session_id')}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                  title="Copy Session ID"
                >
                  {copiedKey === 'session_id' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Visitor ID */}
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                {isBn ? 'ভিজিটর আইডি (Visitor ID)' : 'Visitor ID'}
              </span>
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100 break-all select-all">
                  {session.visitor_id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(session.visitor_id, 'visitor_id')}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                  title="Copy Visitor ID"
                >
                  {copiedKey === 'visitor_id' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  {isBn ? 'প্রথম দেখা' : 'First Seen'}
                </span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {formatDateTime(session.first_seen_at)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  {isBn ? 'সর্বশেষ সক্রিয়' : 'Last Seen'}
                </span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {formatDateTime(session.last_seen_at)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  {isBn ? 'অনুমতি প্রদানের সময়' : 'Consented At'}
                </span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {formatDateTime(session.consented_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Browser & Device */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isBn ? '৩. ব্রাউজার ও অপারেটিং সিস্টেম' : '3. Browser & OS'}
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-850/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                {isBn ? 'ডিভাইস টাইপ' : 'Device Category'}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {session.device_category || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                {isBn ? 'ব্রাউজার' : 'Browser'}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {session.browser_name || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                {isBn ? 'ব্রাউজার ভার্সন' : 'Browser Version'}
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {session.browser_version || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                {isBn ? 'ওএস (OS Name)' : 'Operating System'}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {session.os_name || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                {isBn ? 'প্ল্যাটফর্ম' : 'Platform'}
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {session.platform || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Section D: Environment & Screen */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isBn ? '৪. ডিসপ্লে ও পরিবেশ' : '4. Display & Environment'}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-850/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                {isBn ? 'ভাষা (Language)' : 'Language'}
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {session.language || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                {isBn ? 'টাইমজোন' : 'Timezone'}
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {session.timezone || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                {isBn ? 'স্ক্রিন রেজোলিউশন' : 'Screen Resolution'}
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {screenResolution}
              </span>
            </div>
          </div>
        </div>

        {/* Section E: Technical Context (User Agent) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <FileCode className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isBn ? '৫. কারিগরি তথ্য' : '5. Technical Details'}
            </h4>
          </div>

          <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-850/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">User Agent</span>
              {session.user_agent && (
                <button
                  type="button"
                  onClick={() => handleCopy(session.user_agent || '', 'user_agent')}
                  className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 dark:text-sky-400"
                >
                  {copiedKey === 'user_agent' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{isBn ? 'কপি' : 'Copy'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto">
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all leading-relaxed select-all">
                {session.user_agent || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default LocationActivityDetailDrawer;
