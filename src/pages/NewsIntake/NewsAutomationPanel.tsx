import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircleAlert,
  ExternalLink,
  FileText,
  GitMerge,
  Newspaper,
  RefreshCw,
  SearchCheck,
  TimerReset,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { FeedbackNotice } from '@/components/ui/FeedbackNotice';
import { Tag, TagTone } from '@/components/ui/Tag';
import { useLanguage } from '@/context/LanguageContext';
import { newsIntakeApi } from '@/services/api';
import {
  NewsIntakeAutomationAction,
  NewsIntakeAutomationDashboard,
  NewsIntakeAutomationRun,
  NewsIntakeTaxonomy,
} from '@/types/NewsIntake';

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

const EMPTY_TAXONOMY: NewsIntakeTaxonomy = {
  segments: [],
  subcategories: [],
};

const actionTone = (action: NewsIntakeAutomationAction): TagTone => {
  switch (action) {
    case 'created_draft':
      return 'success';
    case 'merged_source':
      return 'info';
    case 'needs_review':
      return 'warning';
    case 'error':
      return 'danger';
    default:
      return 'neutral';
  }
};

const runTone = (status: NewsIntakeAutomationRun['status']): TagTone => {
  if (status === 'completed') return 'success';
  if (status === 'partial') return 'warning';
  if (status === 'failed') return 'danger';
  return 'info';
};

