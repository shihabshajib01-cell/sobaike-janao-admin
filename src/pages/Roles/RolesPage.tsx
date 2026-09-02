import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import { roleApi } from '@/services/api';
import { RoleListItem } from '@/types/Role';
import {
  RoleTable,
  RoleMobileCardList,
  RoleEmptyState,
  RoleLoadingSkeleton,
} from '@/components/roles';
import {
  RefreshCw,
  Plus,
  RotateCcw,
  ShieldAlert,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { cn } from '@/utils';

export const RolesPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Data & loading states
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; isPermissionDenied: boolean } | null>(null);

  /**
   * Fetch administrative roles exclusively via RPC `admin_list_roles`
   */
  const loadRoles = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await roleApi.listRoles();
      setRoles(data);
    } catch (err: any) {
      console.error('Error fetching role list:', err);
      const isPermissionDenied =
        err?.code === '42501' ||
        err?.message?.includes('42501') ||
        err?.message?.includes('Access denied') ||
        err?.message?.includes('Role management authorization required');

      setError({
        message: err?.message || 'Failed to load roles',
        isPermissionDenied: Boolean(isPermissionDenied),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleRefresh = () => {
    loadRoles(true);
  };

  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 min-w-0 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title={isBn ? 'ভূমিকা ও অনুমতি' : 'Roles & Permissions'}
        description={
          isBn
            ? 'প্রশাসনিক ভূমিকা এবং তাদের সিস্টেমের অনুমতি পরিচালনা করুন।'
            : 'Manage administrative roles and their system permissions.'
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              id="refresh-roles-btn"
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              leftIcon={
                <RefreshCw
                  className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')}
                />
              }
              aria-label="Refresh role list"
            >
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </Button>

            <Button
              id="header-create-role-btn"
              variant="primary"
              size="sm"
              disabled
              aria-disabled="true"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              title={
                isBn
                  ? 'ভূমিকা তৈরি করার প্রক্রিয়া পরবর্তী ধাপে চালু হবে'
                  : 'Create Role workflow will be enabled in the upcoming phase'
              }
              className="cursor-not-allowed opacity-60"
            >
              <span>{isBn ? 'ভূমিকা তৈরি করুন' : 'Create Role'}</span>
            </Button>
          </div>
        }
      />

      {/* 2. Error State */}
      {error && (
        <div
          role="alert"
          className={cn(
            'p-8 rounded-2xl border text-center space-y-3.5 max-w-2xl mx-auto my-6',
            error.isPermissionDenied
              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
              : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center mx-auto',
              error.isPermissionDenied
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
            )}
          >
            {error.isPermissionDenied ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <h3
              className={cn(
                'text-base font-semibold',
                error.isPermissionDenied
                  ? 'text-amber-900 dark:text-amber-200'
                  : 'text-rose-900 dark:text-rose-200'
              )}
            >
              {error.isPermissionDenied
                ? isBn
                  ? 'অনুমতি প্রয়োজন'
                  : 'Permission Required'
                : isBn
                ? 'তথ্য লোড করা যায়নি'
                : 'Failed to load roles'}
            </h3>

            <p
              className={cn(
                'text-xs sm:text-sm max-w-md mx-auto leading-relaxed',
                error.isPermissionDenied
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-rose-700 dark:text-rose-300'
              )}
            >
              {error.isPermissionDenied
                ? isBn
                  ? 'আপনার ভূমিকা ও অনুমতি এক্সেস করার অনুমতি নেই।'
                  : 'You do not have permission to access Roles & Permissions.'
                : isBn
                ? 'ভূমিকার তথ্য লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
                : 'Could not load administrative roles. Please check your connection and retry.'}
            </p>
          </div>

          <div className="pt-2">
            <Button
              id="retry-roles-btn"
              variant="secondary"
              size="sm"
              onClick={() => loadRoles()}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className={cn(
                'mx-auto shadow-xs',
                error.isPermissionDenied
                  ? 'border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-100/50 dark:hover:bg-amber-900/40'
                  : 'border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 hover:bg-rose-100/50 dark:hover:bg-rose-900/40'
              )}
            >
              <span>{isBn ? 'আবার চেষ্টা করুন' : 'Retry'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Loading Skeleton */}
      {loading && !error && <RoleLoadingSkeleton />}

      {/* 4. Production Empty State (when 0 roles exist) */}
      {!loading && !error && roles.length === 0 && <RoleEmptyState />}

      {/* 5. Populated Roles List (Desktop Table + Mobile Cards) */}
      {!loading && !error && roles.length > 0 && (
        <div className="space-y-3">
          {/* Result Count Banner */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {isBn
                ? `মোট ${formatNumber(roles.length)} টি ভূমিকা তৈরি আছে`
                : `Showing ${roles.length} total ${roles.length === 1 ? 'role' : 'roles'}`}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <RoleTable roles={roles} />
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden">
            <RoleMobileCardList roles={roles} />
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
