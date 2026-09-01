import React, { useState, useEffect } from 'react';
import { FeedPost, FeedPostStatus } from '@/types/Post';
import { useLanguage } from '@/context/LanguageContext';
import { getAvailableFeedActions, FeedActionId, FeedActionConfig } from '@/utils/feedActions';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { FeedMediaPreview } from './FeedMediaPreview';
import {
  XCircle,
  Globe,
  EyeOff,
  Clock,
  Layers,
  AlertTriangle,
  Info,
  Check,
  History,
  FileText,
  Edit,
  Save,
} from 'lucide-react';
import { cn } from '@/utils';

export interface FeedDetailDrawerProps {
  post: FeedPost | null;
  isOpen: boolean;
  onClose: () => void;
  onPublish: (postId: string) => Promise<void>;
  onUnpublish: (postId: string, reason: string) => Promise<void>;
  onReject: (postId: string, reason: string, explanation: string) => Promise<void>;
  onUpdate?: (postId: string, updates: Partial<FeedPost>) => Promise<void>;
  initialEditMode?: boolean;
}

// Category & Subcategory definitions matching system taxonomy
const CATEGORIES = [
  { value: 'roads_traffic', labelEn: 'Roads & Traffic', labelBn: 'রাস্তাঘাট ও ট্রাফিক' },
  { value: 'waste_management', labelEn: 'Waste Management', labelBn: 'বর্জ্য ব্যবস্থাপনা' },
  { value: 'water_drainage', labelEn: 'Water & Drainage', labelBn: 'পানি ও নিষ্কাশন' },
  { value: 'extortion', labelEn: 'Extortion', labelBn: 'চাঁদাবাজি' },
  { value: 'civic_issues', labelEn: 'Civic Problems', labelBn: 'নাগরিক সমস্যা' },
];

const SUBCATEGORIES: Record<string, { value: string; labelEn: string; labelBn: string }[]> = {
  roads_traffic: [
    { value: 'open_manhole', labelEn: 'Open Manhole', labelBn: 'উন্মুক্ত ম্যানহোল' },
    { value: 'road_damage', labelEn: 'Road Surface Damage', labelBn: 'রাস্তা ক্ষতিগ্রস্ত' },
    { value: 'traffic_signal', labelEn: 'Traffic Signal Issue', labelBn: 'ট্রাফিক সিগন্যাল' },
  ],
  waste_management: [
    { value: 'uncollected_garbage', labelEn: 'Uncollected Garbage', labelBn: 'অনপসারিত বর্জ্য' },
    { value: 'dumpster_overflow', labelEn: 'Container Overflow', labelBn: 'ডাস্টবিন উপচে পড়া' },
  ],
  water_drainage: [
    { value: 'pipe_leak', labelEn: 'Pipeline Leakage', labelBn: 'পাইপলাইন লিকেজ' },
    { value: 'water_pollution', labelEn: 'Water Pollution', labelBn: 'পানি দূষণ' },
    { value: 'waterlogging', labelEn: 'Waterlogging', labelBn: 'জলাবদ্ধতা' },
  ],
  extortion: [
    { value: 'market_toll', labelEn: 'Unlawful Market Toll', labelBn: 'অবৈধ বাজার টোল' },
    { value: 'transport_extortion', labelEn: 'Transport Extortion', labelBn: 'পরিবহন চাঁদাবাজি' },
  ],
  civic_issues: [
    { value: 'street_lighting', labelEn: 'Street Lighting', labelBn: 'সড়ক বাতি' },
    { value: 'illegal_billboards', labelEn: 'Illegal Billboards', labelBn: 'অবৈধ বিলবোর্ড' },
    { value: 'noise_pollution', labelEn: 'Noise Pollution', labelBn: 'শব্দ দূষণ' },
  ],
};

