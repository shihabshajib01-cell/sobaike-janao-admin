import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Complaint, ComplaintTimelineEvent, ComplaintUrgency } from '@/types/Complaint';
import { complaintApi } from '@/services';
import { useComplaintEditTaxonomy } from '@/hooks/useComplaintEditTaxonomy';
import {
  getAvailableComplaintActions,
  getComplaintStatusGuidance,
  ComplaintActionConfig,
  ComplaintActionId,
} from '@/utils/complaintActions';
import {
  ShieldAlert,
  Edit,
  XCircle,
  Share2,
  EyeOff,
  Info,
  Check,
  AlertTriangle,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils';

export interface ComplaintActionAreaProps {
  complaint: Complaint;
  className?: string;
  onComplaintUpdated?: (
    complaint: Complaint,
    timeline: ComplaintTimelineEvent[],
    timelineError?: string | null
  ) => void;
}

type ActionModalType = ComplaintActionId | null;

const RAW_TITLE_MAX_LENGTH = 100;

export const ComplaintActionArea: React.FC<ComplaintActionAreaProps> = ({
  complaint,
  className,
  onComplaintUpdated,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [activeModal, setActiveModal] = useState<ActionModalType>(null);
  const [actionNotes, setActionNotes] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('duplicate');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Edit Complaint Form State
  const [editTitleEn, setEditTitleEn] = useState(complaint.titleEn || '');
  const [editTitleBn, setEditTitleBn] = useState(complaint.titleBn || '');
  const [editDescEn, setEditDescEn] = useState(complaint.descriptionEn || '');
  const [editDescBn, setEditDescBn] = useState(complaint.descriptionBn || '');
  const [editCategoryId, setEditCategoryId] = useState(complaint.categoryId || '');
  const [editSubcategoryId, setEditSubcategoryId] = useState(complaint.subcategoryId || '');
  const [editUrgency, setEditUrgency] = useState<ComplaintUrgency>(complaint.urgency || 'medium');
  const [editWard, setEditWard] = useState(complaint.location?.ward || '');
  const [editZone, setEditZone] = useState(complaint.location?.zone || '');
  const [editAddressEn, setEditAddressEn] = useState(complaint.location?.addressEn || '');
  const [editAddressBn, setEditAddressBn] = useState(complaint.location?.addressBn || '');
  const [editNotes, setEditNotes] = useState('');

  const {
    categories: liveCategories,
    getSubcategories,
    loading: taxonomyLoading,
    error: taxonomyError,
    reload: reloadTaxonomy,
  } = useComplaintEditTaxonomy(activeModal === 'edit');

  const currentCategoryFallback = useMemo(
    () => ({
      value: complaint.categoryId,
      labelEn: complaint.categoryEn || complaint.categoryId,
      labelBn: complaint.categoryBn || complaint.categoryId,
    }),
    [complaint.categoryId, complaint.categoryEn, complaint.categoryBn]
  );

  const categoryOptions = useMemo(() => {
    if (liveCategories.length > 0) return liveCategories;
    return complaint.categoryId ? [currentCategoryFallback] : [];
  }, [liveCategories, complaint.categoryId, currentCategoryFallback]);

  const selectedLiveSubcategories = getSubcategories(editCategoryId);
  const subcategoryOptions = useMemo(() => {
    if (selectedLiveSubcategories.length > 0) return selectedLiveSubcategories;
    if (editCategoryId === complaint.categoryId && complaint.subcategoryId) {
      return [
        {
          value: complaint.subcategoryId,
          labelEn: complaint.subcategoryEn || complaint.subcategoryId,
          labelBn: complaint.subcategoryBn || complaint.subcategoryId,
        },
      ];
    }
    return [];
  }, [
    selectedLiveSubcategories,
    editCategoryId,
    complaint.categoryId,
    complaint.subcategoryId,
    complaint.subcategoryEn,
    complaint.subcategoryBn,
  ]);

  const initEditForm = (comp: Complaint) => {
    setEditTitleEn(comp.titleEn || '');
    setEditTitleBn(comp.titleBn || '');
    setEditDescEn(comp.descriptionEn || '');
    setEditDescBn(comp.descriptionBn || '');
    setEditCategoryId(comp.categoryId || '');
    setEditSubcategoryId(comp.subcategoryId || '');
    setEditUrgency(comp.urgency || 'medium');
    setEditWard(comp.location?.ward || '');
    setEditZone(comp.location?.zone || '');
    setEditAddressEn(comp.location?.addressEn || '');
    setEditAddressBn(comp.location?.addressBn || '');
    setEditNotes('');
  };

  useEffect(() => {
    initEditForm(complaint);
  }, [complaint]);

  const availableActions = getAvailableComplaintActions(complaint.status);
  const statusGuidance = getComplaintStatusGuidance(complaint.status, language);
  const { hasPermission, hasAnyPermission } = useAuth();

  const isActionPermitted = (actionId: ComplaintActionId) => {
    switch (actionId) {
      case 'publish':
        return hasPermission('complaints.publish');
      case 'unpublish':
        return hasPermission('complaints.unpublish');
      case 'reject':
        return hasPermission('complaints.reject');
      case 'edit':
        return hasAnyPermission(['complaints.publish', 'complaints.unpublish', 'complaints.reject']);
      default:
        return false;
    }
  };

  const permittedActions = availableActions.filter((action) => isActionPermitted(action.id));

  const closeModal = () => {
    if (isSubmitting) return;
    setActiveModal(null);
    setActionNotes('');
    setActionError(null);
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackToast({ type, message });
    window.setTimeout(() => {
      setFeedbackToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const handleSaveEdit = async () => {
    const cleanTitleBn = editTitleBn.trim();
    const cleanTitleEn = editTitleEn.trim();
    const cleanDescBn = editDescBn.trim();
    const cleanDescEn = editDescEn.trim();

    if (!cleanTitleBn && !cleanTitleEn) {
      setActionError(
        isBn ? 'অন্তত একটি শিরোনাম প্রয়োজন।' : 'At least one complaint title is required.'
      );
      return;
    }

    if (
      cleanTitleBn.length > RAW_TITLE_MAX_LENGTH ||
      cleanTitleEn.length > RAW_TITLE_MAX_LENGTH
    ) {
      setActionError(
        isBn
          ? `শিরোনাম সর্বোচ্চ ${RAW_TITLE_MAX_LENGTH} অক্ষরের হতে পারবে।`
          : `Complaint titles are limited to ${RAW_TITLE_MAX_LENGTH} characters.`
      );
      return;
    }

    if (!cleanDescBn && !cleanDescEn) {
      setActionError(
        isBn ? 'অন্তত একটি বিবরণ প্রয়োজন।' : 'At least one complaint description is required.'
      );
      return;
    }

    const selectedCategory = categoryOptions.find((item) => item.value === editCategoryId);
    const selectedSubcategory = subcategoryOptions.find(
      (item) => item.value === editSubcategoryId
    );

    if (!selectedCategory || !selectedSubcategory) {
      setActionError(
        isBn
          ? 'লাইভ ক্যাটাগরি ও সাবক্যাটাগরি যাচাই করা যায়নি। আবার চেষ্টা করুন।'
          : 'The live category/subcategory contract could not be verified. Retry and try again.'
      );
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      // public.complaints.title/description are the canonical/default-language columns.
      // If a record is English-only, mirror the English value into the canonical column so
      // Admin edits do not leave stale text behind or create a false Bangla/English pair.
      const canonicalTitle = cleanTitleBn || cleanTitleEn;
      const canonicalDescription = cleanDescBn || cleanDescEn;

      const updates: Partial<Complaint> = {
        titleEn: cleanTitleEn || undefined,
        titleBn: canonicalTitle,
        descriptionEn: cleanDescEn || undefined,
        descriptionBn: canonicalDescription,
        categoryId: editCategoryId,
        categoryEn: selectedCategory.labelEn,
        categoryBn: selectedCategory.labelBn,
        subcategoryId: selectedSubcategory.value,
        subcategoryEn: selectedSubcategory.labelEn,
        subcategoryBn: selectedSubcategory.labelBn,
        urgency: editUrgency,
        location: {
          ...complaint.location,
          ward: editWard.trim(),
          zone: editZone.trim(),
          addressEn: editAddressEn || complaint.location?.addressEn || '',
          addressBn: editAddressBn || complaint.location?.addressBn || '',
        },
      };

      const result = await complaintApi.editComplaint(complaint.id, updates, editNotes);
      showToast(isBn ? result.messageBn : result.messageEn, 'success');
      onComplaintUpdated?.(result.complaint, result.timeline, result.timelineError || null);
      closeModal();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!actionNotes.trim()) {
      setActionError(
        isBn
          ? 'অনুগ্রহ করে বাতিলের বিস্তারিত কারণ উল্লেখ করুন।'
          : 'Please enter a clear explanation for rejecting this complaint.'
      );
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await complaintApi.rejectComplaint(
        complaint.id,
        rejectReason,
        actionNotes
      );
      showToast(isBn ? result.messageBn : result.messageEn, 'info');
      if (onComplaintUpdated) {
        const preservedComplaint = {
          ...result.complaint,
          media:
            result.complaint.media && result.complaint.media.length > 0
              ? result.complaint.media
              : complaint.media,
        };
        onComplaintUpdated(preservedComplaint, result.timeline, result.timelineError || null);
      }
      closeModal();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await complaintApi.publishComplaint(complaint.id);
      showToast(isBn ? result.messageBn : result.messageEn, 'success');
      if (onComplaintUpdated) {
        const preservedComplaint = {
          ...result.complaint,
          media:
            result.complaint.media && result.complaint.media.length > 0
              ? result.complaint.media
              : complaint.media,
        };
        onComplaintUpdated(preservedComplaint, result.timeline, result.timelineError || null);
      }
      closeModal();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to publish complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await complaintApi.unpublishComplaint(complaint.id);
      showToast(isBn ? result.messageBn : result.messageEn, 'info');
      if (onComplaintUpdated) {
        const preservedComplaint = {
          ...result.complaint,
          media:
            result.complaint.media && result.complaint.media.length > 0
              ? result.complaint.media
              : complaint.media,
        };
        onComplaintUpdated(preservedComplaint, result.timeline, result.timelineError || null);
      }
      closeModal();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to unpublish complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActionIcon = (iconName: ComplaintActionConfig['iconName']) => {
    switch (iconName) {
      case 'Edit':
        return <Edit className="w-4 h-4 text-white" />;
      case 'Share2':
        return <Share2 className="w-4 h-4 text-white" />;
      case 'EyeOff':
        return <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
      case 'XCircle':
        return <XCircle className="w-4 h-4 text-white" />;
      default:
        return null;
    }
  };

  const openAction = (actionId: ComplaintActionId) => {
    setActionError(null);
    if (actionId === 'edit') initEditForm(complaint);
    setActiveModal(actionId);
  };

  return (
    <>
      <Card variant="default" className={cn('overflow-hidden', className)}>
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>
              {isBn ? 'প্রশাসনিক ট্রায়াজ ও অ্যাকশন কন্ট্রোল' : 'Administrative Triage & Actions'}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {statusGuidance && (
            <div className="p-3 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold">
                  {isBn ? 'বর্তমান স্ট্যাটাস নির্দেশিকা:' : 'Status Transition Guidance:'}
                </span>
                <p className="text-sky-800 dark:text-sky-300">{statusGuidance}</p>
              </div>
            </div>
          )}

          {feedbackToast && (
            <div
              className={cn(
                'p-3 rounded-lg border text-xs flex items-center gap-2 animate-in fade-in transition-all',
                feedbackToast.type === 'success' &&
                  'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
                feedbackToast.type === 'info' &&
                  'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
                feedbackToast.type === 'error' &&
                  'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              )}
            >
              {feedbackToast.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : feedbackToast.type === 'info' ? (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{feedbackToast.message}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="type-meta font-semibold uppercase tracking-wider text-slate-400">
                {isBn ? 'উপলব্ধ ট্রায়াজ পদক্ষেপসমূহ' : 'Available Operational Actions'}
              </span>
              <span className="type-meta text-slate-400 font-mono">
                {isBn ? 'রিয়েল-টাইম অডিট' : 'Audit-Ready'}
              </span>
            </div>

            {permittedActions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {permittedActions.map((action) => (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    size="sm"
                    onClick={() => openAction(action.id)}
                    leftIcon={renderActionIcon(action.iconName)}
                    className={cn(
                      'justify-start h-9 text-xs',
                      action.id === 'publish' &&
                        'bg-sky-600 hover:bg-sky-700 text-white shadow-xs',
                      permittedActions.length === 1 && 'col-span-full'
                    )}
                  >
                    <span>{isBn ? action.labelBn : action.labelEn}</span>
                  </Button>
                ))}
              </div>
            ) : availableActions.length > 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {isBn
                    ? 'আপনার ভূমিকা অনুযায়ী পদক্ষেপ গ্রহণের অনুমতি নেই (শুধুমাত্র দর্শনযোগ্য)।'
                    : 'Your role has read-only access. No triage actions permitted.'}
                </span>
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
                {isBn
                  ? 'বর্তমান স্ট্যাটাসে কোনো সরাসরি ট্রায়াজ পদক্ষেপ অবশিষ্ট নেই।'
                  : 'No active triage actions required for the current lifecycle status.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={activeModal === 'edit'}
        onClose={closeModal}
        title={isBn ? 'অভিযোগের বিবরণ সম্পাদনা' : 'Edit Complaint Details'}
        description={
          isBn
            ? `অভিযোগ নম্বর ${complaint.id} এর শিরোনাম, বিবরণ, ক্যাটাগরি ও লোকেশন তথ্য আপডেট করুন।`
            : `Update complaint ${complaint.id} details, classification, urgency, or location.`
        }
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={isSubmitting}>
              <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleSaveEdit}
              leftIcon={<Check className="w-3.5 h-3.5" />}
              disabled={isSubmitting || taxonomyLoading}
            >
              <span>{isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {actionError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-md text-xs text-rose-700 dark:text-rose-300">
              {actionError}
            </div>
          )}

          {taxonomyError && (
            <div className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {isBn
                    ? 'লাইভ ট্যাক্সোনমি লোড করা যায়নি। বর্তমান ক্যাটাগরি অপরিবর্তিত রেখে অন্যান্য তথ্য সম্পাদনা করা যাবে, অথবা আবার চেষ্টা করুন।'
                    : 'Live taxonomy could not be loaded. You can keep the current classification and edit other fields, or retry.'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void reloadTaxonomy()}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                <span>{isBn ? 'আবার চেষ্টা' : 'Retry'}</span>
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={isBn ? 'শিরোনাম (বাংলা)' : 'Title (Bangla)'}
              value={editTitleBn}
              onChange={(e) => setEditTitleBn(e.target.value)}
              placeholder="অভিযোগের শিরোনাম বাংলায়..."
              disabled={isSubmitting}
              maxLength={RAW_TITLE_MAX_LENGTH}
              helperText={`${editTitleBn.length}/${RAW_TITLE_MAX_LENGTH}`}
            />
            <Input
              label={isBn ? 'শিরোনাম (ইংরেজি)' : 'Title (English)'}
              value={editTitleEn}
              onChange={(e) => setEditTitleEn(e.target.value)}
              placeholder="Title in English..."
              disabled={isSubmitting}
              maxLength={RAW_TITLE_MAX_LENGTH}
              helperText={`${editTitleEn.length}/${RAW_TITLE_MAX_LENGTH}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={isBn ? 'ক্যাটাগরি / বিভাগ' : 'Category'}
              value={editCategoryId}
              onChange={(e) => {
                const newCategory = e.target.value;
                setEditCategoryId(newCategory);
                const nextSubcategories = getSubcategories(newCategory);
                setEditSubcategoryId(nextSubcategories[0]?.value || '');
              }}
              options={categoryOptions.map((item) => ({
                value: item.value,
                label: isBn ? item.labelBn : item.labelEn,
              }))}
              disabled={isSubmitting || taxonomyLoading || categoryOptions.length === 0}
              helperText={taxonomyLoading ? (isBn ? 'লাইভ ক্যাটাগরি লোড হচ্ছে…' : 'Loading live categories…') : undefined}
            />

            <Select
              label={isBn ? 'সাবক্যাটাগরি' : 'Subcategory'}
              value={editSubcategoryId}
              onChange={(e) => setEditSubcategoryId(e.target.value)}
              options={subcategoryOptions.map((item) => ({
                value: item.value,
                label: isBn ? item.labelBn : item.labelEn,
              }))}
              disabled={isSubmitting || taxonomyLoading || subcategoryOptions.length === 0}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={isBn ? 'জরুরিতা / প্রায়োরিটি' : 'Urgency Priority'}
              value={editUrgency}
              onChange={(e) => setEditUrgency(e.target.value as ComplaintUrgency)}
              options={[
                { value: 'low', label: isBn ? 'নিম্ন (Low)' : 'Low' },
                { value: 'medium', label: isBn ? 'মাঝারি (Medium)' : 'Medium' },
                { value: 'high', label: isBn ? 'উচ্চ (High)' : 'High' },
                { value: 'urgent', label: isBn ? 'জরুরি (Urgent)' : 'Urgent' },
              ]}
              disabled={isSubmitting}
            />

            <Input
              label={isBn ? 'উপজেলা / থানা' : 'Upazila / Thana'}
              value={editWard}
              onChange={(e) => setEditWard(e.target.value)}
              placeholder={isBn ? 'উপজেলা বা থানার নাম...' : 'Upazila or thana...'}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={isBn ? 'জেলা' : 'District'}
              value={editZone}
              onChange={(e) => setEditZone(e.target.value)}
              placeholder={isBn ? 'জেলার নাম...' : 'District...'}
              disabled={isSubmitting}
            />
            <Input
              label={isBn ? 'ঠিকানা (বাংলা)' : 'Address (Bangla)'}
              value={editAddressBn}
              onChange={(e) => setEditAddressBn(e.target.value)}
              placeholder="ঠিকানা বাংলায়..."
              disabled={isSubmitting}
            />
          </div>

          <Input
            label={isBn ? 'ঠিকানা (ইংরেজি)' : 'Address (English)'}
            value={editAddressEn}
            onChange={(e) => setEditAddressEn(e.target.value)}
            placeholder="Address in English..."
            disabled={isSubmitting}
          />

          <div className="space-y-3">
            <Textarea
              label={isBn ? 'বিস্তারিত বিবরণ (বাংলা)' : 'Description (Bangla)'}
              value={editDescBn}
              onChange={(e) => setEditDescBn(e.target.value)}
              placeholder="অভিযোগের বিস্তারিত বিবরণ বাংলায়..."
              rows={3}
              disabled={isSubmitting}
            />
            <Textarea
              label={isBn ? 'বিস্তারিত বিবরণ (ইংরেজি)' : 'Description (English)'}
              value={editDescEn}
              onChange={(e) => setEditDescEn(e.target.value)}
              placeholder="Detailed description in English..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <Textarea
            label={
              isBn
                ? 'প্রশাসনিক নোট / মন্তব্যের সারাংশ (ঐচ্ছিক)'
                : 'Audit Note / Remarks (Optional)'
            }
            placeholder={
              isBn
                ? 'সম্পাদনার কারণ বা প্রশাসনিক মন্তব্য লিখুন...'
                : 'Enter remarks or justification for this change...'
            }
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={2}
            disabled={isSubmitting}
          />
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'reject'}
        onClose={closeModal}
        title={isBn ? 'অভিযোগ বাতিল নিশ্চিতকরণ' : 'Reject Complaint'}
        description={
          isBn
            ? `অভিযোগ ${complaint.id} বাতিল করা হচ্ছে। বাতিলের কারণ নির্বাচন করুন।`
            : `Mark complaint ${complaint.id} as rejected with auditable justification.`
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={isSubmitting}>
              <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleReject}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              <span>{isBn ? 'বাতিল নিশ্চিত করুন' : 'Confirm Rejection'}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-md text-xs text-rose-700 dark:text-rose-300">
              {actionError}
            </div>
          )}

          <Select
            label={isBn ? 'বাতিলের কারণ নির্বাচন করুন *' : 'Rejection Reason *'}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            options={[
              {
                value: 'duplicate',
                label: isBn ? 'ডুপ্লিকেট / একই বিষয়ের পুনরাবৃত্তি' : 'Duplicate Complaint',
              },
              {
                value: 'out_of_jurisdiction',
                label: isBn
                  ? 'সিটি কর্পোরেশন / প্ল্যাটফর্মের আওতা বহির্ভূত'
                  : 'Out of Jurisdiction',
              },
              {
                value: 'insufficient_evidence',
                label: isBn ? 'অপর্যাপ্ত বা ভুয়া প্রমাণাদি' : 'Insufficient / Fake Evidence',
              },
              {
                value: 'inappropriate_content',
                label: isBn
                  ? 'নীতিমালা পরিপন্থী বা অসংলগ্ন তথ্য'
                  : 'Inappropriate / Policy Violation',
              },
              {
                value: 'other',
                label: isBn ? 'অন্যান্য সুনির্দিষ্ট কারণ' : 'Other Specific Reason',
              },
            ]}
            disabled={isSubmitting}
          />

          <Textarea
            label={isBn ? 'বাতিলের বিশদ ব্যাখ্যা *' : 'Rejection Explanation *'}
            placeholder={
              isBn
                ? 'নাগরিকের অবগতির জন্য বাতিলের সুনির্দিষ্ট কারণ লিখুন...'
                : 'Provide a clear explanation for the citizen and audit record...'
            }
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            rows={3}
            disabled={isSubmitting}
            required
          />
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'publish'}
        onClose={closeModal}
        title={isBn ? 'পাবলিক ফিডে প্রকাশ' : 'Publish Complaint to Feed'}
        description={
          isBn
            ? `অভিযোগ ${complaint.id} উন্মুক্ত নাগরিক ফিডে প্রচারের জন্য প্রকাশ করুন।`
            : `Broadcast complaint ${complaint.id} on the public feed for community awareness.`
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={isSubmitting}>
              <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handlePublish}
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              <span>{isBn ? 'পাবলিক ফিডে প্রকাশ করুন' : 'Publish Live'}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-md text-xs text-rose-700 dark:text-rose-300">
              {actionError}
            </div>
          )}
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-900 text-xs text-sky-800 dark:text-sky-300 space-y-1">
            <p className="font-semibold">
              {isBn ? 'ফিড পাবলিকেশন তথ্য:' : 'Public Feed Information:'}
            </p>
            <p>
              {isBn
                ? 'প্রকাশের পর অভিযোগটি পাবলিক ফিডে দৃশ্যমান হবে।'
                : 'After publishing, this complaint will become visible on the public feed.'}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'unpublish'}
        onClose={closeModal}
        title={isBn ? 'অভিযোগের প্রকাশনা বন্ধ করবেন?' : 'Unpublish Complaint?'}
        description={
          isBn
            ? `অভিযোগ ${complaint.id} পাবলিক ফিড থেকে প্রত্যাহার করে অপ্রকাশিত অবস্থায় সংরক্ষণ করুন।`
            : `Remove complaint ${complaint.id} from the public feed and return it to Unpublished state.`
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={isSubmitting}>
              <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleUnpublish}
              leftIcon={<EyeOff className="w-3.5 h-3.5" />}
            >
              <span>{isBn ? 'প্রকাশনা বন্ধ করুন' : 'Unpublish'}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-md text-xs text-rose-700 dark:text-rose-300">
              {actionError}
            </div>
          )}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-semibold">
              {isBn ? 'স্ট্যাটাস পরিবর্তন তথ্য:' : 'Status Transition Note:'}
            </p>
            <p>
              {isBn
                ? 'প্রকাশনা বন্ধের পর অভিযোগটি অপ্রকাশিত ট্যাবে সংরক্ষিত থাকবে। পরবর্তীতে প্রয়োজনে যে কোনো সময় পুনরায় পাবলিক ফিডে প্রকাশ করতে পারবেন।'
                : 'After unpublishing, this report remains safely archived in the Unpublished tab. You can republish it to the public feed at any time.'}
            </p>
          </div>
        </div>
      </Modal>

      {permittedActions.length > 0 && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-lg flex items-center gap-2">
          {permittedActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              size="md"
              onClick={() => openAction(action.id)}
              leftIcon={renderActionIcon(action.iconName)}
              className={cn(
                'flex-1 h-10 text-xs justify-center font-medium shadow-xs',
                action.id === 'publish' && 'bg-sky-600 hover:bg-sky-700 text-white'
              )}
            >
              <span>{isBn ? action.labelBn : action.labelEn}</span>
            </Button>
          ))}
        </div>
      )}
    </>
  );
};

export default ComplaintActionArea;
