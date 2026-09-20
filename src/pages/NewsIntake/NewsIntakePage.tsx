import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  Newspaper,
  RefreshCw,
  SearchCheck,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, ButtonBase } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FeedbackNotice } from '@/components/ui/FeedbackNotice';
import { Modal } from '@/components/ui/Modal';
import { Tag } from '@/components/ui/Tag';
import { useLanguage } from '@/context/LanguageContext';
import { complaintApi, newsIntakeApi } from '@/services/api';
import { Complaint } from '@/types/Complaint';
import {
  NewsIntakeAutomationDashboard,
  NewsIntakeAutomationItem,
  NewsIntakeAutomationRun,
  NewsIntakeTaxonomy,
} from '@/types/NewsIntake';
import { FeedReadyReportPreview } from './FeedReadyReportPreview';
import { ManualNewsIntakeForm } from './ManualNewsIntakeForm';

const EMPTY_DASHBOARD: NewsIntakeAutomationDashboard = {
  sources: [],
  runs: [],
  automation: {
    enabled: false,
    intervalHours: 36,
    lastAutoDispatchedAt: null,
    nextAutoDueAt: null,
    running: false,
  },
};


type IntakeMode = 'automatic' | 'manual';
type WorkspaceStep = 1 | 2 | 3;
type RawNewsFilter = 'all' | 'matched' | 'ready' | 'review' | 'published' | 'duplicate' | 'excluded' | 'not_report' | 'error';

interface PublishOutcome {
  reportId: string;
  title: string;
  ok: boolean;
  error?: string;
}

const articleItems = (run: NewsIntakeAutomationRun | null) =>
  (run?.items || []).filter((item) => item.itemKind !== 'source');

const isExcludedItem = (item: NewsIntakeAutomationItem) =>
  item.action === 'discovered' && Boolean(item.segmentId || item.subcategoryId);

