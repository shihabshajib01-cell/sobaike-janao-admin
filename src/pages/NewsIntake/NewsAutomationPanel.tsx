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
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [nextDashboard, nextTaxonomy] = await Promise.all([
        newsIntakeApi.getAutomationDashboard(),
        newsIntakeApi.getTaxonomy(),
      ]);
      setDashboard(nextDashboard);
      setTaxonomy(nextTaxonomy);
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

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      await newsIntakeApi.scanSources();
      await loadDashboard();
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

  const latestRun = dashboard.runs[0] || null;
  const latestItems = useMemo(
    () => (latestRun?.items || []).slice(0, 12),
    [latestRun]
  );

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

  const metrics = latestRun
    ? [
        {
          label: isBn ? 'সোর্স' : 'Sources',
          value: latestRun.sourceCount,
        },
        {
          label: isBn ? 'আর্টিকেল' : 'Articles',
          value: latestRun.discoveredCount,
        },
        {
          label: isBn ? 'শ্রেণিবদ্ধ' : 'Classified',
          value: latestRun.classifiedCount,
        },
        {
          label: isBn ? 'ডুপ্লিকেট' : 'Duplicates',
          value: latestRun.duplicateCount,
        },
        {
          label: isBn ? 'ড্রাফট' : 'Drafts',
          value: latestRun.createdCount,
        },
        {
          label: isBn ? 'মার্জ' : 'Merged',
          value: latestRun.mergedCount,
        },
        {
          label: isBn ? 'রিভিউ' : 'Review',
          value: latestRun.reviewCount,
        },
        {
          label: isBn ? 'ত্রুটি' : 'Errors',
          value: latestRun.errorCount,
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
                ? 'অনুমোদিত সংবাদমাধ্যম থেকে নতুন খবর খুঁজে ক্যাটাগরি শনাক্ত, একই ঘটনার ডুপ্লিকেট যাচাই এবং নিরাপদ ড্রাফট তৈরি করে।'
                : 'Checks approved publishers for new stories, detects supported report categories, checks same-incident duplication, and creates safe drafts.'}
            </CardDescription>
          </div>
          <Button
            size="lg"
            onClick={handleScan}
            isLoading={scanning}
            disabled={loading || scanning || dashboard.sources.length === 0}
            leftIcon={<SearchCheck />}
            className="shrink-0"
          >
            {isBn
              ? 'সোর্স ও ডুপ্লিকেট যাচাই করুন'
              : 'Check Sources & Duplicates'}
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

        <FeedbackNotice
          tone="info"
          compact
          title={isBn ? 'অটোমেশন নীতি' : 'Automation policy'}
        >
          <p>
            {isBn
              ? 'শুধু সোর্সে সমর্থিত তথ্য ব্যবহার করা হয়। নিশ্চিত তথ্য না থাকলে রিপোর্ট বানানো হয় না; রিভিউতে পাঠানো হয়। নতুন রিপোর্ট আগে ড্রাফট হিসেবেই তৈরি হয়—স্বয়ংক্রিয়ভাবে পাবলিশ হয় না।'
              : 'Only source-supported facts are used. If required facts cannot be established safely, the item is sent to review instead of inventing data. New reports are created as drafts and are never auto-published.'}
          </p>
        </FeedbackNotice>

        <section
          className="space-y-3"
          aria-labelledby="news-automation-source-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3
                id="news-automation-source-heading"
                className="type-card-title text-slate-900 dark:text-slate-100"
              >
                {isBn ? 'সক্রিয় সংবাদ সোর্স' : 'Active news sources'}
              </h3>
              <p className="type-meta text-slate-500 dark:text-slate-400">
                {isBn
                  ? `${dashboard.sources.length}টি অনুমোদিত সোর্স স্ক্যান করা হবে`
                  : `${dashboard.sources.length} approved sources will be scanned`}
              </p>
            </div>
            <p className="type-meta text-slate-500 dark:text-slate-400">
              {isBn ? 'সর্বশেষ: ' : 'Last checked: '}
              {formatDateTime(latestRun?.completedAt || latestRun?.startedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {dashboard.sources.map((source) => (
              <a
                key={source.hostname}
                href={source.homepageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 type-meta font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {source.publisherName}
                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        {latestRun && (
          <section
            className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800"
            aria-labelledby="news-automation-result-heading"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="news-automation-result-heading"
                className="type-card-title text-slate-900 dark:text-slate-100"
              >
                {isBn ? 'সর্বশেষ রান' : 'Latest run'}
              </h3>
              <Tag tone={runTone(latestRun.status)}>
                {latestRun.status}
              </Tag>
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

            {latestItems.length > 0 && (
              <div className="space-y-2">
                {latestItems.map((item) => (
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
                          {item.subcategoryId && (
                            <Tag tone="neutral">
                              {categoryLabel(item.segmentId, item.subcategoryId)}
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
                            (isBn ? 'শিরোনাম পাওয়া যায়নি' : 'Title unavailable')}
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
                                `/complaints/${encodeURIComponent(item.reportId || '')}`
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
              </div>
            )}
          </section>
        )}

        {!latestRun && !loading && (
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

        {latestRun?.status === 'partial' && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <CircleAlert
              className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
            <p className="type-meta text-amber-800 dark:text-amber-200">
              {isBn
                ? 'কিছু সোর্স বা আর্টিকেল পড়া যায়নি। সফল আইটেমগুলো নিরাপদে প্রসেস হয়েছে; ব্যর্থ আইটেমগুলো উপরে দেখা যাবে।'
                : 'Some sources or articles could not be read. Successful items were processed safely; failed items are listed above.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsAutomationPanel;
