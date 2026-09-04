import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge, BadgeStatus } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import {
  Complaint,
  ComplaintLifecycleStatus,
  ComplaintTimelineEvent,
} from '@/types/Complaint';
import { complaintApi } from '@/services/api';
import {
  ComplaintSummaryCard,
  ComplaintInfoSection,
  ComplaintMediaViewer,
  ComplaintLocationCard,
  ComplaintTimeline,
  ComplaintActionArea,
  ComplaintVersionHistory,
} from '@/components/complaints';
import {
  RefreshCw,
  Share2,
  FileQuestion,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { hasPermission } = useAuth();
  const isBn = language === 'bn';
  const canViewEvidence = hasPermission('complaints.evidence_view');

  const [loading, setLoading] = useState<boolean>(true);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [timeline, setTimeline] = useState<ComplaintTimelineEvent[]>([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  const fetchComplaintData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    setEvidenceError(null);
    try {
      const detailRes = await complaintApi.getComplaintDetail(id, {
        loadEvidence: canViewEvidence,
      });

      if (!detailRes || !detailRes.complaint) {
        setError(true);
      } else {
        setComplaint(detailRes.complaint);
        setTimeline(detailRes.timeline || []);
        setEvidenceError(detailRes.evidenceError || null);
      }
    } catch (err) {
      console.error('Failed to fetch complaint detail:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, canViewEvidence]);

  useEffect(() => {
    fetchComplaintData();
  }, [fetchComplaintData]);

  const statusBadgeMap: Record<
    ComplaintLifecycleStatus,
    { badgeStatus: BadgeStatus; labelEn: string; labelBn: string }
  > = {
    submitted: { badgeStatus: 'pending', labelEn: 'Submitted', labelBn: 'দাখিলকৃত' },
    published: { badgeStatus: 'published', labelEn: 'Published', labelBn: 'প্রকাশিত' },
    unpublished: { badgeStatus: 'default', labelEn: 'Unpublished', labelBn: 'অপ্রকাশিত' },
    rejected: { badgeStatus: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিলকৃত' },
    edited: { badgeStatus: 'info', labelEn: 'Edited', labelBn: 'সম্পাদিত' },
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>

        <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Not Found / Error State
  if (error || !complaint) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={isBn ? 'অভিযোগ পাওয়া যায়নি' : 'Complaint Not Found'}
          backButton={{
            label: isBn ? 'অভিযোগ তালিকায় ফিরুন' : 'Back to Complaints',
            onClick: () => navigate('/complaints'),
          }}
        />
        <Card variant="default">
          <CardContent className="py-12">
            <EmptyState
              title={isBn ? `আইডি "${id}" এর কোনো অভিযোগ নেই` : `No Complaint Found with ID: "${id}"`}
              description={
                isBn
                  ? 'এই অভিযোগটি মুছে ফেলা হয়েছে অথবা ভুল অভিযোগ আইডি প্রবেশ করানো হয়েছে।'
                  : 'The requested complaint does not exist in the platform registry or has been archived.'
              }
              icon={FileQuestion}
              action={
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/complaints')}
                    leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  >
                    <span>{isBn ? 'অভিযোগের তালিকায় যান' : 'Go to Complaints List'}</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={fetchComplaintData}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    <span>{isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry Request'}</span>
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = statusBadgeMap[complaint.status] || {
    badgeStatus: 'default',
    labelEn: complaint.status,
    labelBn: complaint.status,
  };

  const handleComplaintUpdated = (
    updatedComplaint: Complaint,
    updatedTimeline: ComplaintTimelineEvent[]
  ) => {
    setComplaint(updatedComplaint);
    setTimeline(updatedTimeline);
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      {/* 1. Page Header with Back Button and Quick Actions */}
      <PageHeader
        title={
          isBn
            ? `অভিযোগ ট্রায়াজ ও বিবরণ: ${complaint.id}`
            : `Complaint Inspection: ${complaint.id}`
        }
        description={
          isBn
            ? 'নাগরিক প্রমাণের অখণ্ডতা যাচাই, বিভাগীয় প্রতিক্রিয়া এবং অডিট ট্রেইল'
            : 'Detailed evidentiary inspection, verification status, and administrative action workflow'
        }
        backButton={{
          label: isBn ? 'অভিযোগ তালিকায় ফিরুন' : 'Back to Complaints',
          onClick: () => navigate('/complaints'),
        }}
        actions={
          <div className="flex items-center gap-2">
            <Badge status={statusCfg.badgeStatus} size="md" dot>
              {isBn ? statusCfg.labelBn : statusCfg.labelEn}
            </Badge>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchComplaintData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              aria-label="Refresh complaint"
            >
              <span className="hidden sm:inline">{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </Button>
          </div>
        }
      />

      {/* 2. Complaint Summary Card (Full Width) */}
      <ComplaintSummaryCard complaint={complaint} />

      {/* 3. Two-Column Desktop & Tablet Layout (Stacked on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols on desktop): Narrative, Version History, Evidence, Location */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Complaint Description & Reporter Info */}
          <ComplaintInfoSection complaint={complaint} />

          {/* Version / Revision History if edited */}
          <ComplaintVersionHistory complaint={complaint} />

          {/* Evidence Media Viewer */}
          <ComplaintMediaViewer
            media={complaint.media}
            error={evidenceError}
            onRetry={fetchComplaintData}
          />

          {/* Location & Jurisdictional Area */}
          <ComplaintLocationCard location={complaint.location} />
        </div>

        {/* Right Column (4-5 cols on desktop): Action Area & Lifecycle Timeline */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">
          {/* Administrative Action Control Area */}
          <ComplaintActionArea
            complaint={complaint}
            onComplaintUpdated={handleComplaintUpdated}
          />

          {/* Audit Trail & Lifecycle History */}
          <ComplaintTimeline timeline={timeline} />
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailPage;
