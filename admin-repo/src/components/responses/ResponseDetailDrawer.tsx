import React, { useState, useEffect } from 'react';
import { ResponseItem, ResponseTimelineEvent } from '@/types/Response';
import { useLanguage } from '@/context/LanguageContext';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { responseApi } from '@/services/api';
import {
  CheckCircle2,
  XCircle,
  Globe,
  EyeOff,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
  Edit3,
  MessageSquare,
  AlertTriangle,
  Info,
  Check,
  User,
  History,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/utils';

export interface ResponseDetailDrawerProps {
  response: ResponseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (responseId: string, notes?: string) => Promise<void>;
  onPublish: (responseId: string, options?: { notes?: string }) => Promise<void>;
  onUnpublish: (responseId: string, reason: string) => Promise<void>;
  onReject: (responseId: string, reason: string, explanation: string) => Promise<void>;
  onUpdatePublicVersion: (
    responseId: string,
    publicContentEn: string,
    publicContentBn: string
  ) => Promise<void>;
}

export const ResponseDetailDrawer: React.FC<ResponseDetailDrawerProps> = ({
  response,
  isOpen,
  onClose,
  onApprove,
  onPublish,
  onUnpublish,
  onReject,
  onUpdatePublicVersion,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [timelineEvents, setTimelineEvents] = useState<ResponseTimelineEvent[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  // Workflow Action States
  const [isApproving, setIsApproving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form states for modals
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('policy_violation');
  const [rejectionExplanation, setRejectionExplanation] = useState('');
  const [unpublishReason, setUnpublishReason] = useState('');

  // Public Version Editor State
  const [isEditingPublic, setIsEditingPublic] = useState(false);
  const [publicContentEn, setPublicContentEn] = useState('');
  const [publicContentBn, setPublicContentBn] = useState('');

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<'overview' | 'content' | 'media' | 'timeline'>('overview');

  // Load timeline events when drawer opens or response changes
  useEffect(() => {
    if (response && isOpen) {
      setIsTimelineLoading(true);
      responseApi
        .getResponseTimeline(response.id)
        .then((events) => setTimelineEvents(events))
        .finally(() => setIsTimelineLoading(false));

      setPublicContentEn(response.publicContentEn || response.contentEn);
      setPublicContentBn(response.publicContentBn || response.contentBn);
      setIsEditingPublic(false);
      setMobileTab('overview');
    }
  }, [response, isOpen]);

  if (!response) return null;

  const getStatusBadge = (status: ResponseItem['status']) => {
    switch (status) {
      case 'published':
        return (
          <Badge status="published" size="sm" dot>
            {isBn ? 'প্রকাশিত' : 'Published'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge status="approved" size="sm" dot>
            {isBn ? 'অনুমোদিত' : 'Approved'}
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge status="pending" size="sm" dot>
            {isBn ? 'পর্যালোচনাধীন' : 'Pending Review'}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge status="rejected" size="sm">
            {isBn ? 'বাতিলকৃত' : 'Rejected'}
          </Badge>
        );
      case 'unpublished':
        return (
          <Badge status="default" size="sm">
            {isBn ? 'অপ্রকাশিত' : 'Unpublished'}
          </Badge>
        );
      default:
        return <Badge status="default" size="sm">{status}</Badge>;
    }
  };

  const rejectionReasonOptions = [
    { value: 'commercial_spam', label: isBn ? 'বাণিজ্যিক বিজ্ঞাপন / স্প্যাম' : 'Commercial Solicitation / Spam' },
    { value: 'policy_violation', label: isBn ? 'প্ল্যাটফর্ম নীতিমালা লঙ্ঘন' : 'Community Policy Violation' },
    { value: 'abusive_language', label: isBn ? 'অশালীন / অবমাননাকর ভাষা' : 'Abusive / Harassing Language' },
    { value: 'pii_exposure', label: isBn ? 'ব্যক্তিগত গোপনীয়তা / PII লঙ্ঘন' : 'Citizen Privacy / PII Exposure' },
    { value: 'unverified_claims', label: isBn ? 'অপ্রমাণিত / বিভ্রান্তিকর তথ্য' : 'Unverified Misinformation' },
    { value: 'other', label: isBn ? 'অন্যান্য কারণ' : 'Other Administrative Reason' },
  ];

  // Action Triggers
  const handleApproveConfirm = async () => {
    try {
      setIsActionLoading(true);
      await onApprove(response.id, approvalNotes);
      const events = await responseApi.getResponseTimeline(response.id);
      setTimelineEvents(events);
      setApprovalNotes('');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePublishConfirm = async () => {
    try {
      setIsActionLoading(true);
      await onPublish(response.id);
      const events = await responseApi.getResponseTimeline(response.id);
      setTimelineEvents(events);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectionExplanation.trim()) return;
    try {
      setIsActionLoading(true);
      await onReject(response.id, rejectionReason, rejectionExplanation);
      const events = await responseApi.getResponseTimeline(response.id);
      setTimelineEvents(events);
      setIsRejectModalOpen(false);
      setRejectionExplanation('');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnpublishConfirm = async () => {
    if (!unpublishReason.trim()) return;
    try {
      setIsActionLoading(true);
      await onUnpublish(response.id, unpublishReason);
      const events = await responseApi.getResponseTimeline(response.id);
      setTimelineEvents(events);
      setIsUnpublishModalOpen(false);
      setUnpublishReason('');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSavePublicVersion = async () => {
    try {
      setIsActionLoading(true);
      await onUpdatePublicVersion(response.id, publicContentEn, publicContentBn);
      const events = await responseApi.getResponseTimeline(response.id);
      setTimelineEvents(events);
      setIsEditingPublic(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(isBn ? 'bn-BD' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const hasMedia = Boolean(response.media && response.media.length > 0);

  const topStatusBar = (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium">
            {isBn ? 'বর্তমান স্থিতি' : 'Current Status'}
          </span>
          <div className="mt-0.5">{getStatusBadge(response.status)}</div>
        </div>

        <div className="h-7 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium">
            {isBn ? 'সংযুক্ত রেকর্ড' : 'Linked Record'}
          </span>
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
            {response.relatedId}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        <span>{formatDate(response.createdAt)}</span>
      </div>
    </div>
  );

  const rejectionOrUnpublishWarning = (
    <>
      {response.status === 'rejected' && (
        <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{isBn ? 'প্রতিক্রিয়া বাতিলের কারণ' : 'Rejection Reason'}</span>
          </div>
          <p className="text-rose-600 dark:text-rose-300/90 pl-5">
            {response.rejectionExplanation || response.rejectionReason}
          </p>
        </div>
      )}

      {response.status === 'unpublished' && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
            <EyeOff className="w-4 h-4 shrink-0" />
            <span>{isBn ? 'অপ্রকাশিত রাখার কারণ' : 'Unpublish Reason'}</span>
          </div>
          <p className="text-amber-600 dark:text-amber-300/90 pl-5">
            {response.unpublishReason}
          </p>
        </div>
      )}
    </>
  );

  const authorProfileCard = (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <User className="w-3.5 h-3.5" />
        {isBn ? 'প্রেরক ও কর্তৃপক্ষের পরিচিতি' : 'Author & Authority Profile'}
      </h4>

      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                response.isOfficial
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              )}
            >
              {response.author.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {isBn && response.author.nameBn ? response.author.nameBn : response.author.name}
                </span>
                {response.isOfficial && (
                  <Badge status="approved" size="sm" variant="subtle" className="gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    {isBn ? 'অফিশিয়াল কর্তৃপক্ষ' : 'Official Authority'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isBn ? response.author.roleTitleBn : response.author.roleTitleEn}
              </p>
            </div>
          </div>

          <Badge
            status={response.author.isVerified ? 'approved' : 'default'}
            size="sm"
          >
            {response.author.isVerified
              ? isBn ? 'যাচাইকৃত' : 'Verified Profile'
              : isBn ? 'অযাচাইকৃত' : 'Unverified'}
          </Badge>
        </div>

        {(response.author.departmentEn || response.author.organizationEn) && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {response.author.departmentEn && (
              <div>
                <span className="text-[10px] text-slate-400 block">{isBn ? 'বিভাগ' : 'Department'}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {isBn ? response.author.departmentBn : response.author.departmentEn}
                </span>
              </div>
            )}
            {response.author.organizationEn && (
              <div>
                <span className="text-[10px] text-slate-400 block">{isBn ? 'সংস্থা' : 'Organization'}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {isBn ? response.author.organizationBn : response.author.organizationEn}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const relatedContextCard = (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5" />
        {isBn ? 'সম্পর্কিত অভিযোগ বা পোস্টের প্রেক্ষাপট' : 'Linked Record Context'}
      </h4>

      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
            {response.relatedId}
          </span>
          <span className="text-[11px] text-slate-400">
            {isBn ? response.categoryBn : response.categoryEn}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
          {isBn ? response.relatedTitleBn : response.relatedTitleEn}
        </p>
      </div>
    </div>
  );

  const responseContentSection = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          {isBn ? 'প্রতিক্রিয়ার মূল বিষয়বস্তু' : 'Response Content & Public Draft'}
        </h4>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsEditingPublic(!isEditingPublic)}
          leftIcon={<Edit3 className="w-3 h-3" />}
          className="text-xs h-6 px-2"
        >
          {isEditingPublic
            ? isBn ? 'বাতিল' : 'Cancel Edit'
            : isBn ? 'পাবলিক সংস্করণ সম্পাদনা' : 'Edit Public Draft'}
        </Button>
      </div>

      {isEditingPublic ? (
        <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-sky-800 dark:text-sky-300 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isBn
                ? 'নাগরিক গোপনীয়তা ও পাবলিক সংস্করণ নিয়ন্ত্রণ'
                : 'Public Sanitization & Privacy Shield'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isBn
              ? 'ব্যক্তিগত ফোন নম্বর, নাম বা সংবেদনশীল অভিযোগ গোপন রেখে পরিচ্ছন্ন পাবলিক বিবরণী প্রস্তুত করুন।'
              : 'Ensure citizen phone numbers, private names, and sensitive allegations are sanitized before publishing.'}
          </p>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
              {isBn ? 'পাবলিক বিবরণ (ইংরেজি)' : 'Public Draft (English)'}
            </label>
            <Textarea
              value={publicContentEn}
              onChange={(e) => setPublicContentEn(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
              {isBn ? 'পাবলিক বিবরণ (বাংলা)' : 'Public Draft (Bangla)'}
            </label>
            <Textarea
              value={publicContentBn}
              onChange={(e) => setPublicContentBn(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSavePublicVersion}
              disabled={isActionLoading}
              leftIcon={<Check className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {isBn ? 'সংরক্ষণ করুন' : 'Save Public Version'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bangla View */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              {isBn ? 'বাংলা সংস্করণ' : 'Bangla Content'}
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {response.contentBn}
            </p>
          </div>

          {/* English View */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              {isBn ? 'ইংরেজি সংস্করণ' : 'English Content'}
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {response.contentEn}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const mediaSection = hasMedia && (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" />
        {isBn ? 'সংযুক্ত প্রমাণাদি ও ছবি' : 'Attached Photos & Evidence'}
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {response.media?.map((med) => (
          <div
            key={med.id}
            className="group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 space-y-2"
          >
            <div className="aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
              <img
                src={med.url}
                alt={med.caption || (isBn ? 'ছবি' : 'Attached Image')}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            {med.caption && (
              <p className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                {med.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const timelineSection = (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        {isBn ? 'মডারেশন ও অডিট টাইমলাইন' : 'Audit Timeline'}
      </h4>

      {isTimelineLoading ? (
        <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
          {isBn ? 'টাইমলাইন লোড হচ্ছে...' : 'Loading timeline records...'}
        </div>
      ) : timelineEvents.length > 0 ? (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          {timelineEvents.map((evt, idx) => (
            <div key={evt.id} className="relative flex items-start gap-3 text-xs">
              {idx < timelineEvents.length - 1 && (
                <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
              )}

              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-white dark:ring-slate-900',
                  evt.action === 'approved' || evt.action === 'published'
                    ? 'bg-emerald-500 text-white'
                    : evt.action === 'rejected'
                    ? 'bg-rose-500 text-white'
                    : 'bg-sky-500 text-white'
                )}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {isBn ? evt.titleBn : evt.titleEn}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDate(evt.timestamp)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  {isBn ? evt.descriptionBn : evt.descriptionEn}
                </p>
                <span className="text-[10px] text-slate-400 block">
                  {evt.actor.name} ({evt.actor.role})
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
          {isBn ? 'কোনো টাইমলাইন তথ্য সংরক্ষিত নেই' : 'No timeline events recorded'}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        mobileSheet={true}
        title={`${isBn ? 'প্রতিক্রিয়া বিবরণী' : 'Response Details'} — ${response.id}`}
        description={
          isBn
            ? `${response.relatedType === 'complaint' ? 'অভিযোগ' : 'পোস্ট'} #${response.relatedId} এর সাথে সংযুক্ত`
            : `Linked to ${response.relatedType === 'complaint' ? 'Complaint' : 'Post'} #${response.relatedId}`
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </Button>
            </div>

            {/* Context-aware Moderation Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {response.status === 'pending_review' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isActionLoading}
                    leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                  >
                    {isBn ? 'বাতিল করুন' : 'Reject'}
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApproveConfirm}
                    disabled={isActionLoading}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    {isBn ? 'অনুমোদন করুন' : 'Approve Response'}
                  </Button>
                </>
              )}

              {response.status === 'approved' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isActionLoading}
                    leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    {isBn ? 'বাতিল' : 'Reject'}
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePublishConfirm}
                    disabled={isActionLoading}
                    leftIcon={<Globe className="w-3.5 h-3.5" />}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isBn ? 'সরাসরি প্রকাশ করুন' : 'Publish Live'}
                  </Button>
                </>
              )}

              {response.status === 'published' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsUnpublishModalOpen(true)}
                  disabled={isActionLoading}
                  leftIcon={<EyeOff className="w-3.5 h-3.5 text-amber-500" />}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                >
                  {isBn ? 'অপ্রকাশিত / গোপন করুন' : 'Unpublish'}
                </Button>
              )}

              {response.status === 'unpublished' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublishConfirm}
                  disabled={isActionLoading}
                  leftIcon={<Globe className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  {isBn ? 'পুনরায় প্রকাশ করুন' : 'Re-Publish'}
                </Button>
              )}

              {response.status === 'rejected' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleApproveConfirm}
                  disabled={isActionLoading}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  className="text-xs"
                >
                  {isBn ? 'পুনর্বিবেচনা ও অনুমোদন' : 'Reconsider & Approve'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* ===================== MOBILE ONLY TAB VIEW (<sm) ===================== */}
        <div className="sm:hidden space-y-4">
          {/* Mobile Tab Header */}
          <div className="-mt-1 pb-2 border-b border-slate-200 dark:border-slate-800">
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
                <User className="w-3.5 h-3.5" />
                <span>{isBn ? 'সারসংক্ষেপ' : 'Overview'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('content')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
                  mobileTab === 'content'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isBn ? 'বিবরণ ও খসড়া' : 'Content & Draft'}</span>
              </button>

              {hasMedia && (
                <button
                  type="button"
                  onClick={() => setMobileTab('media')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
                    mobileTab === 'media'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ছবি ও ফাইল' : 'Media'} ({response.media?.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileTab('timeline')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
                  mobileTab === 'timeline'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <History className="w-3.5 h-3.5" />
                <span>{isBn ? 'টাইমলাইন' : 'Timeline'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Tab Contents */}
          {mobileTab === 'overview' && (
            <div className="space-y-4">
              {topStatusBar}
              {rejectionOrUnpublishWarning}
              {authorProfileCard}
              {relatedContextCard}
            </div>
          )}

          {mobileTab === 'content' && (
            <div className="space-y-4">
              {responseContentSection}
            </div>
          )}

          {mobileTab === 'media' && hasMedia && (
            <div className="space-y-4">
              {mediaSection}
            </div>
          )}

          {mobileTab === 'timeline' && (
            <div className="space-y-4">
              {timelineSection}
            </div>
          )}
        </div>

        {/* ===================== DESKTOP UNCHANGED VIEW (sm+) ===================== */}
        <div className="hidden sm:block space-y-6">
          {/* Top Status & Overview Bar */}
          {topStatusBar}

          {/* Rejection / Unpublish Warnings if present */}
          {rejectionOrUnpublishWarning}

          {/* 1. Author Information Card */}
          {authorProfileCard}

          {/* 2. Related Context Card */}
          {relatedContextCard}

          {/* 3. Response Content & Public Version Control */}
          {responseContentSection}

          {/* 4. Media Attachments */}
          {mediaSection}

          {/* 5. Moderation Timeline Audit Log */}
          {timelineSection}
        </div>
      </Drawer>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title={isBn ? 'প্রতিক্রিয়া বাতিলের কারণ নির্ধারণ' : 'Reject Response'}
        description={
          isBn
            ? 'বাতিলের কারণ নির্বাচন করুন এবং অভ্যন্তরীণ অডিটের জন্য বিস্তারিত ব্যাখ্যা প্রদান করুন।'
            : 'Select rejection category and provide clear explanation for audit logging.'
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={isActionLoading}
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRejectConfirm}
              disabled={!rejectionExplanation.trim() || isActionLoading}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              {isBn ? 'বাতিল নিশ্চিত করুন' : 'Confirm Rejection'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'বাতিলের বিভাগীয় কারণ' : 'Rejection Category'}
            </label>
            <Select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              options={rejectionReasonOptions}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'বিস্তারিত ব্যাখ্যা (বাধ্যতামূলক)' : 'Detailed Justification (Mandatory)'}
            </label>
            <Textarea
              value={rejectionExplanation}
              onChange={(e) => setRejectionExplanation(e.target.value)}
              placeholder={
                isBn
                  ? 'কেন এই প্রতিক্রিয়াটি জনসম্মুখে প্রকাশের উপযোগী নয় তার কারণ লিখুন...'
                  : 'Explain why this response violates guidelines or cannot be published...'
              }
              rows={3}
              className="text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* Unpublish Modal */}
      <Modal
        isOpen={isUnpublishModalOpen}
        onClose={() => setIsUnpublishModalOpen(false)}
        title={isBn ? 'প্রতিক্রিয়া অপ্রকাশিত করার কারণ' : 'Unpublish Response'}
        description={
          isBn
            ? 'পাবলিক পোর্টাল থেকে প্রতিক্রিয়াটি সাময়িক প্রত্যাহার করার প্রশাসনিক কারণ লিখুন।'
            : 'Provide administrative rationale for removing response from public visibility.'
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsUnpublishModalOpen(false)}
              disabled={isActionLoading}
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleUnpublishConfirm}
              disabled={!unpublishReason.trim() || isActionLoading}
              leftIcon={<EyeOff className="w-3.5 h-3.5" />}
            >
              {isBn ? 'অপ্রকাশিত নিশ্চিত করুন' : 'Confirm Unpublish'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'প্রত্যাহারের কারণ (বাধ্যতামূলক)' : 'Reason for Unpublishing (Mandatory)'}
            </label>
            <Textarea
              value={unpublishReason}
              onChange={(e) => setUnpublishReason(e.target.value)}
              placeholder={
                isBn
                  ? 'উদা: সময়সূচি পরিবর্তন বা অধিকতর তদন্তের স্বার্থে সাময়িক প্রত্যাহার...'
                  : 'e.g., Contractor schedule revised; holding until updated schedule confirmed...'
              }
              rows={3}
              className="text-xs"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ResponseDetailDrawer;
