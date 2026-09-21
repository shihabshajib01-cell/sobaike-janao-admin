import { ButtonBase, IconButton } from '@/components/ui/Button';
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowRight, RotateCcw, CheckCheck, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/utils';
import {
  isSafeNotificationRoute,
  formatRelativeTime,
  formatNumber,
  getNotificationVisualMeta,
} from '@/utils/notificationUtils';
import { AdminNotification } from '@/types/Notification';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const NotificationDropdown: React.FC = () => {
  const {
    unreadCount,
    recentNotifications,
    isLoadingRecent,
    recentError,
    refreshRecent,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [globalActionError, setGlobalActionError] = useState<string | null>(null);
  const [itemErrorIds, setItemErrorIds] = useState<Set<string>>(new Set());
  const [markingItemIds, setMarkingItemIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bellButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusOnCloseRef = useRef<boolean>(false);

  const closeDropdown = useCallback((restoreFocus: boolean = false) => {
    restoreFocusOnCloseRef.current = restoreFocus;
    setIsOpen(false);
    setItemErrorIds(new Set());
    setGlobalActionError(null);
  }, []);

  useLayoutEffect(() => {
    if (isOpen || !restoreFocusOnCloseRef.current) return;

    restoreFocusOnCloseRef.current = false;
    bellButtonRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeDropdown(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDropdown]);

  useEffect(() => {
    if (!isOpen) return;

    setItemErrorIds(new Set());
    setGlobalActionError(null);
    void refreshRecent();

    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, refreshRecent]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      closeDropdown(true);
    } else {
      setIsOpen(true);
    }
  }, [isOpen, closeDropdown]);

  // Notification item click: Mark read, validate route, navigate safely or stay
  const handleItemClick = async (notification: AdminNotification) => {
    // If already in-flight marking this item, prevent duplicate calls
    if (markingItemIds.has(notification.id)) return;

    // 1. If already read, can navigate normally
    if (notification.read_at) {
      setItemErrorIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
      const route = notification.route;
      if (isSafeNotificationRoute(route)) {
        setIsOpen(false);
        navigate(route!);
      }
      return;
    }

    // 2. Unread notification: must successfully mark as read first
    setMarkingItemIds((prev) => new Set(prev).add(notification.id));
    setItemErrorIds((prev) => {
      const next = new Set(prev);
      next.delete(notification.id);
      return next;
    });

    let success = false;
    try {
      success = await markAsRead(notification.id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      success = false;
    } finally {
      setMarkingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }

    // If success === false:
    // - keep the notification unread
    // - show a small visible error/retry state inside the dropdown
    // - do not silently console.warn only
    // - do not pretend the action succeeded
    // - do not navigate away until the mark-read attempt succeeds
    if (!success) {
      setItemErrorIds((prev) => new Set(prev).add(notification.id));
      return;
    }

    // 3. Mark read succeeded! Navigate safely if route exists
    const route = notification.route;
    if (isSafeNotificationRoute(route)) {
      setIsOpen(false);
      navigate(route!);
    }
  };

  // Mark all as read action
  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    setGlobalActionError(null);
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      setGlobalActionError(t.notifications.errorMarkRead);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // View all notifications navigation
  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  // Accessible label for screen readers
  const accessibleLabel =
    unreadCount > 0
      ? `${t.notifications.title}, ${formatNumber(unreadCount, language)} ${
          unreadCount === 1
            ? t.notifications.unreadCountSingular.replace('{count}', '')
            : t.notifications.unreadCountPlural.replace('{count}', '')
        }`
      : t.notifications.title;

  // Format badge display: 1-9 = actual number, >9 = 9+ / ৯+
  const badgeText =
    unreadCount > 9
      ? `${formatNumber(9, language)}+`
      : formatNumber(unreadCount, language);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <div className="relative inline-flex">
        <IconButton
          id="header-notification-bell-btn"
          ref={bellButtonRef}
          variant="ghost"
          size="md"
          onClick={handleToggle}
          className={cn(isOpen && 'outline outline-1 outline-slate-200 dark:outline-slate-700')}
          aria-label={accessibleLabel}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-controls={isOpen ? 'notification-dropdown-dialog' : undefined}
          icon={<Bell />}
        />

        {unreadCount > 0 && (
          <span
            className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-sky-600 text-white text-sm font-semibold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs leading-none"
            aria-hidden="true"
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* Notifications Popover Menu */}
      {isOpen && (
        <div
          id="notification-dropdown-dialog"
          ref={dialogRef}
          role="dialog"
          aria-modal="false"
          aria-label={t.notifications.title}
          className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-0 z-50 animate-in fade-in zoom-in-95 text-left overflow-hidden"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t.notifications.title}
              </span>
              {unreadCount > 0 && (
                <Badge status="info" variant="subtle" size="md">
                  {badgeText} {t.notifications.unread}
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                type="button"
                id="notification-dropdown-mark-all-btn"
                variant="ghost"
                size="sm"
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                isLoading={isMarkingAll}
                leftIcon={<CheckCheck />}
                title={t.notifications.markAllRead}
              >
                {t.notifications.markAllRead}
              </Button>
            )}
          </div>

          {globalActionError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              <span>{globalActionError}</span>
              <ButtonBase
                type="button"
                onClick={(event) => void handleMarkAll(event)}
                disabled={isMarkingAll || unreadCount === 0}
                className="shrink-0 rounded-md px-2 py-1 font-medium hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-900/50"
              >
                {t.notifications.retry}
              </ButtonBase>
            </div>
          )}

          {/* Popover Notification List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[360px] overflow-y-auto overscroll-contain">
            {/* Loading Skeleton */}
            {isLoadingRecent && recentNotifications.length === 0 && (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded w-5/6" />
                      <div className="h-2 bg-slate-100 dark:bg-slate-800/40 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoadingRecent && recentError && recentNotifications.length === 0 && (
              <div className="p-5 text-center">
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                  {t.notifications.errorLoading}
                </p>
                <ButtonBase
                  type="button"
                  onClick={() => refreshRecent()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.notifications.retry}</span>
                </ButtonBase>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingRecent && !recentError && recentNotifications.length === 0 && (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                <Bell className="w-7 h-7 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.notifications.allCaughtUp}
                </p>
                <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">
                  {t.notifications.noNotifications}
                </p>
              </div>
            )}

            {/* Render Recent Notifications */}
            {recentNotifications.map((item) => {
              const isUnread = !item.read_at;
              const meta = getNotificationVisualMeta(item.event_key, item.category, item.severity, item.layer);
              const IconComponent = meta.icon;
              const title =
                language === 'bn' ? item.title_bn || item.title_en : item.title_en || item.title_bn;
              const body =
                language === 'bn' ? item.body_bn || item.body_en : item.body_en || item.body_bn;
              const relativeTime = formatRelativeTime(item.created_at, language);
              const hasRoute = isSafeNotificationRoute(item.route);

              return (
                <article
                  key={item.id}
                  id={`notification-dropdown-item-${item.id}`}
                  className={cn(
                    'relative',
                    isUnread
                      ? 'bg-sky-50/40 dark:bg-sky-950/20'
                      : 'bg-white dark:bg-slate-900'
                  )}
                >
                  <ButtonBase
                    type="button"
                    onClick={() => void handleItemClick(item)}
                    className="group w-full p-3.5 flex items-start gap-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                    aria-label={`${title}. ${isUnread ? t.notifications.unread : ''}`}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        meta.iconBg,
                        meta.iconColor
                      )}
                      aria-hidden="true"
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <p
                          className={cn(
                            'text-sm text-slate-900 dark:text-slate-100 truncate break-words',
                            isUnread ? 'font-semibold dark:text-white' : 'font-medium'
                          )}
                        >
                          {title}
                        </p>
                        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 ml-1 font-normal">
                          {relativeTime}
                        </span>
                      </div>

                      {body && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed break-words">
                          {body}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          status={meta.isSecurity ? 'error' : 'default'}
                          variant="subtle"
                          size="md"
                        >
                          {language === 'bn' ? meta.groupLabelBn : meta.groupLabelEn}
                        </Badge>

                        {hasRoute && (
                          <span className="text-xs text-sky-600 dark:text-sky-400 font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                            {t.notifications.viewAction}
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {isUnread && (
                      <span
                        className="w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-900 shrink-0 mt-2"
                        aria-hidden="true"
                      />
                    )}
                  </ButtonBase>

                  {itemErrorIds.has(item.id) && (
                    <div
                      id={`notification-mark-read-error-${item.id}`}
                      role="alert"
                      className="mx-3.5 mb-3 flex items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-left dark:border-rose-900/60 dark:bg-rose-950/60"
                    >
                      <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-rose-700 dark:text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{t.notifications.errorMarkRead}</span>
                      </div>
                      <Button
                        type="button"
                        id={`notification-retry-mark-read-${item.id}`}
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleItemClick(item)}
                        disabled={markingItemIds.has(item.id)}
                        isLoading={markingItemIds.has(item.id)}
                        leftIcon={<RotateCcw />}
                      >
                        {t.notifications.retry}
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Popover Footer: Link to full /notifications page */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
            <Button
              type="button"
              id="notification-view-all-link"
              variant="ghost"
              size="md"
              fullWidth
              onClick={handleViewAll}
              rightIcon={<ArrowRight />}
            >
              {t.notifications.viewAll}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
