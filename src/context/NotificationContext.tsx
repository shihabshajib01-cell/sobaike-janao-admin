import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AdminNotification } from '@/types/Notification';
import { notificationApi } from '@/services/api/notificationApi';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface NotificationContextType {
  unreadCount: number;
  recentNotifications: AdminNotification[];
  isLoadingRecent: boolean;
  recentError: string | null;
  notificationRevision: number;
  refreshUnreadCount: () => Promise<number>;
  refreshRecent: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<number>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const REALTIME_REFRESH_DEBOUNCE_MS = 200;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<AdminNotification[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState<boolean>(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [notificationRevision, setNotificationRevision] = useState<number>(0);

  const isMountedRef = useRef<boolean>(true);
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Safe fetch of unread notification count.
   * Under no circumstances will this crash the Header or user interface.
   */
  const refreshUnreadCount = useCallback(async (): Promise<number> => {
    if (!isAdmin) {
      if (isMountedRef.current) setUnreadCount(0);
      return 0;
    }

    try {
      const count = await notificationApi.getUnreadCount();
      if (isMountedRef.current) {
        setUnreadCount(Number.isFinite(count) ? Math.max(0, count) : 0);
      }
      return count;
    } catch (err) {
      console.warn('Silent non-fatal error fetching notification unread count:', err);
      // Preserve and return the last known count. A transport error is not "0 unread".
      return unreadCount;
    }
  }, [isAdmin, unreadCount]);

  /**
   * Refreshes the recent 8 notifications (for Header bell dropdown) and updates unread count.
   */
  const refreshRecent = useCallback(async (): Promise<void> => {
    if (!isAdmin) {
      if (isMountedRef.current) {
        setRecentNotifications([]);
        setUnreadCount(0);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoadingRecent(true);
      setRecentError(null);
    }

    try {
      const [listResult, countResult] = await Promise.allSettled([
        notificationApi.listNotifications({ limit: 8 }),
        notificationApi.getUnreadCount(),
      ]);

      if (!isMountedRef.current) return;

      if (listResult.status === 'fulfilled') {
        setRecentNotifications(listResult.value);
      } else {
        console.error('Failed to refresh recent notifications:', listResult.reason);
        setRecentError(listResult.reason instanceof Error ? listResult.reason.message : 'Failed to load notifications');
      }

      if (countResult.status === 'fulfilled') {
        const count = countResult.value;
        setUnreadCount(Number.isFinite(count) ? Math.max(0, count) : 0);
      } else {
        console.warn('Failed to refresh notification unread count:', countResult.reason);
      }
    } catch (err: unknown) {
      console.error('Failed to refresh recent notifications:', err);
      if (isMountedRef.current) {
        setRecentError(err instanceof Error ? err.message : 'Failed to load notifications');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingRecent(false);
      }
    }
  }, [isAdmin]);

  /**
   * Marks an individual notification as read optimistically.
   */
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!notificationId) return false;

    // Optimistic state update
    const previousRecent = [...recentNotifications];
    const previousUnreadCount = unreadCount;

    setRecentNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );

    const wasUnread = previousRecent.some((n) => n.id === notificationId && !n.read_at);
    if (wasUnread) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    try {
      const success = await notificationApi.markAsRead(notificationId);
      if (!success) {
        // Revert on failure
        setRecentNotifications(previousRecent);
        setUnreadCount(previousUnreadCount);
        return false;
      }
      if (!wasUnread && isMountedRef.current) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      try {
        const authoritativeCount = await notificationApi.getUnreadCount();
        if (isMountedRef.current && Number.isFinite(authoritativeCount)) {
          setUnreadCount(Math.max(0, authoritativeCount));
        }
      } catch (countError) {
        console.warn('Failed to reconcile notification unread count:', countError);
      }

      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert on exception
      setRecentNotifications(previousRecent);
      setUnreadCount(previousUnreadCount);
      return false;
    }
  }, [recentNotifications, unreadCount]);

  /**
   * Marks all notifications as read optimistically.
   */
  const markAllAsRead = useCallback(async (): Promise<number> => {
    const previousRecent = [...recentNotifications];
    const previousUnreadCount = unreadCount;
    const nowIso = new Date().toISOString();

    setRecentNotifications((prev) =>
      prev.map((n) => (!n.read_at ? { ...n, read_at: nowIso } : n))
    );
    setUnreadCount(0);

    try {
      const affectedCount = await notificationApi.markAllAsRead();
      return affectedCount;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert on exception
      setRecentNotifications(previousRecent);
      setUnreadCount(previousUnreadCount);
      throw err;
    }
  }, [recentNotifications, unreadCount]);

  // Initial load when active admin state changes
  useEffect(() => {
    if (isAdmin) {
      void refreshRecent();
    } else {
      setUnreadCount(0);
      setRecentNotifications([]);
    }
  }, [isAdmin, refreshRecent]);

  // Real-time Postgres Changes Subscription under existing RLS (Section 5)
  useEffect(() => {
    if (!isAdmin || !user?.id || !isSupabaseConfigured) {
      return;
    }

    const channelName = `admin_notifications_${user.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          // Row-level UPDATE bursts (for example, mark-all-read) are coalesced into
          // one authoritative refresh instead of one refresh per notification row.
          if (realtimeRefreshTimerRef.current) {
            clearTimeout(realtimeRefreshTimerRef.current);
          }

          realtimeRefreshTimerRef.current = setTimeout(() => {
            realtimeRefreshTimerRef.current = null;
            if (!isMountedRef.current) return;

            setNotificationRevision((revision) => revision + 1);
            void refreshRecent();
          }, REALTIME_REFRESH_DEBOUNCE_MS);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected cleanly
        }
      });

    return () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, user?.id, refreshRecent]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        isLoadingRecent,
        recentError,
        notificationRevision,
        refreshUnreadCount,
        refreshRecent,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