export const NewsAutomationPanel: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [dashboard, setDashboard] =
    useState<NewsIntakeAutomationDashboard>(EMPTY_DASHBOARD);
  const [taxonomy, setTaxonomy] =
    useState<NewsIntakeTaxonomy>(EMPTY_TAXONOMY);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [nextDashboard, nextTaxonomy] = await Promise.all([
        newsIntakeApi.getAutomationDashboard(),
        newsIntakeApi.getTaxonomy(),
      ]);
      setDashboard(nextDashboard);
      setTaxonomy(nextTaxonomy);
      setSelectedRunId((current) => {
        if (
          current &&
          nextDashboard.runs.some((run) => run.runId === current)
        ) {
          return current;
        }
        return nextDashboard.runs[0]?.runId || null;
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load News Automation status.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const automatedSources = useMemo(
    () => dashboard.sources.filter((source) => source.scanEnabled),
    [dashboard.sources]
  );
  const manualSources = useMemo(
    () => dashboard.sources.filter((source) => !source.scanEnabled),
    [dashboard.sources]
  );

  const selectedRun = useMemo(
    () =>
      dashboard.runs.find((run) => run.runId === selectedRunId) ||
      dashboard.runs[0] ||
      null,
    [dashboard.runs, selectedRunId]
  );

  const visibleItems = useMemo(() => {
    const items = selectedRun?.items || [];
    return showAllResults ? items : items.slice(0, 12);
  }, [selectedRun, showAllResults]);

  useEffect(() => {
    setShowAllResults(false);
  }, [selectedRunId]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await newsIntakeApi.scanSources();
      await loadDashboard();
      setSelectedRunId(result.runId);
      if (result.alreadyRunning) {
        setError(
          isBn
            ? 'আরেকটি নিউজ স্ক্যান ইতিমধ্যে চলছে। একই সময়ে দ্বিতীয় স্ক্যান শুরু করা হয়নি।'
            : 'Another News Intake scan is already running. A second overlapping scan was not started.'
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'News source scan could not be completed.'
      );
    } finally {
      setScanning(false);
    }
  };

  const handleAutoUpdate = async () => {
    setUpdatingSchedule(true);
    setError(null);
    try {
      await newsIntakeApi.setAutoUpdate(!dashboard.automation.enabled);
      await loadDashboard();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'News Automation schedule could not be updated.'
      );
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return isBn ? 'এখনও চালানো হয়নি' : 'Not run yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(isBn ? 'bn-BD' : 'en-BD', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const actionLabel = (action: NewsIntakeAutomationAction) => {
    const labels: Record<NewsIntakeAutomationAction, [string, string]> = {
      discovered: ['Checked', 'যাচাই হয়েছে'],
      skip_duplicate: ['Duplicate skipped', 'ডুপ্লিকেট বাদ'],
      needs_review: ['Needs review', 'রিভিউ প্রয়োজন'],
      created_draft: ['Draft created', 'ড্রাফট তৈরি'],
      merged_source: ['Source merged', 'সোর্স মার্জ'],
      error: ['Error', 'ত্রুটি'],
    };
    return isBn ? labels[action][1] : labels[action][0];
  };

  const categoryLabel = (
    segmentId?: string | null,
    subcategoryId?: string | null
  ) => {
    const segment = taxonomy.segments.find((item) => item.id === segmentId);
    const subcategory = taxonomy.subcategories.find(
      (item) => item.id === subcategoryId
    );
    const segmentName = segment
      ? isBn
        ? segment.nameBn
        : segment.nameEn
      : segmentId || '';
    const subcategoryName = subcategory
      ? isBn
        ? subcategory.nameBn
        : subcategory.nameEn
      : subcategoryId || '';

    return [segmentName, subcategoryName].filter(Boolean).join(' · ');
  };

  const metrics = selectedRun
    ? [
        {
          label: isBn ? 'সোর্স' : 'Sources',
          value: selectedRun.sourceCount,
        },
        {
          label: isBn ? 'আর্টিকেল' : 'Articles',
          value: selectedRun.discoveredCount,
        },
        {
          label: isBn ? 'শ্রেণিবদ্ধ' : 'Classified',
          value: selectedRun.classifiedCount,
        },
        {
          label: isBn ? 'ডুপ্লিকেট' : 'Duplicates',
          value: selectedRun.duplicateCount,
        },
        {
          label: isBn ? 'ড্রাফট' : 'Drafts',
          value: selectedRun.createdCount,
        },
        {
          label: isBn ? 'মার্জ' : 'Merged',
          value: selectedRun.mergedCount,
        },
        {
          label: isBn ? 'রিভিউ' : 'Review',
          value: selectedRun.reviewCount,
        },
        {
          label: isBn ? 'ত্রুটি' : 'Errors',
          value: selectedRun.errorCount,
        },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>
              {isBn ? 'নিউজ অটোমেশন' : 'News Automation'}
            </CardTitle>
            <CardDescription>
              {isBn
                ? 'নির্ভরযোগ্য সংবাদ সোর্স থেকে নতুন খবর খুঁজে ক্যাটাগরি শনাক্ত, একই ঘটনার ডুপ্লিকেট যাচাই এবং নিরাপদ ড্রাফট তৈরি করে।'
                : 'Checks reliable news sources for new stories, detects supported report categories, checks same-incident duplication, and creates safe drafts.'}
            </CardDescription>
          </div>
          <Button
            size="lg"
            onClick={handleScan}
            isLoading={scanning}
            disabled={
              loading ||
              scanning ||
              dashboard.automation.running ||
              automatedSources.length === 0
            }
            leftIcon={<SearchCheck />}
            className="shrink-0"
          >
            {isBn ? 'এখনই যাচাই করুন' : 'Check Now'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && (
          <FeedbackNotice
            tone="error"
            title={isBn ? 'স্ক্যান সম্পন্ন হয়নি' : 'Scan could not be completed'}
            onDismiss={() => setError(null)}
          >
            <p>{error}</p>
          </FeedbackNotice>
        )}

        <section
          className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40"
          aria-labelledby="news-auto-schedule-heading"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="news-auto-schedule-heading"
                  className="type-card-title text-slate-900 dark:text-slate-100"
                >
                  {isBn ? 'অটো আপডেট' : 'Auto Update'}
                </h3>
                <Tag tone={dashboard.automation.enabled ? 'success' : 'neutral'}>
                  {dashboard.automation.enabled
                    ? isBn
                      ? 'চালু'
                      : 'ON'
                    : isBn
                      ? 'বন্ধ'
                      : 'OFF'}
                </Tag>
                <Tag tone="info">
                  {isBn ? 'প্রতি ৩৬ ঘণ্টা' : 'Every 36 hours'}
                </Tag>
              </div>

              <div className="grid gap-1 type-meta text-slate-500 dark:text-slate-400 sm:grid-cols-2 sm:gap-x-6">
                <p>
                  {isBn ? 'সর্বশেষ অটো রান: ' : 'Last automatic run: '}
                  {formatDateTime(dashboard.automation.lastAutoDispatchedAt)}
                </p>
                <p>
                  {isBn ? 'পরবর্তী নির্ধারিত রান: ' : 'Next scheduled run: '}
                  {dashboard.automation.enabled
                    ? formatDateTime(dashboard.automation.nextAutoDueAt)
                    : isBn
                      ? 'বন্ধ'
                      : 'Disabled'}
                </p>
              </div>

              <p className="type-meta text-slate-600 dark:text-slate-300">
                {isBn
                  ? 'ম্যানুয়াল “এখনই যাচাই করুন” অটো টাইমার রিসেট করে না। একই সময়ে একটি স্ক্যানই চলবে।'
                  : 'Manual “Check Now” runs do not reset the automatic timer. Only one scan can run at a time.'}
              </p>
            </div>

            <Button
              size="sm"
              variant={dashboard.automation.enabled ? 'secondary' : 'primary'}
              onClick={handleAutoUpdate}
              isLoading={updatingSchedule}
              disabled={loading || updatingSchedule}
              leftIcon={<TimerReset />}
              className="shrink-0"
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
        </section>

        <FeedbackNotice
          tone="info"
          compact
          title={isBn ? 'অটোমেশন নীতি' : 'Automation policy'}
        >
          <p>
            {isBn
              ? 'শুধু সোর্সে সমর্থিত তথ্য ব্যবহার করা হয়। নিশ্চিত তথ্য না থাকলে রিপোর্ট বানানো হয় না; রিভিউতে পাঠানো হয়। একই ক্যাটাগরি, তারিখ ও জেলায় আগের রিপোর্ট থাকলে স্বয়ংক্রিয়ভাবে নতুন রিপোর্ট তৈরি হয় না। নতুন রিপোর্ট আগে ড্রাফট হিসেবেই তৈরি হয়—স্বয়ংক্রিয়ভাবে পাবলিশ হয় না।'
              : 'Only source-supported facts are used. Uncertain items go to review instead of inventing data. If an existing sourced report has the same category, incident date, and district, automation will not create another report without review. New reports remain drafts and are never auto-published.'}
          </p>
        </FeedbackNotice>

        <section
          className="space-y-4"
          aria-labelledby="news-automation-source-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="news-automation-source-heading"
                className="type-card-title text-slate-900 dark:text-slate-100"
              >
                {isBn ? 'বিশ্বস্ত সংবাদ সোর্স' : 'Trusted news sources'}
              </h3>
              <p className="type-meta text-slate-500 dark:text-slate-400">
                {isBn
                  ? `${dashboard.sources.length}টি বিশ্বস্ত সোর্স · ${automatedSources.length}টি অটোমেটেড · ${manualSources.length}টি ম্যানুয়াল`
                  : `${dashboard.sources.length} trusted · ${automatedSources.length} automated · ${manualSources.length} manual-only`}
              </p>
            </div>
            <p className="type-meta text-slate-500 dark:text-slate-400">
              {isBn ? 'সর্বশেষ: ' : 'Last checked: '}
              {formatDateTime(
                dashboard.runs[0]?.completedAt || dashboard.runs[0]?.startedAt
              )}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="success">
                {isBn
                  ? `${automatedSources.length} অটোমেটেড`
                  : `${automatedSources.length} automated`}
              </Tag>
              <p className="type-meta text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'এই সোর্সগুলো এক ক্লিকে স্ক্যান করা হবে।'
                  : 'These publishers are included in the one-click scan.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {automatedSources.map((source) => (
                <a
                  key={source.hostname}
                  href={source.homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 type-meta font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200"
                >
                  {source.publisherName}
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {manualSources.length > 0 && (
            <details className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <summary className="cursor-pointer type-secondary font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-200">
                {isBn
                  ? `ম্যানুয়াল-অনলি বিশ্বস্ত সোর্স (${manualSources.length})`
                  : `Manual-only trusted sources (${manualSources.length})`}
              </summary>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {manualSources.map((source) => (
                  <div
                    key={source.hostname}
                    className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={source.homepageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="type-secondary font-medium text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-400"
                      >
                        {source.publisherName}
                      </a>
                      <Tag tone="neutral">
                        {isBn ? 'ম্যানুয়াল' : 'Manual'}
                      </Tag>
                    </div>
                    <p className="mt-1 type-meta text-slate-500 dark:text-slate-400">
                      {source.automationNote ||
                        (isBn
                          ? 'এই সোর্সটি বর্তমানে স্বয়ংক্রিয় স্ক্যানে নেই।'
                          : 'This source is not currently available for automated scanning.')}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        {dashboard.runs.length > 0 && (
          <section
            className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800"
            aria-labelledby="news-automation-result-heading"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3
                  id="news-automation-result-heading"
                  className="type-card-title text-slate-900 dark:text-slate-100"
                >
                  {isBn ? 'রান ইতিহাস ও ফলাফল' : 'Run history & results'}
                </h3>
                <p className="type-meta text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'সর্বশেষ ১০টি রান থেকে যেকোনো একটি খুলে সম্পূর্ণ ফলাফল দেখুন।'
                    : 'Open any of the latest 10 runs and inspect its full result set.'}
                </p>
              </div>
              {!scanning && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void loadDashboard()}
                  leftIcon={<RefreshCw />}
                >
                  {isBn ? 'রিফ্রেশ' : 'Refresh'}
                </Button>
              )}
            </div>

            <div
              className="flex gap-2 overflow-x-auto pb-1"
              aria-label={isBn ? 'রান ইতিহাস' : 'Run history'}
            >
              {dashboard.runs.map((run, index) => (
                <Button
                  key={run.runId}
                  size="sm"
                  variant={run.runId === selectedRun?.runId ? 'secondary' : 'ghost'}
                  onClick={() => setSelectedRunId(run.runId)}
                  className="shrink-0"
                >
                  {index === 0
                    ? isBn
                      ? 'সর্বশেষ'
                      : 'Latest'
                    : formatDateTime(run.startedAt)}
                </Button>
              ))}
            </div>

            {selectedRun && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={runTone(selectedRun.status)}>
                    {selectedRun.status}
                  </Tag>
                  <Tag tone={selectedRun.triggerType === 'automatic' ? 'info' : 'neutral'}>
                    {selectedRun.triggerType === 'automatic'
                      ? isBn
                        ? 'অটোমেটিক'
                        : 'Automatic'
                      : isBn
                        ? 'ম্যানুয়াল'
                        : 'Manual'}
                  </Tag>
                  <p className="type-meta text-slate-500 dark:text-slate-400">
                    {formatDateTime(selectedRun.startedAt)}
                    {selectedRun.completedAt
                      ? ` → ${formatDateTime(selectedRun.completedAt)}`
                      : ''}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                  {metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <p className="type-card-title text-slate-900 dark:text-slate-100">
                        {metric.value}
                      </p>
                      <p className="type-meta text-slate-500 dark:text-slate-400">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>

                {visibleItems.length > 0 && (
                  <div className="space-y-2">
                    {visibleItems.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Tag tone={actionTone(item.action)}>
                                {actionLabel(item.action)}
                              </Tag>
                              {item.itemKind === 'source' && (
                                <Tag tone="neutral">
                                  {isBn ? 'সোর্স স্ট্যাটাস' : 'Source status'}
                                </Tag>
                              )}
                              {item.subcategoryId && (
                                <Tag tone="neutral">
                                  {categoryLabel(item.segmentId, item.subcategoryId)}
                                </Tag>
                              )}
                              {item.contentLanguage &&
                                item.contentLanguage !== 'unknown' && (
                                  <Tag tone="info">
                                    {item.contentLanguage.toUpperCase()}
                                  </Tag>
                                )}
                              {item.confidence !== null &&
                                item.confidence !== undefined && (
                                  <Tag tone="violet">
                                    {Math.round(Number(item.confidence) * 100)}%
                                  </Tag>
                                )}
                            </div>
                            <p className="type-body font-medium text-slate-900 dark:text-slate-100">
                              {item.sourceTitle ||
                                (item.itemKind === 'source'
                                  ? item.publisherName
                                  : isBn
                                    ? 'শিরোনাম পাওয়া যায়নি'
                                    : 'Title unavailable')}
                            </p>
                            <p className="type-meta text-slate-500 dark:text-slate-400">
                              {item.publisherName}
                              {item.sourcePublishedDate
                                ? ` · ${item.sourcePublishedDate}`
                                : ''}
                            </p>
                            {item.reason && (
                              <p className="type-meta text-slate-600 dark:text-slate-300">
                                {item.reason}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <a
                              href={item.canonicalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 type-action-sm text-sky-700 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-400 dark:hover:bg-sky-950/40"
                            >
                              <Newspaper className="size-3.5" aria-hidden="true" />
                              {isBn ? 'সোর্স' : 'Source'}
                            </a>
                            {item.reportId && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  navigate(
                                    `/complaints/${encodeURIComponent(
                                      item.reportId || ''
                                    )}`
                                  )
                                }
                                leftIcon={
                                  item.action === 'merged_source' ? (
                                    <GitMerge />
                                  ) : (
                                    <FileText />
                                  )
                                }
                              >
                                {isBn ? 'রিপোর্ট খুলুন' : 'Open report'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}

                    {(selectedRun.items || []).length > 12 && (
                      <div className="flex justify-center pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAllResults((value) => !value)}
                        >
                          {showAllResults
                            ? isBn
                              ? 'কম দেখুন'
                              : 'Show less'
                            : isBn
                              ? `সব ${selectedRun.items.length}টি ফলাফল দেখুন`
                              : `Show all ${selectedRun.items.length} results`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {selectedRun.status === 'partial' && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <CircleAlert
                      className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
                      aria-hidden="true"
                    />
                    <p className="type-meta text-amber-800 dark:text-amber-200">
                      {isBn
                        ? 'এই রানে কিছু সোর্স বা আর্টিকেল পড়া যায়নি। সফল আইটেমগুলো আলাদাভাবে প্রসেস হয়েছে এবং সব ব্যর্থ আইটেম ফলাফলে রাখা হয়েছে।'
                        : 'Some sources or articles could not be read in this run. Successful items were processed independently and every failed item remains visible in the results.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {!dashboard.runs.length && !loading && (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <div>
              <p className="type-body font-medium text-slate-800 dark:text-slate-100">
                {isBn ? 'এখনও কোনো অটোমেশন রান নেই' : 'No automation run yet'}
              </p>
              <p className="type-meta text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'উপরের বাটনে ক্লিক করলে প্রথম সোর্স ও ডুপ্লিকেট যাচাই শুরু হবে।'
                  : 'Use the button above to run the first source and duplicate check.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsAutomationPanel;