export const FeedDetailDrawer: React.FC<FeedDetailDrawerProps> = ({
  post,
  isOpen,
  onClose,
  onPublish,
  onUnpublish,
  onReject,
  onUpdate,
  initialEditMode = false,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Mode state: view vs edit
  const [isEditing, setIsEditing] = useState(initialEditMode);

  // Form state for edit mode
  const [titleBn, setTitleBn] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [contentBn, setContentBn] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [categoryId, setCategoryId] = useState('roads_traffic');
  const [subcategoryId, setSubcategoryId] = useState('');

  // Mobile active tab: 'overview' | 'content' | 'activity'
  const [mobileTab, setMobileTab] = useState<'overview' | 'content' | 'activity'>('overview');

  // Modals state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('insufficient_evidence');
  const [rejectExplanation, setRejectExplanation] = useState('');

  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Sync post data into form state
  const initFormData = (currentPost: FeedPost) => {
    setTitleBn(currentPost.titleBn || '');
    setTitleEn(currentPost.titleEn || '');
    setContentBn(currentPost.contentBn || '');
    setContentEn(currentPost.contentEn || '');
    setCategoryId(currentPost.categoryId || 'roads_traffic');
    setSubcategoryId(currentPost.subcategoryId || '');
  };

  useEffect(() => {
    if (post) {
      setActionSuccessMessage(null);
      setMobileTab('overview');
      setIsEditing(initialEditMode);
      initFormData(post);
    }
  }, [post, initialEditMode, isOpen]);

  if (!post) return null;

  const isPublished = post.status === 'published';
  const hasMedia = Boolean(post.media && post.media.length > 0);
  const hasTimeline = Boolean(post.timeline && post.timeline.length > 0);

  // Handle category change to update subcategories
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const availableSubs = SUBCATEGORIES[newCatId] || [];
    setSubcategoryId(availableSubs[0]?.value || '');
  };

  // Start editing
  const handleStartEdit = () => {
    initFormData(post);
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    initFormData(post);
    setIsEditing(false);
  };

  // Save changes and preserve status
  const handleSaveEdit = async () => {
    try {
      setIsSubmitting(true);
      const selectedCat = CATEGORIES.find((c) => c.value === categoryId);
      const selectedSub = (SUBCATEGORIES[categoryId] || []).find((s) => s.value === subcategoryId);

      const updates: Partial<FeedPost> = {
        titleBn: titleBn.trim(),
        titleEn: titleEn.trim() || titleBn.trim(),
        contentBn: contentBn.trim(),
        contentEn: contentEn.trim() || contentBn.trim(),
        categoryId,
        categoryEn: selectedCat?.labelEn || post.categoryEn,
        categoryBn: selectedCat?.labelBn || post.categoryBn,
        subcategoryId,
        subcategoryEn: selectedSub?.labelEn || '',
        subcategoryBn: selectedSub?.labelBn || '',
      };

      if (onUpdate) {
        await onUpdate(post.id, updates);
      }

      setIsEditing(false);
      setActionSuccessMessage(
        isBn
          ? 'পোস্টের তথ্য সফলভাবে সংরক্ষিত হয়েছে (স্ট্যাটাস অপরিবর্তিত)।'
          : 'Post content updated successfully (status preserved).'
      );
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (error) {
      console.error('Failed to save feed edit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // One-click Approve & Publish action
  const handleApproveAndPublish = async () => {
    try {
      setIsSubmitting(true);
      await onPublish(post.id);
      setActionSuccessMessage(
        isBn ? 'পোস্ট অনুমোদিত ও পাবলিক ফিডে প্রকাশিত হয়েছে।' : 'Post approved and broadcast live to feed.'
      );
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onReject(post.id, rejectReason, rejectExplanation);
      setIsRejectModalOpen(false);
      setRejectExplanation('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpublishConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onUnpublish(post.id, unpublishReason);
      setIsUnpublishModalOpen(false);
      setUnpublishReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: FeedPostStatus) => {
    if (status === 'published') {
      return (
        <Badge status="published" size="sm" dot>
          {isBn ? 'লাইভ প্রকাশিত' : 'Published / Live'}
        </Badge>
      );
    }
    return (
      <Badge status="default" size="sm">
        {isBn ? 'অপ্রকাশিত' : 'Unpublished'}
      </Badge>
    );
  };

  const overviewCard = (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
            {post.id}
          </span>
          {getStatusBadge(post.status)}
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {new Date(post.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="space-y-1 pt-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {isBn ? post.titleBn || post.titleEn : post.titleEn || post.titleBn}
        </h3>
        {post.complaintId && (
          <p className="text-xs text-slate-500 font-mono">
            {isBn ? 'অভিযোগ রেফারেন্স:' : 'Complaint Ref:'} {post.complaintId}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
        <div>
          <span className="text-slate-400 block text-[10px]">
            {isBn ? 'ক্যাটাগরি' : 'Category'}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {isBn ? post.categoryBn : post.categoryEn}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">
            {isBn ? 'সাব-ক্যাটাগরি' : 'Subcategory'}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {isBn ? post.subcategoryBn : post.subcategoryEn}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">
            {isBn ? 'লোকেশন' : 'Location'}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {post.location.ward} ({post.location.zone})
          </span>
        </div>
      </div>
    </div>
  );

  const contentSection = (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-sky-600" />
            <span>{isBn ? 'নাগরিক অভিযোগের বিবরণ' : 'Citizen Submission Details'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            leftIcon={<Edit className="w-3.5 h-3.5" />}
            className="text-xs h-7 text-slate-600 dark:text-slate-300"
          >
            {isBn ? 'সম্পাদনা' : 'Edit'}
          </Button>
        </div>

        {post.titleBn && (
          <div className="space-y-1">
            <span className="text-slate-400 block text-[11px]">
              {isBn ? 'বাংলা শিরোনাম' : 'Bengali Title'}
            </span>
            <p className="font-medium text-slate-900 dark:text-slate-100">{post.titleBn}</p>
          </div>
        )}

        {post.titleEn && (
          <div className="space-y-1">
            <span className="text-slate-400 block text-[11px]">
              {isBn ? 'ইংরেজি শিরোনাম' : 'English Title'}
            </span>
            <p className="font-medium text-slate-900 dark:text-slate-100">{post.titleEn}</p>
          </div>
        )}

        {post.contentBn && (
          <div className="space-y-1">
            <span className="text-slate-400 block text-[11px]">
              {isBn ? 'বাংলা বিবরণ' : 'Bengali Description'}
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {post.contentBn}
            </p>
          </div>
        )}

        {post.contentEn && (
          <div className="space-y-1">
            <span className="text-slate-400 block text-[11px]">
              {isBn ? 'ইংরেজি বিবরণ' : 'English Description'}
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {post.contentEn}
            </p>
          </div>
        )}
      </div>

      {hasMedia && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>{isBn ? 'সংযুক্ত ছবি ও ফাইল প্রমাণ' : 'Attached Media'}</span>
          </span>
          <FeedMediaPreview media={post.media} variant="gallery" />
        </div>
      )}
    </div>
  );

  const editSection = (
    <div className="space-y-4 text-xs">
      <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {isBn ? 'পোস্ট কনটেন্ট সম্পাদনা' : 'Edit Post Content'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {isBn ? 'স্ট্যাটাস অপরিবর্তিত থাকবে' : 'Status will be preserved'}
          </span>
        </div>

        {/* Bengali & English Titles */}
        <div className="space-y-3 pt-1">
          <Input
            label={isBn ? 'বাংলা শিরোনাম (বাধ্যতামূলক)' : 'Bengali Title (Required)'}
            value={titleBn}
            onChange={(e) => setTitleBn(e.target.value)}
            placeholder={isBn ? 'শিরোনাম লিখুন...' : 'Enter Bengali title...'}
          />

          <Input
            label={isBn ? 'ইংরেজি শিরোনাম' : 'English Title'}
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder={isBn ? 'ইংরেজি শিরোনাম...' : 'Enter English title...'}
          />
        </div>

        {/* Bengali & English Content Descriptions */}
        <div className="space-y-3">
          <Textarea
            label={isBn ? 'বাংলা বিবরণ' : 'Bengali Description / Content'}
            rows={4}
            value={contentBn}
            onChange={(e) => setContentBn(e.target.value)}
            placeholder={isBn ? 'বিস্তারিত বিবরণ লিখুন...' : 'Enter Bengali description...'}
          />

          <Textarea
            label={isBn ? 'ইংরেজি বিবরণ' : 'English Description / Content'}
            rows={3}
            value={contentEn}
            onChange={(e) => setContentEn(e.target.value)}
            placeholder={isBn ? 'ইংরেজি বিবরণ...' : 'Enter English description...'}
          />
        </div>

        {/* Category & Subcategory Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1.5 text-xs">
              {isBn ? 'ক্যাটাগরি' : 'Category'}
            </label>
            <Select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              options={CATEGORIES.map((c) => ({
                value: c.value,
                label: isBn ? c.labelBn : c.labelEn,
              }))}
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1.5 text-xs">
              {isBn ? 'সাব-ক্যাটাগরি' : 'Subcategory'}
            </label>
            <Select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              options={(SUBCATEGORIES[categoryId] || []).map((s) => ({
                value: s.value,
                label: isBn ? s.labelBn : s.labelEn,
              }))}
            />
          </div>
        </div>

        {/* Attached Media Display in Edit Mode */}
        {hasMedia && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-medium text-slate-700 dark:text-slate-300 block text-xs">
              {isBn ? 'সংযুক্ত মিডিয়া প্রমাণ (বিদ্যমান)' : 'Attached Media (Existing)'}
            </span>
            <FeedMediaPreview media={post.media} variant="compact" />
          </div>
        )}
      </div>
    </div>
  );

  const activitySection = hasTimeline && (
    <div className="space-y-3 text-xs">
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
        <History className="w-4 h-4 text-sky-600" />
        <span>{isBn ? 'কার্যক্রম ও অডিট হিস্ট্রি' : 'Activity & History'}</span>
      </h4>
      <div className="space-y-2">
        {post.timeline?.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {isBn ? item.titleBn : item.titleEn}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              {(item.descriptionBn || item.descriptionEn) && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  {isBn ? item.descriptionBn || item.descriptionEn : item.descriptionEn || item.descriptionBn}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const getActionIcon = (iconName: FeedActionConfig['iconName']) => {
    switch (iconName) {
      case 'Edit':
        return <Edit className="w-3.5 h-3.5" />;
      case 'Globe':
        return <Globe className="w-3.5 h-3.5" />;
      case 'XCircle':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'EyeOff':
        return <EyeOff className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const handleActionClick = (actionId: FeedActionId) => {
    switch (actionId) {
      case 'edit':
        handleStartEdit();
        break;
      case 'approve_publish':
        handleApproveAndPublish();
        break;
      case 'reject':
        setIsRejectModalOpen(true);
        break;
      case 'hide_feed':
        setIsUnpublishModalOpen(true);
        break;
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        mobileSheet={true}
        title={`${post.id} — ${isBn ? 'পাবলিক ফিড মডারেশন' : 'Public Feed'}`}
        description={`${isBn ? 'নাগরিক রেফারেন্স:' : 'Complaint Ref:'} ${post.complaintId || 'N/A'} • ${post.location.ward}`}
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={isEditing ? handleCancelEdit : onClose}
              className="min-h-[38px]"
            >
              {isEditing ? (isBn ? 'বাতিল' : 'Cancel') : (isBn ? 'বন্ধ করুন' : 'Close')}
            </Button>

            {/* Actions: Edit Mode vs Standard Feed Actions from feedActions.ts */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  onClick={handleSaveEdit}
                  isLoading={isSubmitting}
                  disabled={!titleBn.trim() && !titleEn.trim()}
                  className="min-h-[38px]"
                >
                  {isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {getAvailableFeedActions(post.status).map((action) => (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    size="sm"
                    leftIcon={getActionIcon(action.iconName)}
                    onClick={() => handleActionClick(action.id)}
                    isLoading={action.id === 'approve_publish' && isSubmitting}
                    className="min-h-[38px]"
                  >
                    {isBn ? action.labelBn : action.labelEn}
                  </Button>
                ))}
              </div>
            )}
          </div>
        }
      >
        {/* Action Success Alert Banner */}
        {actionSuccessMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* ===================== EDIT MODE VIEW ===================== */}
        {isEditing ? (
          <div className="space-y-4">
            {editSection}
          </div>
        ) : (
          <>
            {/* ===================== MOBILE ONLY TAB VIEW (<sm) ===================== */}
            <div className="sm:hidden space-y-4">
              {/* Mobile Tab Header */}
              <div className="-mt-1 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5">
                  {/* Tab 1: Overview */}
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
                    <Globe className="w-3.5 h-3.5" />
                    <span>{isBn ? 'সারসংক্ষেপ' : 'Overview'}</span>
                  </button>

                  {/* Tab 2: Content */}
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
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isBn ? 'বিবরণ ও মিডিয়া' : 'Content & Media'}</span>
                  </button>

                  {/* Tab 3: Activity (Hidden if empty) */}
                  {hasTimeline && (
                    <button
                      type="button"
                      onClick={() => setMobileTab('activity')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
                        mobileTab === 'activity'
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{isBn ? 'কার্যক্রম' : 'Activity'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Tab Contents */}
              {mobileTab === 'overview' && (
                <div className="space-y-4">
                  {overviewCard}
                </div>
              )}

              {mobileTab === 'content' && (
                <div className="space-y-4">
                  {contentSection}
                </div>
              )}

              {mobileTab === 'activity' && hasTimeline && (
                <div className="space-y-4">
                  {activitySection}
                </div>
              )}
            </div>

            {/* ===================== DESKTOP VIEW (sm+) ===================== */}
            <div className="hidden sm:block space-y-6">
              {/* Top Status & Meta Header Card */}
              {overviewCard}

              {/* Main Content Section */}
              {contentSection}

              {/* Activity / Timeline (if available) */}
              {hasTimeline && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  {activitySection}
                </div>
              )}
            </div>
          </>
        )}
      </Drawer>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title={isBn ? 'পাবলিক পোস্ট বাতিলকরণ' : 'Reject Public Submission'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRejectConfirm}
              isLoading={isSubmitting}
              disabled={!rejectExplanation.trim()}
            >
              {isBn ? 'নিশ্চিত বাতিল করুন' : 'Confirm Rejection'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>
              {isBn
                ? 'এই পোস্টটি পাবলিক ফিড থেকে বাতিল করা হবে।'
                : 'This submission will be rejected from the public broadcast.'}
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {isBn ? 'বাতিলের কারণ' : 'Rejection Category'}
            </label>
            <Select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              options={[
                { value: 'insufficient_evidence', label: 'Insufficient Evidence / Photos' },
                { value: 'confidential_matter', label: 'Confidential Internal Matter' },
                { value: 'duplicate_report', label: 'Duplicate Civic Submission' },
                { value: 'inappropriate_content', label: 'Inappropriate or Defamatory Language' },
                { value: 'out_of_jurisdiction', label: 'Outside Dhaka Municipal Jurisdiction' },
              ]}
            />
          </div>

          <div>
            <Textarea
              label={isBn ? 'বিস্তারিত ব্যাখ্যা (বাধ্যতামূলক)' : 'Detailed Explanation (Required)'}
              rows={3}
              value={rejectExplanation}
              onChange={(e) => setRejectExplanation(e.target.value)}
              placeholder={
                isBn
                  ? 'বাতিলের সুনির্দিষ্ট কারণ লিখুন...'
                  : 'Provide reasons why this content cannot be published publicly...'
              }
            />
          </div>
        </div>
      </Modal>

      {/* Unpublish / Hide Modal */}
      <Modal
        isOpen={isUnpublishModalOpen}
        onClose={() => setIsUnpublishModalOpen(false)}
        title={isBn ? 'ফিড থেকে পোস্ট লুকান / প্রত্যাহার' : 'Hide Post from Feed'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsUnpublishModalOpen(false)}>
              {isBn ? 'ফিরে যান' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleUnpublishConfirm}
              isLoading={isSubmitting}
              disabled={!unpublishReason.trim()}
            >
              {isBn ? 'ফিড থেকে লুকান' : 'Hide from Feed'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            {isBn
              ? 'পোস্টটি নাগরিক ফিড থেকে সরিয়ে অপ্রকাশিত করা হবে। কারণ লিখুন:'
              : 'The post will be hidden from the public feed. Provide justification:'}
          </p>

          <Textarea
            label={isBn ? 'প্রত্যাহারের কারণ' : 'Reason for Hiding'}
            rows={3}
            value={unpublishReason}
            onChange={(e) => setUnpublishReason(e.target.value)}
            placeholder={
              isBn
                ? 'আইনি পর্যালোচনা বা তথ্য যাচাইয়ের কারণ উল্লেখ করুন...'
                : 'State the justification (e.g. review, updated inquiry)...'
            }
          />
        </div>
      </Modal>
    </>
  );
};

export default FeedDetailDrawer;
