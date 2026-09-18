import { ButtonBase } from '@/components/ui/Button';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  RotateCcw,
  ExternalLink,
  Clock,
  User,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useNotifications } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_NAVIGATION_ITEMS, getFirstAccessibleRoute } from '@/routes/routes.config';
import { notificationApi } from '@/services/api/notificationApi';
import { AdminNotification, NotificationFilterType } from '@/types/Notification';
import { cn } from '@/utils';
import {
  isSafeNotificationRoute,
  formatRelativeTime,
  formatNumber,
  getNotificationVisualMeta,
} from '@/utils/notificationUtils';

const PAGE_SIZE = 15;

const getNotificationCategoryParam = (filter: NotificationFilterType): string | null =>
  ['complaint', 'administration', 'configuration', 'role', 'security'].includes(filter)
    ? filter
    : null;

export const NotificationsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const navigate = useNavigate();
  const { hasPermission, isBootstrapMode } = useAuth();

  const homePath = getFirstAccessibleRoute(hasPermission, isBootstrapMode);
  const homeItem = ADMIN_NAVIGATION_ITEMS.find((item) => item.path === homePath);
  const homeLabel = homeItem
    ? homeItem.labelKey
      ? t.nav[homeItem.labelKey]
      : isBn
        ? homeItem.defaultLabelBn || homeItem.defaultLabel
        : homeItem.defaultLabel
    : t.notifications.title;
  const notificationBreadcrumbs =
    homePath === '/notifications'
      ? [{ label: t.notifications.title }]
      : [
          { label: homeLabel, onClick: () => navigate(homePath) },
          { label: t.notifications.title },
        ];

  const {
    unreadCount,
    notificationRevision,
    markAsRead,
    markAllAsRead,
    refreshRecent,
  } = useNotifications();

  // State
  const [activeFilter, setActiveFilter] = useState<NotificationFilterType>('all');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch initial notifications for current filter
  const loadNotifications = useCallback(
    async (filter: NotificationFilterType) => {
      setIsLoading(true);
      setError(null);
      setActionError(null);

      try {
        const unreadOnly = filter === 'unread';
        const categoryParam = getNotificationCategoryParam(filter);

        const results = await notificationApi.listNotifications({
          limit: PAGE_SIZE,
          unread_only: unreadOnly,
          category: categoryParam,
        });

        if (!isMountedRef.current) return;

        setNotifications(results);
        setHasMore(
          results.hasMore !== undefined
            ? results.hasMore
            : results.length === PAGE_SIZE
        );
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        console.error('Failed to load notifications list:', err);
        setError(
          err instanceof Error ? err.message : t.notifications.errorLoading
        );
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [t.notifications.errorLoading]
  );

  // Re-fetch when filter changes
  useEffect(() => {
    loadNotifications(activeFilter);
  }, [activeFilter, loadNotifications]);

  const lastRealtimeRevisionRef = useRef<number>(notificationRevision);
  useEffect(() => {
    if (notificationRevision === lastRealtimeRevisionRef.current) return;
    lastRealtimeRevisionRef.current = notificationRevision;
    void loadNotifications(activeFilter);
  }, [notificationRevision, activeFilter, loadNotifications]);

  // Load more with keyset pagination
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || notifications.length === 0) return;

    const lastItem = notifications[notifications.length - 1];
    setIsLoadingMore(true);
    setActionError(null);

    try {
      const unreadOnly = activeFilter === 'unread';
      const categoryParam = getNotificationCategoryParam(activeFilter);

      const nextBatch = await notificationApi.listNotifications({
        limit: PAGE_SIZE,
        before_created_at: lastItem.created_at,
        before_id: lastItem.id,
        unread_only: unreadOnly,
        category: categoryParam,
      });

      if (!isMountedRef.current) return;

      if (nextBatch.length > 0) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const deduplicated = nextBatch.filter((n) => !existingIds.has(n.id));
          return [...prev, ...deduplicated];
        });
      }

      const batchHasMore =
        nextBatch.hasMore !== undefined
          ? nextBatch.hasMore
          : nextBatch.length === PAGE_SIZE;
      setHasMore(batchHasMore);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      console.error('Failed to load more notifications:', err);
      setActionError(
        err instanceof Error ? err.message : t.notifications.errorLoading
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  };

  // Mark a single notification as read
  const handleMarkItemRead = async (
    e: React.MouseEvent,
    notification: AdminNotification
  ) => {
    e.stopPropagation();
    if (notification.read_at || processingIds.has(notification.id)) return;

    setProcessingIds((prev) => new Set(prev).add(notification.id));
    setActionError(null);

    try {
      const success = await markAsRead(notification.id);
      if (!isMountedRef.current) return;

      if (success) {
        if (activeFilter === 'unread') {
          // Immediately remove the item from unread list
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        } else {
          // Update local state to read
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id
                ? { ...n, read_at: new Date().toISOString() }
                : n
            )
          );
        }
      } else {
        // Keep notification unread and show error
        setActionError(t.notifications.errorMarkRead);
      }
    } catch (err) {
      console.error('Failed to mark item read:', err);
      if (isMountedRef.current) {
        setActionError(t.notifications.errorMarkRead);
      }
    } finally {
      if (isMountedRef.current) {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(notification.id);
          return next;
        });
      }
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;

    setIsMarkingAll(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await markAllAsRead();
      if (!isMountedRef.current) return;

      if (activeFilter === 'unread') {
        setNotifications([]);
        setHasMore(false);
      } else {
        const nowIso = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) => (!n.read_at ? { ...n, read_at: nowIso } : n))
        );
      }
      setActionSuccess(t.notifications.markAllAsReadSuccess);
      setTimeout(() => {
        if (isMountedRef.current) setActionSuccess(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      if (isMountedRef.current) {
        setActionError(t.notifications.errorMarkRead);
      }
    } finally {
      if (isMountedRef.current) {
        setIsMarkingAll(false);
      }
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    await Promise.all([
      loadNotifications(activeFilter),
      refreshRecent(),
    ]);
  };

  // Card click / Navigation
  const handleItemNavigate = async (notification: AdminNotification) => {
    // 1. Mark read if unread
    if (!notification.read_at) {
      try {
        const success = await markAsRead(notification.id);
        if (!isMountedRef.current) return;

        if (success) {
          if (activeFilter === 'unread') {
            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
          } else {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === notification.id
                  ? { ...n, read_at: new Date().toISOString() }
                  : n
              )
            );
          }
        } else {
          setActionError(t.notifications.errorMarkRead);
          return;
        }
      } catch (err) {
        console.error('Mark-read error on navigate:', err);
        if (isMountedRef.current) {
          setActionError(t.notifications.errorMarkRead);
        }
        return;
      }
    }

    // 2. Safely navigate if route exists
    if (isSafeNotificationRoute(notification.route)) {
      navigate(notification.route!);
    }
  };

  // Filter tab definitions
  const filters: { key: NotificationFilterType; label: string }[] = [
    { key: 'all', label: t.notifications.all },
    { key: 'unread', label: t.notifications.unread },
    { key: 'complaint', label: t.notifications.complaints },
    { key: 'administration', label: t.notifications.administration },
    { key: 'configuration', label: t.notifications.configuration },
    { key: 'role', label: t.notifications.roles },
    { key: 'security', label: t.notifications.security },
  ];

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title={t.notifications.title}
        description={t.notifications.subtitle}
        breadcrumbs={notificationBreadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              id="notifications-refresh-btn"
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              isLoading={isLoading}
              leftIcon={<RotateCcw />}
            >
              {t.notifications.refresh}
            </Button>

            <Button
              type="button"
              id="notifications-mark-all-read-btn"
              variant="primary"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || isMarkingAll}
              isLoading={isMarkingAll}
              leftIcon={<CheckCheck />}
            >
              {t.notifications.markAllRead}
            </Button>
          </div>
        }
      />

      {/* Feedback Messages */}
      {actionSuccess && (
        <div
          role="status"
          className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <ButtonBase
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-sm hover:underline text-emerald-700 dark:text-emerald-300 ml-4 font-medium"
          >
            ×
          </ButtonBase>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm flex items-center justify-between animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <ButtonBase
            type="button"
            onClick={() => setActionError(null)}
            className="text-sm hover:underline text-red-700 dark:text-red-300 ml-4 font-medium"
          >
            ×
          </ButtonBase>
        </div>
      )}

      {/* Filter Tabs Bar */}
      <div className="my-5 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <ButtonBase
                key={filter.key}
                type="button"
                id={`notification-filter-tab-${filter.key}`}
                onClick={() => setActiveFilter(filter.key)}
                aria-pressed={isActive}
                className={cn(
                  'px-3.5 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                )}
              >
                <span>{filter.label}</span>
                {filter.key === 'unread' && unreadCount > 0 && (
                  <span
                    className={cn(
                      'ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold',
                      isActive
                        ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white'
                        : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                    )}
                  >
                    {formatNumber(unreadCount, language)}
                  </span>
                )}
              </ButtonBase>
            );
          })}
        </div>

        {/* Total Display */}
        <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:block">
          {unreadCount > 0
            ? `${formatNumber(unreadCount, language)} ${
                unreadCount === 1
                  ? t.notifications.unreadCountSingular.replace('{count}', '')
                  : t.notifications.unreadCountPlural.replace('{count}', '')
              }`
            : t.notifications.allCaughtUp}
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="space-y-3">
        {/* Initial Loading Skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-4/5" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800/40 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-8 text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {t.notifications.errorLoading}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
              {error}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => loadNotifications(activeFilter)}
              leftIcon={<RotateCcw />}
            >
              {t.notifications.retry}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && notifications.length === 0 && (
          <EmptyState
            icon={Bell}
            title={
              activeFilter === 'unread'
                ? t.notifications.allCaughtUp
                : activeFilter === 'all'
                ? t.notifications.noNotifications
                : t.notifications.noFilteredNotifications
            }
            description={
              activeFilter === 'unread'
                ? t.notifications.subtitle
                : isBn
                ? 'বিজ্ঞপ্তি আসলে এখানে তালিকাভুক্ত হবে।'
                : 'New notifications will appear here when events occur.'
            }
            action={
              activeFilter !== 'all' ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                >
                  {isBn ? 'সব বিজ্ঞপ্তি দেখুন' : 'View all notifications'}
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Notifications List */}
        {!isLoading && !error && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((item) => {
              const isUnread = !item.read_at;
              const isProcessing = processingIds.has(item.id);
              const meta = getNotificationVisualMeta(
                item.event_key,
                item.category,
                item.severity,
                item.layer
              );
              const IconComponent = meta.icon;
              const title = isBn
                ? item.title_bn || item.title_en
                : item.title_en;
              const body = isBn ? item.body_bn || item.body_en : item.body_en;
              const relativeTime = formatRelativeTime(item.created_at, language);
              const hasRoute = isSafeNotificationRoute(item.route);

              // Absolute formatted date for secondary display
              const absoluteTime = new Date(item.created_at).toLocaleString(
                isBn ? 'bn-BD' : 'en-US',
                {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }
              );

              const routeActionLabel = item.route?.startsWith('/complaints')
                ? isBn
                  ? 'অভিযোগের বিবরণ দেখুন'
                  : 'View Complaint'
                : item.route?.startsWith('/roles')
                  ? isBn
                    ? 'ভূমিকার বিবরণ দেখুন'
                    : 'View Role'
                  : item.route?.startsWith('/users')
                    ? isBn
                      ? 'ব্যবহারকারী দেখুন'
                      : 'View User'
                    : t.notifications.openDetails;

              return (
                <article
                  key={item.id}
                  id={`notification-card-${item.id}`}
                  className={cn(
                    'rounded-lg border transition-colors',
                    isUnread
                      ? 'bg-sky-50/30 dark:bg-sky-950/15 border-sky-200 dark:border-sky-900/60 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  )}
                >
                  <ButtonBase
                    type="button"
                    onClick={() => void handleItemNavigate(item)}
                    className="group w-full p-4 sm:p-5 text-left rounded-t-lg transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                    aria-label={`${title}. ${isUnread ? t.notifications.unread : ''}`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                          meta.iconBg,
                          meta.iconColor
                        )}
                        aria-hidden="true"
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              status={meta.isSecurity ? 'error' : 'default'}
                              variant="subtle"
                              size="md"
                            >
                              {isBn ? meta.groupLabelBn : meta.groupLabelEn}
                            </Badge>

                            {item.target_label && (
                              <Badge
                                status="default"
                                variant="outline"
                                size="md"
                                className="max-w-[180px] truncate"
                              >
                                {item.target_label}
                              </Badge>
                            )}

                            {item.actor_display_name && (
                              <span className="text-sm text-slate-500 dark:text-slate-400 hidden md:inline-flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {item.actor_display_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 font-normal">
                            <Clock className="w-3.5 h-3.5" />
                            <span title={absoluteTime}>{relativeTime}</span>
                          </div>
                        </div>

                        <h3
                          className={cn(
                            'text-base text-slate-900 dark:text-slate-100 leading-snug break-words',
                            isUnread ? 'font-bold' : 'font-medium'
                          )}
                        >
                          {title}
                        </h3>

                        {body && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                            {body}
                          </p>
                        )}
                      </div>
                    </div>
                  </ButtonBase>

                  <div className="mx-4 sm:mx-5 py-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isUnread ? (
                        <Button
                          type="button"
                          id={`mark-read-btn-${item.id}`}
                          variant="secondary"
                          size="sm"
                          onClick={(event) => void handleMarkItemRead(event, item)}
                          disabled={isProcessing}
                          isLoading={isProcessing}
                          leftIcon={<Check />}
                        >
                          {t.notifications.markAsRead}
                        </Button>
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{isBn ? 'পঠিত' : 'Read'}</span>
                        </span>
                      )}
                    </div>

                    {hasRoute && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleItemNavigate(item)}
                        rightIcon={<ExternalLink />}
                      >
                        {routeActionLabel}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Pagination: Load More Button */}
            {hasMore && (
              <div className="pt-4 text-center">
                <Button
                  type="button"
                  id="notifications-load-more-btn"
                  variant="secondary"
                  size="md"
                  onClick={handleLoadMore}
                  isLoading={isLoadingMore}
                  leftIcon={<ChevronDown />}
                >
                  {isLoadingMore
                    ? t.notifications.loadingMore
                    : t.notifications.loadMore}
                </Button>
              </div>
            )}

            {!hasMore && notifications.length > 5 && (
              <p className="pt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'সব বিজ্ঞপ্তি প্রদর্শিত হয়েছে'
                  : 'All notifications displayed'}
              </p>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default NotificationsPage;
