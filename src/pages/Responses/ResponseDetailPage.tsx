import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { ResponseItem, ResponseTimelineEvent } from '@/types/Response';
import { responseApi } from '@/services/api';
import {
  ArrowLeft,
  RefreshCw,
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
  Check,
  User,
  History,
  Image as ImageIcon,
  ExternalLink,
  Info,
} from 'lucide-react';
import { cn } from '@/utils';
import { formatRelativeTime } from '@/utils/notificationUtils';

export const ResponseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [loading, setLoading] = useState<boolean>(true);
  const [response, setResponse] = useState<ResponseItem | null>(null);
  const [timeline, setTimeline] = useState<ResponseTimelineEvent[]>([]);
  const [error, setError] = useState<boolean>(false);

  // Workflow modals & states
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Form states for workflow actions
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('policy_violation');
  const [rejectionExplanation, setRejectionExplanation] = useState<string>('');
  const [unpublishReason, setUnpublishReason] = useState<string>('');

  // Public Version Editor State
  const [isEditingPublic, setIsEditingPublic] = useState<boolean>(false);
  const [publicContentEn, setPublicContentEn] = useState<string>('');
  const [publicContentBn, setPublicContentBn] = useState<string>('');

  const fetchResponseData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const data = await responseApi.getResponseById(id);
      if (!data) {
        setError(true);
      } else {
        setResponse(data);
        setPublicContentEn(data.publicContentEn || data.contentEn);
        setPublicContentBn(data.publicContentBn || data.contentBn);

        const events = await responseApi.getResponseTimeline(id);
        setTimeline(events);
      }
    } catch (err) {
      console.error('Failed to load response:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResponseData();
  }, [fetchResponseData]);

  // Workflow Action Handlers
  const handleApprove = async () => {
    if (!response) return;
    setIsActionLoading(true);
    try {
      const res = await responseApi.approveResponse(response.id, approvalNotes);
      if (res.success) {
        setResponse(res.response);
        setIsApproving(false);
        setApprovalNotes('');
        const events = await responseApi.getResponseTimeline(response.id);
        setTimeline(events);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!response) return;
    setIsActionLoading(true);
    try {
      const res = await responseApi.publishResponse(response.id);
      if (res.success) {
        setResponse(res.response);
        setIsPublishing(false);
        const events = await responseApi.getResponseTimeline(response.id);
        setTimeline(events);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!response || !unpublishReason.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await responseApi.unpublishResponse(response.id, unpublishReason);
      if (res.success) {
        setResponse(res.response);
        setIsUnpublishModalOpen(false);
        setUnpublishReason('');
        const events = await responseApi.getResponseTimeline(response.id);
        setTimeline(events);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!response || !rejectionExplanation.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await responseApi.rejectResponse(
        response.id,
        rejectionReason,
        rejectionExplanation
      );
      if (res.success) {
        setResponse(res.response);
        setIsRejectModalOpen(false);
        setRejectionExplanation('');
        const events = await responseApi.getResponseTimeline(response.id);
        setTimeline(events);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSavePublicVersion = async () => {
    if (!response) return;
    setIsActionLoading(true);
    try {
      const res = await responseApi.updatePublicVersion(
        response.id,
        publicContentEn,
        publicContentBn
      );
      if (res.success) {
        setResponse(res.response);
        setIsEditingPublic(false);
        const events = await responseApi.getResponseTimeline(response.id);
        setTimeline(events);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: ResponseItem['status']) => {
    switch (status) {
      case 'published':
        return (
          <Badge status="published" size="md" dot>
            {isBn ? 'প্রকাশিত' : 'Published'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge status="approved" size="md" dot>
            {isBn ? 'অনুমোদিত' : 'Approved'}
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge status="pending" size="md" dot>
            {isBn ? 'পর্যালোচনাধীন' : 'Pending Review'}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge status="rejected" size="md">
            {isBn ? 'বাতিলকৃত' : 'Rejected'}
          </Badge>
        );
      case 'unpublished':
        return (
          <Badge status="default" size="md">
            {isBn ? 'অপ্রকাশিত' : 'Unpublished'}
          </Badge>
        );
      default:
        return <Badge status="default" size="md">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
            <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <EmptyState
          icon={MessageSquare}
          title={isBn ? 'প্রতিক্রিয়া পাওয়া যায়নি' : 'Response Not Found'}
          description={
            isBn
              ? 'অনুরোধকৃত প্রতিক্রিয়া রেকর্ডটি মুছে ফেলা হয়েছে অথবা আইডি ভুল হতে পারে।'
              : 'The requested response record does not exist or may have been removed.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/responses')}
            >
              {isBn ? 'প্রতিক্রিয়া তালিকায় ফিরুন' : 'Back to Responses'}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back navigation & Page Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/responses')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-3 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 -ml-2"
        >
          <span>{isBn ? 'সকল প্রতিক্রিয়া' : 'All Responses'}</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                {response.id}
              </span>
              {getStatusBadge(response.status)}
              {response.isOfficial && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                  <ShieldCheck className="w-3 h-3" />
                  {isBn ? 'অফিশিয়াল কর্তৃপক্ষ' : 'Official Authority'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn ? 'দাখিলের সময়: ' : 'Submitted: '}
              {new Date(response.createdAt).toLocaleString(isBn ? 'bn-BD' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {' • '}
              {formatRelativeTime(response.createdAt, isBn ? 'bn' : 'en')}
            </p>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchResponseData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>

            {response.status === 'pending_review' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsApproving(true)}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {isBn ? 'অনুমোদন করুন' : 'Approve'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(true)}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  {isBn ? 'বাতিল করুন' : 'Reject'}
                </Button>
              </>
            )}

            {response.status === 'approved' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsPublishing(true)}
                  leftIcon={<Globe className="w-3.5 h-3.5" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isBn ? 'প্রকাশ করুন' : 'Publish Live'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(true)}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  {isBn ? 'বাতিল করুন' : 'Reject'}
                </Button>
              </>
            )}

            {response.status === 'published' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsUnpublishModalOpen(true)}
                leftIcon={<EyeOff className="w-3.5 h-3.5" />}
                className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
              >
                {isBn ? 'অপ্রকাশিত করুন' : 'Unpublish'}
              </Button>
            )}

            {response.status === 'unpublished' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPublishing(true)}
                leftIcon={<Globe className="w-3.5 h-3.5" />}
              >
                {isBn ? 'পুনরায় প্রকাশ করুন' : 'Re-publish'}
              </Button>
            )}

            {response.status === 'rejected' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsApproving(true)}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                {isBn ? 'পুনর্বিবেচনা ও অনুমোদন' : 'Re-approve'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Record Card */}
          <Card variant="default">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <Layers className="w-4 h-4 text-sky-500" />
                  {isBn ? 'সংযুক্ত নাগরিক রেকর্ড' : 'Linked Civic Record'}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  {response.relatedType === 'complaint'
                    ? isBn ? 'অভিযোগ' : 'Complaint'
                    : isBn ? 'পোস্ট' : 'Feed Post'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {isBn ? response.relatedTitleBn : response.relatedTitleEn}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-mono text-sky-600 dark:text-sky-400 font-medium">
                      {response.relatedId}
                    </span>
                    <span>•</span>
                    <span>{isBn ? response.categoryBn : response.categoryEn}</span>
                    {response.ward && (
                      <>
                        <span>•</span>
                        <span>{response.ward}</span>
                      </>
                    )}
                  </div>
                </div>

                {response.relatedType === 'complaint' && (
                  <Link
                    to={`/complaints/${response.relatedId}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline shrink-0"
                  >
                    <span>{isBn ? 'অভিযোগ দেখুন' : 'View Complaint'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submitted Content (Original) */}
          <Card variant="default">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <span>{isBn ? 'দাখিলকৃত প্রতিক্রিয়ার বিবরণ' : 'Submitted Response Content'}</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {isBn ? 'দ্বিভাষিক সংস্করণ' : 'Bilingual Submission'}
                </span>
              </div>

              {/* English text */}
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  English
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {response.contentEn}
                </p>
              </div>

              {/* Bengali text */}
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  বাংলা (Bengali)
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {response.contentBn}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Public Version Preview & Editor */}
          <Card variant="default">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span>{isBn ? 'সর্বসাধারণের জন্য প্রকাশিত কপি' : 'Public-Facing Citizen Copy'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isBn
                      ? 'নাগরিক অ্যাপ এবং পাবলিক পোর্টালে এই সংস্করণটি প্রদর্শিত হবে।'
                      : 'This concise copy is displayed to citizens on the public feed portal.'}
                  </p>
                </div>

                {!isEditingPublic ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditingPublic(true)}
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    {isBn ? 'সম্পাদনা করুন' : 'Edit Copy'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingPublic(false);
                        setPublicContentEn(response.publicContentEn || response.contentEn);
                        setPublicContentBn(response.publicContentBn || response.contentBn);
                      }}
                      className="text-xs"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSavePublicVersion}
                      disabled={isActionLoading}
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      className="text-xs"
                    >
                      {isBn ? 'সংরক্ষণ' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              {!isEditingPublic ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      English Public Summary
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200">
                      {response.publicContentEn || response.contentEn}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      বাংলা পাবলিক সারসংক্ষেপ
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200">
                      {response.publicContentBn || response.contentBn}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Public Copy (English)
                    </label>
                    <Textarea
                      value={publicContentEn}
                      onChange={(e) => setPublicContentEn(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      পাবলিক কপি (বাংলা)
                    </label>
                    <Textarea
                      value={publicContentBn}
                      onChange={(e) => setPublicContentBn(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attached Evidence Media */}
          {response.media && response.media.length > 0 && (
            <Card variant="default">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  <span>{isBn ? 'সংযুক্ত প্রমাণাদি / ছবি' : 'Attached Media & Evidence'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {response.media.map((med) => (
                    <div
                      key={med.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/50"
                    >
                      {med.type === 'image' && (
                        <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img
                            src={med.url}
                            alt={med.caption || 'Response attachment'}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="p-3 space-y-1 text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {med.caption || med.type.toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                          {med.type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1 Column: Author & Audit Timeline */}
        <div className="space-y-6">
          {/* Author Card */}
          <Card variant="default">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{isBn ? 'প্রেরকের বিবরণ' : 'Author Information'}</span>
              </h3>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  {response.author.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="truncate">{response.author.name}</span>
                    {response.author.isVerified && (
                      <span title="Verified" className="text-sky-500">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  {response.author.nameBn && (
                    <div className="text-xs text-slate-500">{response.author.nameBn}</div>
                  )}
                  <div className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                    {isBn ? response.author.roleTitleBn : response.author.roleTitleEn}
                  </div>
                </div>
              </div>

              {response.author.organizationEn && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium truncate">
                      {isBn
                        ? response.author.organizationBn || response.author.organizationEn
                        : response.author.organizationEn}
                    </span>
                  </div>
                  {response.author.departmentEn && (
                    <div className="text-[11px] text-slate-500 pl-5 truncate">
                      {isBn
                        ? response.author.departmentBn || response.author.departmentEn
                        : response.author.departmentEn}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Notes / Rejection / Unpublish details if applicable */}
          {(response.moderatorNotes || response.rejectionReason || response.unpublishReason) && (
            <Card variant="default">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>{isBn ? 'মডারেশন নোটস' : 'Moderation Records'}</span>
                </h3>

                {response.moderatorNotes && (
                  <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-xs">
                    <span className="font-medium text-sky-800 dark:text-sky-300 block mb-0.5">
                      {isBn ? 'অনুমোদন নোট:' : 'Moderator Notes:'}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">{response.moderatorNotes}</p>
                  </div>
                )}

                {response.rejectionReason && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-xs">
                    <span className="font-medium text-red-800 dark:text-red-300 block mb-0.5">
                      {isBn ? 'বাতিলের কারণ:' : 'Rejection Reason:'} {response.rejectionReason}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">
                      {response.rejectionExplanation}
                    </p>
                  </div>
                )}

                {response.unpublishReason && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-xs">
                    <span className="font-medium text-amber-800 dark:text-amber-300 block mb-0.5">
                      {isBn ? 'অপ্রকাশের কারণ:' : 'Unpublish Reason:'}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">
                      {response.unpublishReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Audit Timeline */}
          <Card variant="default">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>{isBn ? 'কার্যকলাপের ইতিহাস' : 'Workflow Timeline'}</span>
              </h3>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {timeline.map((event) => (
                  <div key={event.id} className="relative text-xs">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-sky-500" />
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {isBn ? event.titleBn : event.titleEn}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isBn ? event.descriptionBn : event.descriptionEn}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {formatRelativeTime(event.timestamp, isBn ? 'bn' : 'en')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={isApproving}
        onClose={() => setIsApproving(false)}
        title={isBn ? 'প্রতিক্রিয়া অনুমোদন করুন' : 'Approve Response'}
      >
        <div className="space-y-4 p-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            {isBn
              ? 'এই প্রতিক্রিয়াটি অনুমোদন করলে এটি প্রকাশের জন্য প্রস্তুত হবে।'
              : 'Approving this response marks it as verified and ready for live publication to citizens.'}
          </p>
          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {isBn ? 'অভ্যন্তরীণ মন্তব্য (ঐচ্ছিক)' : 'Internal Notes (Optional)'}
            </label>
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Verified with Zone 4 engineer"
              rows={3}
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsApproving(false)}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              disabled={isActionLoading}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {isBn ? 'অনুমোদন নিশ্চিত করুন' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publish Modal */}
      <Modal
        isOpen={isPublishing}
        onClose={() => setIsPublishing(false)}
        title={isBn ? 'লাইভ ফিডে প্রকাশ করুন' : 'Publish to Live Citizen Feed'}
      >
        <div className="space-y-4 p-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            {isBn
              ? 'এই প্রতিক্রিয়াটি প্রকাশ করলে সকল নাগরিক এবং অভিযোগকারী পাবলিক প্ল্যাটফর্মে দেখতে পাবেন।'
              : 'This action makes the response visible to citizens and the original reporter on the live portal.'}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPublishing(false)}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePublish}
              disabled={isActionLoading}
              leftIcon={<Globe className="w-3.5 h-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isBn ? 'প্রকাশনা নিশ্চিত করুন' : 'Confirm Publish'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unpublish Modal */}
      <Modal
        isOpen={isUnpublishModalOpen}
        onClose={() => setIsUnpublishModalOpen(false)}
        title={isBn ? 'প্রতিক্রিয়া অপ্রকাশিত করুন' : 'Unpublish Response'}
      >
        <div className="space-y-4 p-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            {isBn
              ? 'লাইভ প্ল্যাটফর্ম থেকে প্রতিক্রিয়াটি সরিয়ে ফেলা হবে। অপ্রকাশের কারণ উল্লেখ করুন।'
              : 'This will hide the response from the public feed. Please state the reason for audit compliance.'}
          </p>
          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {isBn ? 'অপ্রকাশের কারণ' : 'Reason for Unpublishing'} *
            </label>
            <Textarea
              value={unpublishReason}
              onChange={(e) => setUnpublishReason(e.target.value)}
              placeholder="e.g. Schedule updated, pending revision"
              rows={3}
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsUnpublishModalOpen(false)}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleUnpublish}
              disabled={!unpublishReason.trim() || isActionLoading}
              leftIcon={<EyeOff className="w-3.5 h-3.5" />}
            >
              {isBn ? 'অপ্রকাশ নিশ্চিত করুন' : 'Confirm Unpublish'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title={isBn ? 'প্রতিক্রিয়া বাতিল করুন' : 'Reject Response'}
      >
        <div className="space-y-4 p-4 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {isBn ? 'বাতিলের বিভাগ' : 'Rejection Reason Code'}
            </label>
            <Select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              options={[
                { value: 'policy_violation', label: 'Policy Violation / নিয়ম লঙ্ঘন' },
                { value: 'commercial_spam', label: 'Commercial Spam / বাণিজ্যিক বিজ্ঞাপন' },
                { value: 'misleading_info', label: 'Misleading Information / বিভ্রান্তিকর তথ্য' },
                { value: 'inappropriate_content', label: 'Inappropriate Content / অনুপযুক্ত বিষয়বস্তু' },
                { value: 'unrelated', label: 'Unrelated to Incident / ঘটনার সাথে অপ্রাসঙ্গিক' },
              ]}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {isBn ? 'বিস্তারিত ব্যাখ্যা' : 'Detailed Explanation'} *
            </label>
            <Textarea
              value={rejectionExplanation}
              onChange={(e) => setRejectionExplanation(e.target.value)}
              placeholder="Please provide the exact rationale..."
              rows={3}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleReject}
              disabled={!rejectionExplanation.trim() || isActionLoading}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              {isBn ? 'বাতিল নিশ্চিত করুন' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResponseDetailPage;