export const NewsIntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [dashboard, setDashboard] =
    useState<NewsIntakeAutomationDashboard>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [mode, setMode] = useState<IntakeMode>('automatic');
  const [step, setStep] = useState<WorkspaceStep>(1);
  const [scanning, setScanning] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [reportMap, setReportMap] = useState<Record<string, Complaint | null>>({});
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportLoadErrors, setReportLoadErrors] = useState<string[]>([]);
  const [manualSourceUrl, setManualSourceUrl] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [rawNewsExpanded, setRawNewsExpanded] = useState(true);
  const [rawFilter, setRawFilter] = useState<RawNewsFilter>('all');
  const [feedReadyExpanded, setFeedReadyExpanded] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishOutcomes, setPublishOutcomes] = useState<PublishOutcome[]>([]);
  const [taxonomy, setTaxonomy] = useState<NewsIntakeTaxonomy>({
    segments: [],
    subcategories: [],
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const nextDashboard = await newsIntakeApi.getAutomationDashboard();
      setDashboard(nextDashboard);
      return nextDashboard;
    } catch (error: unknown) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to load News Intake dashboard.'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    let mounted = true;
    void newsIntakeApi
      .getTaxonomy()
      .then((nextTaxonomy) => {
        if (mounted) setTaxonomy(nextTaxonomy);
      })
      .catch(() => {
        // The review workspace remains functional with stable IDs if taxonomy
        // labels are temporarily unavailable.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const latestRun = dashboard.runs[0] || null;
  const selectedRun =
    dashboard.runs.find((run) => run.runId === selectedRunId) || latestRun;
  const selectedItems = articleItems(selectedRun || null);

  const automatedSources = dashboard.sources.filter((source) => source.scanEnabled);
  const manualSources = dashboard.sources.filter((source) => !source.scanEnabled);

  const formatDateTime = (value?: string | null) => {
    if (!value) return isBn ? 'এখনও নেই' : 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(isBn ? 'bn-BD' : 'en-BD', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const loadReportCards = async (run: NewsIntakeAutomationRun) => {
    const reportIds = Array.from(
      new Set(
        run.items
          .filter((item) => Boolean(item.reportId))
          .map((item) => String(item.reportId))
      )
    );

    setSelectedReportIds([]);
    setReportMap({});
    setReportLoadErrors([]);
    if (reportIds.length === 0) return;

    setLoadingReports(true);
    try {
      const entries = await Promise.all(
        reportIds.map(async (reportId) => {
          try {
            return [reportId, await complaintApi.getComplaintById(reportId)] as const;
          } catch {
            return [reportId, null] as const;
          }
        })
      );
      setReportMap(Object.fromEntries(entries));
      setReportLoadErrors(
        entries.filter(([, complaint]) => complaint === null).map(([reportId]) => reportId)
      );
    } finally {
      setLoadingReports(false);
    }
  };

  const openWorkspace = () => {
    setMode('automatic');
    setStep(1);
    setSelectedRunId(null);
    setSelectedReportIds([]);
    setReportMap({});
    setReportLoadErrors([]);
    setManualSourceUrl('');
    setPublishOutcomes([]);
    setWorkspaceError(null);
    setWorkspaceOpen(true);
  };

  const openRunForReview = async (run: NewsIntakeAutomationRun) => {
    setMode('automatic');
    setStep(2);
    setSelectedRunId(run.runId);
    setPublishOutcomes([]);
    setWorkspaceError(null);
    setWorkspaceOpen(true);
    await loadReportCards(run);
  };

  const handleScan = async () => {
    setScanning(true);
    setWorkspaceError(null);
    try {
      const result = await newsIntakeApi.scanSources();
      if (result.alreadyRunning) {
        setWorkspaceError(
          isBn
            ? 'আরেকটি নিউজ স্ক্যান ইতিমধ্যে চলছে। এটি শেষ হলে আবার চেষ্টা করুন।'
            : 'Another News Intake scan is already running. Try again after it finishes.'
        );
        return;
      }

      const nextDashboard = await loadDashboard();
      const run =
        nextDashboard?.runs.find((entry) => entry.runId === result.runId) ||
        nextDashboard?.runs[0];

      if (!run) {
        setWorkspaceError(
          isBn
            ? 'স্ক্যান শেষ হয়েছে, কিন্তু রান ফলাফল পাওয়া যায়নি।'
            : 'The scan finished, but its run results could not be loaded.'
        );
        return;
      }

      setSelectedRunId(run.runId);
      await loadReportCards(run);
      setStep(2);
    } catch (error: unknown) {
      setWorkspaceError(
        error instanceof Error ? error.message : 'News sources could not be checked.'
      );
    } finally {
      setScanning(false);
    }
  };

  const handleAutoUpdate = async () => {
    setUpdatingSchedule(true);
    setPageError(null);
    try {
      await newsIntakeApi.setAutoUpdate(!dashboard.automation.enabled);
      await loadDashboard();
    } catch (error: unknown) {
      setPageError(
        error instanceof Error ? error.message : 'Auto Update could not be changed.'
      );
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const complaintForItem = (item: NewsIntakeAutomationItem) =>
    item.reportId ? reportMap[String(item.reportId)] || null : null;

  const privacyReviewSubcategories = new Set([
    'child_abduction_murder',
    'rape-sexual-violence',
    'sexual-harassment',
    'domestic-violence',
    'blackmail-coercion',
    'honeytrap',
  ]);

  const complaintNeedsReview = (complaint: Complaint | null) => {
    if (!complaint) return false;
    const answers = (
      complaint as Complaint & { customFieldAnswers?: Record<string, unknown> }
    ).customFieldAnswers;
    const privacyReviewRequired = privacyReviewSubcategories.has(complaint.subcategoryId);
    return (
      answers?.newsIntakeReviewRequired === true ||
      (privacyReviewRequired && answers?.sensitiveContentReviewed !== true)
    );
  };

  const isCurrentFeedReady = (item: NewsIntakeAutomationItem) => {
    if (item.action !== 'created_draft' || !item.reportId) return false;
    const complaint = complaintForItem(item);
    return Boolean(
      complaint &&
        item.duplicateStatus === 'clear' &&
        complaint.status === 'submitted' &&
        !complaintNeedsReview(complaint)
    );
  };

  const isCurrentReviewItem = (item: NewsIntakeAutomationItem) => {
    if (item.action === 'needs_review') return true;
    if (item.action !== 'created_draft' || !item.reportId) return false;
    const complaint = complaintForItem(item);
    if (!complaint || complaint.status === 'published') return false;
    return complaintNeedsReview(complaint) || item.duplicateStatus !== 'clear';
  };

  const isCurrentPublishedItem = (item: NewsIntakeAutomationItem) =>
    item.action === 'created_draft' && complaintForItem(item)?.status === 'published';

  const matchedItems = useMemo(
    () => selectedItems.filter((item) => Boolean(item.segmentId || item.subcategoryId)),
    [selectedItems]
  );

  const rawFilterCounts = useMemo(() => {
    const ready = selectedItems.filter(isCurrentFeedReady).length;
    const review = selectedItems.filter(isCurrentReviewItem).length;
    const published = selectedItems.filter(isCurrentPublishedItem).length;
    const duplicate = selectedItems.filter(
      (item) => item.action === 'skip_duplicate' || item.action === 'merged_source'
    ).length;
    const excluded = selectedItems.filter(isExcludedItem).length;
    const notReport = selectedItems.filter(
      (item) => item.action === 'discovered' && !item.segmentId && !item.subcategoryId
    ).length;
    const error = selectedItems.filter((item) => item.action === 'error').length;
    return {
      all: selectedItems.length,
      matched: matchedItems.length,
      ready,
      review,
      published,
      duplicate,
      excluded,
      not_report: notReport,
      error,
    };
  }, [selectedItems, matchedItems, reportMap]);

  const filteredRawItems = useMemo(() => {
    if (rawFilter === 'all') return selectedItems;
    if (rawFilter === 'matched') return matchedItems;
    if (rawFilter === 'ready') return selectedItems.filter(isCurrentFeedReady);
    if (rawFilter === 'review') return selectedItems.filter(isCurrentReviewItem);
    if (rawFilter === 'published') return selectedItems.filter(isCurrentPublishedItem);
    if (rawFilter === 'duplicate') {
      return selectedItems.filter(
        (item) => item.action === 'skip_duplicate' || item.action === 'merged_source'
      );
    }
    if (rawFilter === 'excluded') return selectedItems.filter(isExcludedItem);
    if (rawFilter === 'not_report') {
      return selectedItems.filter(
        (item) => item.action === 'discovered' && !item.segmentId && !item.subcategoryId
      );
    }
    return selectedItems.filter((item) => item.action === 'error');
  }, [rawFilter, selectedItems, matchedItems, reportMap]);

  const feedReadyItems = useMemo(
    () => selectedItems.filter(isCurrentFeedReady),
    [selectedItems, reportMap]
  );

  const eligibleReportIds = useMemo(
    () => feedReadyItems.map((item) => String(item.reportId)).filter(Boolean),
    [feedReadyItems]
  );

  const toggleReport = (reportId: string) => {
    setSelectedReportIds((current) =>
      current.includes(reportId)
        ? current.filter((id) => id !== reportId)
        : [...current, reportId]
    );
  };

  const selectAllEligible = () => {
    setSelectedReportIds(eligibleReportIds);
  };

  const requestWorkspaceClose = () => {
    if (scanning || publishing) {
      setWorkspaceError(
        isBn
          ? 'চলমান কাজ শেষ হলে ওয়ার্কস্পেস বন্ধ করুন।'
          : 'Wait for the current operation to finish before closing the workspace.'
      );
      return;
    }
    setWorkspaceOpen(false);
  };

  const reviewItemManually = (item: NewsIntakeAutomationItem) => {
    if (item.reportId) {
      setWorkspaceOpen(false);
      navigate(`/complaints/${encodeURIComponent(String(item.reportId))}`);
      return;
    }
    setManualSourceUrl(item.canonicalUrl);
    setMode('manual');
    setStep(2);
    setWorkspaceError(null);
  };

  const handlePublishSelected = async () => {
    if (selectedReportIds.length === 0) return;

    setPublishing(true);
    setWorkspaceError(null);
    const outcomes: PublishOutcome[] = [];

    for (const reportId of selectedReportIds) {
      const complaint = reportMap[reportId];
      const title =
        complaint?.titleBn || complaint?.titleEn || reportId;
      try {
        const result = await complaintApi.publishComplaint(reportId);
        if (result.complaint.status !== 'published') {
          throw new Error('The report was not confirmed as published.');
        }
        outcomes.push({ reportId, title, ok: true });
      } catch (error: unknown) {
        outcomes.push({
          reportId,
          title,
          ok: false,
          error: error instanceof Error ? error.message : 'Publication failed.',
        });
      }
    }

    setPublishOutcomes(outcomes);
    setSelectedReportIds([]);
    await loadDashboard();
    setStep(3);
    setPublishing(false);
  };

  const runStatusLabel = (status: NewsIntakeAutomationRun['status']) => {
    if (!isBn) return status === 'completed' ? 'Completed' : status === 'partial' ? 'Partial' : status === 'failed' ? 'Failed' : 'Running';
    return status === 'completed'
      ? 'সম্পন্ন'
      : status === 'partial'
        ? 'আংশিক'
        : status === 'failed'
          ? 'ব্যর্থ'
          : 'চলছে';
  };

  const reasonLabel = (reason?: string | null) => {
    if (!reason || !isBn) return reason || '';
    const exact: Record<string, string> = {
      'Outside the 7-day automated intake window.': '৭ দিনের স্বয়ংক্রিয় ইনটেক সময়সীমার বাইরে।',
      'No supported incident category matched in the article headline or summary with enough confidence.': 'শিরোনাম বা সারাংশ থেকে সমর্থিত কোনো ঘটনার ক্যাটাগরি যথেষ্ট নিশ্চিতভাবে মেলেনি।',
      'Section, homepage, or non-article URL was excluded from automated intake.': 'সেকশন, হোমপেজ বা নন-আর্টিকেল লিংক স্বয়ংক্রিয় ইনটেক থেকে বাদ দেওয়া হয়েছে।',
      'Non-incident opinion/editorial/feature/media content was excluded.': 'ঘটনা নয়—এমন মতামত, সম্পাদকীয়, ফিচার বা মিডিয়া কনটেন্ট বাদ দেওয়া হয়েছে।',
      'Category detected, but the source publication date could not be verified safely.': 'ক্যাটাগরি পাওয়া গেছে, কিন্তু উৎসের প্রকাশের তারিখ নিরাপদভাবে যাচাই করা যায়নি।',
      'Source publication date is unexpectedly in the future.': 'উৎসের প্রকাশের তারিখ অস্বাভাবিকভাবে ভবিষ্যতের।',
      'Multiple source-backed locations were detected. Review the incident scope before creating a feed-ready report.': 'উৎসে একাধিক লোকেশন পাওয়া গেছে। ফিড-রেডি রিপোর্ট তৈরির আগে ঘটনার সঠিক লোকেশন যাচাই করুন।',
      'Bribery category detected, but department and service fields require source-specific verification.': 'ঘুষের ক্যাটাগরি পাওয়া গেছে, তবে বিভাগ ও সেবার তথ্য উৎস দেখে আলাদাভাবে যাচাই করতে হবে।',
      'Exact source URL already exists in the report database.': 'এই একই উৎস URL ইতিমধ্যে রিপোর্ট ডাটাবেসে আছে।',
      'Possible same incident detected. No new report was created automatically.': 'সম্ভবত একই ঘটনা আগে থেকেই আছে। নতুন রিপোর্ট স্বয়ংক্রিয়ভাবে তৈরি করা হয়নি।',
      'Source-grounded draft created; publication remains a separate admin action.': 'উৎসভিত্তিক ড্রাফট তৈরি হয়েছে; প্রকাশ করা এখনও আলাদা অ্যাডমিন অ্যাকশন।',
      'Draft created, but the final server duplicate evaluation requires review before publication.': 'ড্রাফট তৈরি হয়েছে, তবে প্রকাশের আগে সার্ভারের চূড়ান্ত ডুপ্লিকেট যাচাই রিভিউ করতে হবে।',
      'Privacy-sensitive category detected. Review the public title, summary, location, and identifying details before creating or publishing a report.': 'গোপনীয়তা-সংবেদনশীল ক্যাটাগরি পাওয়া গেছে। রিপোর্ট তৈরি বা প্রকাশের আগে পাবলিক শিরোনাম, সারাংশ, অবস্থান ও পরিচয়সংক্রান্ত তথ্য রিভিউ করুন।',
      'Potential retaliatory or mob violence following a theft allegation; confirm the incident category manually.': 'চুরির অভিযোগকে ঘিরে প্রতিশোধমূলক বা মব সহিংসতা হতে পারে; ক্যাটাগরি ম্যানুয়ালি নিশ্চিত করুন।',
    };
    if (exact[reason]) return exact[reason];
    if (reason.startsWith('Category detected, but ') && reason.endsWith(' could not be established safely from the source.')) {
      const missing = reason
        .slice('Category detected, but '.length, -' could not be established safely from the source.'.length)
        .replace('location, incident date', 'লোকেশন ও ঘটনার তারিখ')
        .replace('incident date', 'ঘটনার তারিখ')
        .replace('location', 'লোকেশন')
        .replace('incident context', 'ঘটনার প্রেক্ষাপট');
      return `ক্যাটাগরি পাওয়া গেছে, কিন্তু উৎস থেকে ${missing} নিরাপদভাবে নির্ধারণ করা যায়নি।`;
    }
    if (reason.startsWith('The current published report form requires source facts that could not be established safely:')) {
      return 'বর্তমান প্রকাশিত রিপোর্ট ফর্মে এমন কিছু উৎসভিত্তিক তথ্য প্রয়োজন, যা নিরাপদভাবে নির্ধারণ করা যায়নি।';
    }
    if (reason.startsWith('Strong same-incident match; source merged into the existing sourced report.')) {
      return 'একই ঘটনার শক্ত মিল পাওয়া গেছে; উৎসটি বিদ্যমান রিপোর্টে মার্জ করা হয়েছে।';
    }
    return reason;
  };

  const segmentLabel = (segmentId?: string | null) => {
    if (!segmentId) return '';
    const segment = taxonomy.segments.find((item) => item.id === segmentId);
    return (isBn ? segment?.nameBn : segment?.nameEn) || segmentId;
  };

  const subcategoryLabel = (subcategoryId?: string | null) => {
    if (!subcategoryId) return '';
    const subcategory = taxonomy.subcategories.find((item) => item.id === subcategoryId);
    return (isBn ? subcategory?.nameBn : subcategory?.nameEn) || subcategoryId;
  };

  const confidenceLabel = (confidence?: number | null) => {
    if (typeof confidence !== 'number' || !Number.isFinite(confidence)) return '';
    const value = Math.round(confidence * 100);
    const formatted = new Intl.NumberFormat(isBn ? 'bn-BD' : 'en-BD').format(value);
    return isBn ? `রুল স্কোর ${formatted}%` : `Rule score ${formatted}%`;
  };

  const actionLabel = (item: NewsIntakeAutomationItem) => {
    switch (item.action) {
      case 'created_draft': {
        const complaint = item.reportId ? reportMap[String(item.reportId)] : null;
        if (complaint?.status === 'published') return isBn ? 'প্রকাশিত' : 'Published';
        if (complaintNeedsReview(complaint) || item.duplicateStatus !== 'clear') {
          return isBn ? 'রিভিউ প্রয়োজন' : 'Needs review';
        }
        return isBn ? 'ফিডের জন্য প্রস্তুত' : 'Feed ready';
      }
      case 'needs_review':
        return isBn ? 'রিভিউ প্রয়োজন' : 'Needs review';
      case 'skip_duplicate':
        return isBn ? 'ডুপ্লিকেট' : 'Duplicate';
      case 'merged_source':
        return isBn ? 'উৎস মার্জ হয়েছে' : 'Source merged';
      case 'error':
        return isBn ? 'ত্রুটি' : 'Error';
      default:
        if (isExcludedItem(item)) return isBn ? 'বাদ দেওয়া' : 'Excluded';
        return isBn ? 'রিপোর্ট নয়' : 'Not a report';
    }
  };

  const actionTone = (item: NewsIntakeAutomationItem) => {
    if (item.action === 'created_draft') {
      const complaint = item.reportId ? reportMap[String(item.reportId)] : null;
      if (complaintNeedsReview(complaint) || item.duplicateStatus !== 'clear') return 'warning' as const;
      return 'success' as const;
    }
    if (item.action === 'needs_review') return 'warning' as const;
    if (item.action === 'error') return 'danger' as const;
    if (item.action === 'merged_source') return 'info' as const;
    return 'neutral' as const;
  };

  const successfulPublishes = publishOutcomes.filter((item) => item.ok);
  const failedPublishes = publishOutcomes.filter((item) => !item.ok);

  const dashboardMetrics = [
    {
      label: isBn ? 'স্বয়ংক্রিয় সোর্স' : 'Automated sources',
      value: automatedSources.length,
      helper: isBn ? `${dashboard.sources.length} বিশ্বস্ত সোর্স` : `${dashboard.sources.length} trusted total`,
    },
    {
      label: isBn ? 'সর্বশেষ আর্টিকেল' : 'Latest articles',
      value: latestRun?.discoveredCount || 0,
      helper: latestRun ? formatDateTime(latestRun.startedAt) : isBn ? 'এখনও স্ক্যান হয়নি' : 'No scan yet',
    },
    {
      label: isBn ? 'তৈরি হওয়া ড্রাফট' : 'Drafts created',
      value: latestRun?.createdCount || 0,
      helper: isBn
        ? 'সর্বশেষ রানে তৈরি; বর্তমান প্রকাশযোগ্যতা রিভিউতে যাচাই হয়'
        : 'Created in the latest run; current eligibility is checked in Review',
    },
    {
      label: isBn ? 'রিভিউ প্রয়োজন' : 'Needs review',
      value: latestRun?.reviewCount || 0,
      helper: isBn ? 'অনিশ্চিত তথ্য স্বয়ংক্রিয়ভাবে প্রকাশ হয় না' : 'Uncertain items never auto-publish',
    },
  ];

  const modalFooter =
    mode === 'automatic' && step === 2 ? (
      <>
        <Button variant="secondary" onClick={() => setStep(1)} disabled={publishing}>
          {isBn ? 'পিছনে' : 'Back'}
        </Button>
        <div className="flex flex-1 items-center justify-end gap-3">
          <p className="type-meta text-slate-500 dark:text-slate-400">
            {isBn
              ? `${selectedReportIds.length}টি রিপোর্ট নির্বাচিত`
              : `${selectedReportIds.length} selected`}
          </p>
          <Button
            variant="success"
            onClick={handlePublishSelected}
            isLoading={publishing}
            disabled={selectedReportIds.length === 0}
            leftIcon={<Send />}
          >
            {isBn ? 'নির্বাচিত রিপোর্ট ফিডে প্রকাশ করুন' : 'Publish Selected to Feed'}
          </Button>
        </div>
      </>
    ) : step === 3 ? (
      <Button onClick={() => setWorkspaceOpen(false)}>
        {isBn ? 'সম্পন্ন' : 'Done'}
      </Button>
    ) : null;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={isBn ? 'নিউজ ইনটেক' : 'News Intake'}
        description={
          isBn
            ? 'বিশ্বস্ত সংবাদ সোর্স স্ক্যান করুন, ক্যাটাগরি-ম্যাচড সংবাদ রিভিউ করুন এবং শুধু প্রস্তুত রিপোর্ট প্রকাশ করুন।'
            : 'Scan trusted news sources, review category-matched stories, and publish only reports that are ready.'
        }
        actions={
          <Button
            size="lg"
            onClick={openWorkspace}
            leftIcon={<SearchCheck />}
          >
            {isBn ? 'সংবাদ খুঁজুন' : 'Find News'}
          </Button>
        }
      />

      {pageError && (
        <FeedbackNotice tone="error" onDismiss={() => setPageError(null)}>
          <p>{pageError}</p>
        </FeedbackNotice>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <Card key={metric.label} padding="sm">
            <p className="type-meta font-medium text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {loading ? '—' : metric.value}
            </p>
            <p className="mt-1 type-helper text-slate-500 dark:text-slate-400">
              {metric.helper}
            </p>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{isBn ? 'ইনটেক অটোমেশন' : 'Intake automation'}</CardTitle>
                <CardDescription>
                  {isBn
                    ? 'ব্যাকগ্রাউন্ড স্ক্যান চলবে, কিন্তু কোনো রিপোর্ট অ্যাডমিন নির্বাচন ছাড়া প্রকাশ হবে না।'
                    : 'Background scanning continues, but no report is published without an admin selection.'}
                </CardDescription>
              </div>
              <Tag tone={dashboard.automation.enabled ? 'success' : 'neutral'}>
                {dashboard.automation.enabled
                  ? isBn
                    ? 'চালু'
                    : 'ON'
                  : isBn
                    ? 'বন্ধ'
                    : 'OFF'}
              </Tag>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="type-meta text-slate-500 dark:text-slate-400">
                  {isBn ? 'সর্বশেষ অটো স্ক্যান' : 'Last automatic scan'}
                </p>
                <p className="mt-1 type-secondary font-semibold text-slate-900 dark:text-slate-100">
                  {formatDateTime(dashboard.automation.lastAutoDispatchedAt)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="type-meta text-slate-500 dark:text-slate-400">
                  {isBn ? 'পরবর্তী স্ক্যান' : 'Next scan'}
                </p>
                <p className="mt-1 type-secondary font-semibold text-slate-900 dark:text-slate-100">
                  {dashboard.automation.enabled
                    ? formatDateTime(dashboard.automation.nextAutoDueAt)
                    : isBn
                      ? 'বন্ধ'
                      : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="info">{isBn ? 'প্রতি ৩৬ ঘণ্টা' : 'Every 36 hours'}</Tag>
              <p className="type-meta text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'ম্যানুয়াল Find News অটো টাইমার রিসেট করে না।'
                  : 'Opening Find News does not reset the automatic timer.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAutoUpdate}
                isLoading={updatingSchedule}
                disabled={loading}
                leftIcon={<RefreshCw />}
              >
                {dashboard.automation.enabled
                  ? isBn
                    ? 'অটো আপডেট বন্ধ করুন'
                    : 'Turn Auto Update Off'
                  : isBn
                    ? 'অটো আপডেট চালু করুন'
                    : 'Turn Auto Update On'}
              </Button>

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isBn ? 'বিশ্বস্ত সংবাদ সোর্স' : 'Trusted news sources'}</CardTitle>
            <CardDescription>
              {isBn
                ? `${automatedSources.length} স্বয়ংক্রিয় · ${manualSources.length} ম্যানুয়াল-অনলি`
                : `${automatedSources.length} automated · ${manualSources.length} manual-only`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {automatedSources.slice(0, 8).map((source) => (
                <Tag key={source.hostname} tone="success">
                  {source.publisherName}
                </Tag>
              ))}
            </div>
            <FeedbackNotice tone="neutral" compact>
              <p>
                {isBn
                  ? 'ম্যানুয়াল-অনলি সোর্সগুলো অ্যান্টি-বট বা সার্ভার সীমাবদ্ধতার কারণে ব্যাকগ্রাউন্ড স্ক্যানে নেই।'
                  : 'Manual-only publishers are excluded from background scans because of server or anti-bot restrictions.'}
              </p>
            </FeedbackNotice>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{isBn ? 'সাম্প্রতিক ইনটেক রান' : 'Recent intake runs'}</CardTitle>
              <CardDescription>
                {isBn
                  ? 'রান খুললে কাঁচা সংবাদ ও ফিড-রেডি রিপোর্ট পাশাপাশি দেখা যাবে।'
                  : 'Open a run to compare raw news with feed-ready reports side by side.'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void loadDashboard()} leftIcon={<RefreshCw />}>
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashboard.runs.slice(0, 6).map((run) => (
            <div
              key={run.runId}
              className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 lg:grid-cols-[minmax(180px,1fr)_repeat(5,minmax(70px,auto))_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'warning'}>
                    {runStatusLabel(run.status)}
                  </Tag>
                  <Tag tone="neutral">
                    {run.triggerType === 'automatic'
                      ? isBn
                        ? 'অটোমেটিক'
                        : 'Automatic'
                      : isBn
                        ? 'ম্যানুয়াল'
                        : 'Manual'}
                  </Tag>
                </div>
                <p className="mt-1 type-meta text-slate-500 dark:text-slate-400">
                  {formatDateTime(run.startedAt)}
                </p>
              </div>
              {[
                [isBn ? 'সংবাদ' : 'News', run.discoveredCount],
                [isBn ? 'শ্রেণিবদ্ধ' : 'Classified', run.classifiedCount],
                [isBn ? 'ড্রাফট' : 'Drafts', run.createdCount],
                [isBn ? 'রিভিউ' : 'Review', run.reviewCount],
                [isBn ? 'ত্রুটি' : 'Errors', run.errorCount],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="type-helper text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="type-secondary font-semibold text-slate-900 dark:text-slate-100">
                    {String(value)}
                  </p>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void openRunForReview(run)}
              >
                {isBn ? 'রিভিউ করুন' : 'Review'}
              </Button>
            </div>
          ))}
          {!loading && dashboard.runs.length === 0 && (
            <FeedbackNotice tone="neutral">
              <p>{isBn ? 'এখনও কোনো ইনটেক রান নেই।' : 'No intake runs yet.'}</p>
            </FeedbackNotice>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={workspaceOpen}
        onClose={requestWorkspaceClose}
        size="full"
        mobileFullscreen
        bodyClassName="overflow-hidden"
        className="max-sm:[&_[data-button-size=sm]]:min-h-11"
        closeOnBackdrop={false}
        title={isBn ? 'নিউজ ইনটেক ওয়ার্কস্পেস' : 'News Intake Workspace'}
        description={
          isBn
            ? 'সংবাদ খুঁজুন → কাঁচা সংবাদ ও ক্যাটাগরি-ম্যাচড সংবাদ রিভিউ করুন → শুধু প্রস্তুত রিপোর্ট নির্বাচন করে প্রকাশ করুন।'
            : 'Find news → review raw and category-matched stories → select and publish only reports that are ready.'
        }
        footer={modalFooter}
      >
        <div className="flex h-full min-h-0 flex-col gap-5">
          <div className="shrink-0 overflow-x-auto border-b border-slate-200 pb-4 dark:border-slate-800">
            <div className="flex min-w-max items-center gap-2">
            {[
              [1, isBn ? '১. সংবাদ খুঁজুন' : '1. Find news'],
              [2, isBn ? '২. রিভিউ ও নির্বাচন' : '2. Review & select'],
              [3, isBn ? '৩. প্রকাশের ফলাফল' : '3. Publish results'],
            ].map(([number, label]) => (
              <div
                key={String(number)}
                className={
                  'rounded-full border px-3 py-1.5 type-meta font-semibold ' +
                  (step === number
                    ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                    : step > Number(number)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400')
                }
              >
                {String(label)}
              </div>
            ))}
            </div>
          </div>

          {workspaceError && (
            <FeedbackNotice tone="error" onDismiss={() => setWorkspaceError(null)}>
              <p>{workspaceError}</p>
            </FeedbackNotice>
          )}

          {step === 1 && (
            <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto pb-2 pr-1 space-y-5">
              <div className="text-center">
                <h3 className="type-section-title text-slate-950 dark:text-white">
                  {isBn ? 'কীভাবে সংবাদ যাচাই করবেন?' : 'How do you want to check news?'}
                </h3>
                <p className="mt-2 type-secondary text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'অটোমেটিক মোড সব সমর্থিত সোর্স স্ক্যান করে। ম্যানুয়াল মোডে নির্দিষ্ট একটি সংবাদ URL দিয়ে রিপোর্ট তৈরি করা যায়।'
                    : 'Automatic mode scans every supported publisher. Manual mode lets you intake a specific article URL.'}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card
                  variant={mode === 'automatic' ? 'highlighted' : 'interactive'}
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode('automatic')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setMode('automatic');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <SearchCheck className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
                    <div>
                      <h3 className="type-card-title">{isBn ? 'অটোমেটিক স্ক্যান' : 'Automatic scan'}</h3>
                      <p className="mt-1 type-secondary text-slate-500 dark:text-slate-400">
                        {isBn
                          ? `${automatedSources.length}টি সমর্থিত সংবাদ সোর্স থেকে নতুন খবর খুঁজবে, ক্যাটাগরি ও ডুপ্লিকেট যাচাই করবে এবং নিরাপদ ড্রাফট বানাবে।`
                          : `Scan ${automatedSources.length} supported publishers, classify incidents, check duplicates, and create safe drafts.`}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  variant={mode === 'manual' ? 'highlighted' : 'interactive'}
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode('manual')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setMode('manual');
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Newspaper className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
                    <div>
                      <h3 className="type-card-title">{isBn ? 'ম্যানুয়াল ইনটেক' : 'Manual intake'}</h3>
                      <p className="mt-1 type-secondary text-slate-500 dark:text-slate-400">
                        {isBn
                          ? 'নির্দিষ্ট একটি অনুমোদিত সংবাদ URL যাচাই করে প্রয়োজনীয় রিপোর্ট তথ্য পূরণ করুন।'
                          : 'Use a specific approved article URL and complete the report facts supported by that source.'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-center">
                {mode === 'automatic' ? (
                  <Button
                    size="lg"
                    onClick={handleScan}
                    isLoading={scanning}
                    disabled={dashboard.automation.running || automatedSources.length === 0}
                    leftIcon={<SearchCheck />}
                  >
                    {isBn ? 'সব সোর্স এখনই স্ক্যান করুন' : 'Scan All Sources Now'}
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => setStep(2)} leftIcon={<Newspaper />}>
                    {isBn ? 'ম্যানুয়াল ইনটেক খুলুন' : 'Open Manual Intake'}
                  </Button>
                )}
              </div>

              <FeedbackNotice tone="info">
                <p>
                  {isBn
                    ? 'অটোমেশন কখনো নিজে প্রকাশ করে না। স্ক্যানের পর নিরাপদ রিপোর্টগুলো নির্বাচনযোগ্য হবে; অনিশ্চিত সংবাদ রিভিউতেই থাকবে।'
                    : 'Automation never publishes by itself. Safe reports become selectable after the scan; uncertain stories stay review-only.'}
                </p>
              </FeedbackNotice>
            </div>
          )}

          {step === 2 && mode === 'manual' && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ManualNewsIntakeForm initialSourceUrl={manualSourceUrl} />
            </div>
          )}

          {step === 2 && mode === 'automatic' && selectedRun && (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="shrink-0 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone={selectedRun.status === 'completed' ? 'success' : 'warning'}>
                      {runStatusLabel(selectedRun.status)}
                    </Tag>
                    <Tag tone="neutral">
                      {selectedItems.length} {isBn ? 'টি সংবাদ পাওয়া গেছে' : 'news items found'}
                    </Tag>
                    <Tag tone="success">
                      {eligibleReportIds.length} {isBn ? 'টি প্রকাশযোগ্য' : 'ready to publish'}
                    </Tag>
                  </div>
                  <p className="mt-1 type-meta text-slate-500 dark:text-slate-400">
                    {formatDateTime(selectedRun.startedAt)}
                  </p>
                </div>

              </div>

              <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="type-helper font-medium text-slate-600 dark:text-slate-300">
                  {isBn ? 'স্ক্যান:' : 'Scan:'}
                </p>
                <Tag tone="neutral">{selectedItems.length} {isBn ? 'স্ক্যানড' : 'scanned'}</Tag>
                <Tag tone="info">{rawFilterCounts.matched} {isBn ? 'ক্যাটাগরি মিল' : 'category matched'}</Tag>
                <span className="mx-1 hidden h-5 w-px bg-slate-300 dark:bg-slate-700 sm:block" aria-hidden="true" />
                <p className="type-helper font-medium text-slate-600 dark:text-slate-300">
                  {isBn ? 'ফলাফল:' : 'Outcome:'}
                </p>
                <Tag tone="success">{rawFilterCounts.ready} {isBn ? 'প্রস্তুত' : 'ready'}</Tag>
                <Tag tone="warning">{rawFilterCounts.review} {isBn ? 'রিভিউ' : 'review'}</Tag>
                {rawFilterCounts.published > 0 && (
                  <Tag tone="success">{rawFilterCounts.published} {isBn ? 'প্রকাশিত' : 'published'}</Tag>
                )}
                <Tag tone="neutral">{rawFilterCounts.duplicate} {isBn ? 'ডুপ্লিকেট' : 'duplicates'}</Tag>
                <Tag tone="neutral">{rawFilterCounts.excluded} {isBn ? 'বাদ দেওয়া' : 'excluded'}</Tag>
                <Tag tone="neutral">{rawFilterCounts.not_report} {isBn ? 'রিপোর্ট নয়' : 'not reports'}</Tag>
                {rawFilterCounts.error > 0 && (
                  <Tag tone="danger">{rawFilterCounts.error} {isBn ? 'ত্রুটি' : 'errors'}</Tag>
                )}
              </div>

              <div className="hidden gap-3 px-1 lg:grid lg:grid-cols-2">
                <div className="flex min-h-10 items-center">
                  <p className="type-label font-semibold text-slate-900 dark:text-slate-100">
                    {isBn ? 'কাঁচা সংবাদ পাওয়া গেছে' : 'Raw news found'}
                  </p>
                </div>

                <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="type-label font-semibold text-slate-900 dark:text-slate-100">
                      {isBn ? 'ফিড-রেডি রিপোর্ট' : 'Feed-ready reports'}
                    </p>
                    <p className="type-helper text-slate-500 dark:text-slate-400">
                      {isBn
                        ? `${eligibleReportIds.length}টি প্রস্তুত · ${selectedReportIds.length}টি নির্বাচিত`
                        : `${eligibleReportIds.length} ready · ${selectedReportIds.length} selected`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={selectAllEligible}
                      disabled={eligibleReportIds.length === 0 || loadingReports}
                    >
                      {isBn ? 'সব নির্বাচন করুন' : 'Select All'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedReportIds([])}
                      disabled={selectedReportIds.length === 0}
                    >
                      {isBn ? 'নির্বাচন মুছুন' : 'Clear Selection'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-4 lg:overflow-hidden lg:pr-0">
                <section className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
                  <ButtonBase
                    className="mb-2 flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left dark:border-slate-800 dark:bg-slate-900/60 lg:hidden"
                    aria-expanded={rawNewsExpanded}
                    onClick={() => setRawNewsExpanded((value) => !value)}
                  >
                    <div>
                      <p className="type-label font-semibold text-slate-900 dark:text-slate-100">
                        {isBn ? 'কাঁচা সংবাদ পাওয়া গেছে' : 'Raw news found'}
                      </p>
                      <p className="type-helper text-slate-500 dark:text-slate-400">
                        {isBn ? `${selectedItems.length}টি সংবাদ` : `${selectedItems.length} news items`}
                      </p>
                    </div>
                    <ChevronDown
                      className={
                        'size-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ' +
                        (rawNewsExpanded ? 'rotate-180' : '')
                      }
                      aria-hidden="true"
                    />
                  </ButtonBase>

                  <div
                    className={
                      (rawNewsExpanded ? 'block' : 'hidden') +
                      ' lg:flex lg:min-h-0 lg:flex-1 lg:flex-col'
                    }
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {([
                        ['all', isBn ? 'সব' : 'All', rawFilterCounts.all],
                        ['matched', isBn ? 'ক্যাটাগরি মিল' : 'Category matched', rawFilterCounts.matched],
                        ['ready', isBn ? 'ফিড-রেডি' : 'Feed ready', rawFilterCounts.ready],
                        ['review', isBn ? 'রিভিউ' : 'Needs review', rawFilterCounts.review],
                        ['published', isBn ? 'প্রকাশিত' : 'Published', rawFilterCounts.published],
                        ['duplicate', isBn ? 'ডুপ্লিকেট' : 'Duplicate', rawFilterCounts.duplicate],
                        ['excluded', isBn ? 'বাদ দেওয়া' : 'Excluded', rawFilterCounts.excluded],
                        ['not_report', isBn ? 'রিপোর্ট নয়' : 'Not a report', rawFilterCounts.not_report],
                        ['error', isBn ? 'ত্রুটি' : 'Error', rawFilterCounts.error],
                      ] as Array<[RawNewsFilter, string, number]>).map(([value, label, count]) => (
                        <Button
                          key={value}
                          variant={rawFilter === value ? 'secondary' : 'ghost'}
                          size="sm"
                              onClick={() => setRawFilter(value)}
                          aria-pressed={rawFilter === value}
                        >
                          {label} · {count}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2 lg:[scrollbar-gutter:stable]">
                    {filteredRawItems.map((item) => (
                      <Card key={item.id} padding="sm" className="h-full">
                        <div className="flex h-full flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Tag tone="neutral">{item.contentLanguage.toUpperCase()}</Tag>
                            <Tag tone={actionTone(item)}>{actionLabel(item)}</Tag>
                            {item.segmentId && (
                              <Tag tone="info">{segmentLabel(item.segmentId)}</Tag>
                            )}
                            {item.subcategoryId && (
                              <Tag tone="neutral">{subcategoryLabel(item.subcategoryId)}</Tag>
                            )}
                            {confidenceLabel(item.confidence) && (
                              <Tag tone="neutral">{confidenceLabel(item.confidence)}</Tag>
                            )}
                          </div>
                          <div>
                            <h3 className="type-card-title">
                              {item.sourceTitle || (isBn ? 'শিরোনাম পাওয়া যায়নি' : 'Untitled source')}
                            </h3>
                            <p className="mt-1 type-meta text-slate-500 dark:text-slate-400">
                              {item.publisherName}
                              {item.sourcePublishedDate ? ` · ${item.sourcePublishedDate}` : ''}
                            </p>
                          </div>
                          {item.reason && (
                            <p className="type-secondary text-slate-600 dark:text-slate-300">
                              {reasonLabel(item.reason)}
                            </p>
                          )}
                          <div className="mt-auto flex flex-wrap items-center gap-2">
                            <a
                              href={item.canonicalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 type-action-sm text-sky-700 hover:underline dark:text-sky-400"
                            >
                              <ExternalLink className="size-3.5" />
                              {isBn ? 'মূল সংবাদ খুলুন' : 'Open source'}
                            </a>
                            {isCurrentReviewItem(item) && (
                              <Button
                                variant="secondary"
                                size="sm"
                                          onClick={() => reviewItemManually(item)}
                                leftIcon={<Newspaper />}
                              >
                                {item.reportId
                                  ? isBn ? 'ড্রাফট রিভিউ করুন' : 'Review draft'
                                  : isBn ? 'ম্যানুয়ালি রিভিউ করুন' : 'Review manually'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}

                    {selectedItems.length === 0 && (
                      <FeedbackNotice tone="neutral">
                        <p>{isBn ? 'এই রানে কোনো সংবাদ আইটেম পাওয়া যায়নি।' : 'No news items were found in this run.'}</p>
                      </FeedbackNotice>
                    )}
                    {selectedItems.length > 0 && filteredRawItems.length === 0 && (
                      <FeedbackNotice tone="neutral">
                        <p>{isBn ? 'এই ফিল্টারে কোনো সংবাদ নেই।' : 'No news items match this filter.'}</p>
                      </FeedbackNotice>
                    )}
                    </div>
                  </div>
                </section>

                <section className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
                  <ButtonBase
                    className="mb-2 flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left dark:border-slate-800 dark:bg-slate-900/60 lg:hidden"
                    aria-expanded={feedReadyExpanded}
                    onClick={() => setFeedReadyExpanded((value) => !value)}
                  >
                    <div>
                      <p className="type-label font-semibold text-slate-900 dark:text-slate-100">
                        {isBn ? 'ফিড-রেডি রিপোর্ট' : 'Feed-ready reports'}
                      </p>
                      <p className="type-helper text-slate-500 dark:text-slate-400">
                        {isBn
                          ? `${eligibleReportIds.length}টি প্রস্তুত · ${selectedReportIds.length}টি নির্বাচিত`
                          : `${eligibleReportIds.length} ready · ${selectedReportIds.length} selected`}
                      </p>
                    </div>
                    <ChevronDown
                      className={
                        'size-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ' +
                        (feedReadyExpanded ? 'rotate-180' : '')
                      }
                      aria-hidden="true"
                    />
                  </ButtonBase>

                  <div
                    className={
                      (feedReadyExpanded ? 'block' : 'hidden') +
                      ' lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2 lg:[scrollbar-gutter:stable]'
                    }
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-end gap-2 lg:hidden">
                      <Button
                        variant="secondary"
                        size="sm"
                          onClick={selectAllEligible}
                        disabled={eligibleReportIds.length === 0 || loadingReports}
                      >
                        {isBn ? 'সব নির্বাচন করুন' : 'Select All'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                          onClick={() => setSelectedReportIds([])}
                        disabled={selectedReportIds.length === 0}
                      >
                        {isBn ? 'নির্বাচন মুছুন' : 'Clear Selection'}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {reportLoadErrors.length > 0 && (
                        <FeedbackNotice tone="warning">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                              {isBn
                                ? `${reportLoadErrors.length}টি রিপোর্ট প্রিভিউ লোড করা যায়নি।`
                                : `${reportLoadErrors.length} report preview(s) could not be loaded.`}
                            </p>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => selectedRun && void loadReportCards(selectedRun)}
                              disabled={loadingReports}
                            >
                              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
                            </Button>
                          </div>
                        </FeedbackNotice>
                      )}
                      {loadingReports && selectedItems.some((item) => item.action === 'created_draft' && Boolean(item.reportId)) ? (
                        <Card padding="sm">
                          <div className="flex min-h-40 items-center justify-center">
                            <p className="type-secondary text-slate-500 dark:text-slate-400">
                              {isBn ? 'ফিড-রেডি প্রিভিউ প্রস্তুত করা হচ্ছে…' : 'Loading feed-ready previews…'}
                            </p>
                          </div>
                        </Card>
                      ) : feedReadyItems.length > 0 ? (
                        feedReadyItems.map((item) => {
                          const reportId = String(item.reportId);
                          const complaint = reportMap[reportId];
                          if (!complaint) return null;

                          return (
                            <FeedReadyReportPreview
                              key={item.id}
                              complaint={complaint}
                              isBn={isBn}
                              selected={selectedReportIds.includes(reportId)}
                              publishable
                              onToggle={() => toggleReport(reportId)}
                              disabled={publishing}
                              categoryLabelBn={
                                taxonomy.segments.find((segment) => segment.id === complaint.categoryId)?.nameBn
                              }
                              categoryLabelEn={
                                taxonomy.segments.find((segment) => segment.id === complaint.categoryId)?.nameEn
                              }
                            />
                          );
                        })
                      ) : (
                        <Card padding="sm">
                          <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-4 text-center">
                            <Newspaper className="size-6 text-slate-400" aria-hidden="true" />
                            <div>
                              <h3 className="type-card-title text-slate-900 dark:text-slate-100">
                                {isBn ? 'কোনো ফিড-রেডি রিপোর্ট নেই' : 'No feed-ready reports'}
                              </h3>
                              <p className="mt-1 type-secondary text-slate-500 dark:text-slate-400">
                                {isBn
                                  ? 'রিভিউ প্রয়োজন, ডুপ্লিকেট বা অসম্পূর্ণ সংবাদ বাম পাশেই থাকবে। শুধু প্রকাশের জন্য প্রস্তুত রিপোর্ট এখানে ফিডের মতো দেখাবে।'
                                  : 'Items needing review, duplicates, or incomplete source data stay on the left. Only publish-ready reports appear here in their feed preview.'}
                              </p>
                            </div>
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto w-full max-w-4xl flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
              <FeedbackNotice
                tone={failedPublishes.length > 0 ? 'warning' : 'success'}
                title={
                  isBn
                    ? `${successfulPublishes.length}টি রিপোর্ট ফিডে প্রকাশ হয়েছে`
                    : `${successfulPublishes.length} reports published to the feed`
                }
              >
                <p>
                  {failedPublishes.length > 0
                    ? isBn
                      ? `${failedPublishes.length}টি রিপোর্ট প্রকাশ করা যায়নি। নিচে কারণ দেখুন।`
                      : `${failedPublishes.length} reports could not be published. See the reasons below.`
                    : isBn
                      ? 'নির্বাচিত সব রিপোর্ট সফলভাবে প্রকাশ হয়েছে।'
                      : 'Every selected report was published successfully.'}
                </p>
              </FeedbackNotice>

              <div className="space-y-3">
                {successfulPublishes.map((outcome) => (
                  <Card key={outcome.reportId} padding="sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="truncate type-card-title">{outcome.title}</h3>
                        </div>
                        <p className="mt-1 type-meta text-slate-500 dark:text-slate-400">
                          {outcome.reportId}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setWorkspaceOpen(false);
                          navigate(`/complaints/${encodeURIComponent(outcome.reportId)}`);
                        }}
                        rightIcon={<ExternalLink />}
                      >
                        {isBn ? 'রিপোর্ট খুলুন' : 'Open report'}
                      </Button>
                    </div>
                  </Card>
                ))}

                {failedPublishes.map((outcome) => (
                  <Card key={outcome.reportId} padding="sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2">
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <div className="min-w-0">
                          <h3 className="type-card-title">{outcome.title}</h3>
                          <p className="mt-1 type-meta text-slate-500 dark:text-slate-400">
                            {outcome.reportId}
                          </p>
                          <p className="mt-1 type-secondary text-rose-700 dark:text-rose-300">
                            {outcome.error}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setWorkspaceOpen(false);
                          navigate(`/complaints/${encodeURIComponent(outcome.reportId)}`);
                        }}
                        rightIcon={<ExternalLink />}
                      >
                        {isBn ? 'রিপোর্ট রিভিউ করুন' : 'Review report'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStep(1);
                    setPublishOutcomes([]);
                    setSelectedReportIds([]);
                    setReportMap({});
                  }}
                  leftIcon={<RefreshCw />}
                >
                  {isBn ? 'আরেকটি ইনটেক চালান' : 'Run Another Intake'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default NewsIntakePage;
