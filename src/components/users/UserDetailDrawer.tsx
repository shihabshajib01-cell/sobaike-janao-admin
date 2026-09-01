import React, { useState, useEffect } from 'react';
import {
  Shield,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  History,
  Activity,
  User as UserIcon,
} from 'lucide-react';
import { User, Role, Permission } from '@/types/User';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { UserStatusBadge } from './UserStatusBadge';
import { permissionApi } from '@/services/api';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/utils';

export interface UserDetailDrawerProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  user,
  isOpen,
  onClose,
  roles,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [mobileTab, setMobileTab] = useState<'overview' | 'permissions' | 'activity'>('overview');

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMobileTab('overview');
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    permissionApi.getPermissions().then(setAllPermissions);
  }, []);

  if (!user) return null;

  const currentRole = roles.find(
    (r) =>
      r.id.toLowerCase() === user.role.toLowerCase() ||
      r.name.toLowerCase() === user.role.toLowerCase()
  );

  const roleName = currentRole
    ? isBn
      ? currentRole.nameBn || currentRole.name
      : currentRole.name
    : user.role;

  const roleDescription = currentRole
    ? isBn
      ? currentRole.descriptionBn || currentRole.description
      : currentRole.description
    : isBn
    ? 'কাস্টম রোল নির্ধারণ'
    : 'Custom assigned role';

  // Group permissions by module
  const modules = Array.from(new Set(allPermissions.map((p) => p.module)));

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return isBn ? 'কখনও সক্রিয় হননি' : 'Never logged in';
    return new Date(dateString).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const overviewSection = (
    <div className="space-y-4">
      {/* 1. Header Profile & Status Summary Card */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-xs"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-base border border-sky-200 dark:border-sky-800">
              {user.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user.name}
              </h4>
              <UserStatusBadge status={user.status} size="sm" />
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              ID: {user.id}
            </p>
          </div>
        </div>
      </div>

      {/* 2. User Information Section */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'ব্যবহারকারীর বিবরণ' : 'User Information'}
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block">{isBn ? 'অফিসিয়াল ইমেইল' : 'Email Address'}</span>
              <span className="font-mono text-slate-900 dark:text-slate-100 truncate block">{user.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">{isBn ? 'যোগদানের তারিখ' : 'Registration Date'}</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatDateTime(user.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">{isBn ? 'সর্বশেষ অ্যাক্টিভিটি' : 'Last Session'}</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatDateTime(user.lastActive)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block">{isBn ? 'বর্তমান ভূমিকা' : 'Assigned Role'}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{roleName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const permissionsSection = (
    <div className="space-y-4">
      {/* 3. Assigned Role Foundation */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isBn ? 'অ্যাসাইনকৃত রোল ও সুযোগ' : 'Role Scope'}
        </h5>
        <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/60 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-semibold text-sky-900 dark:text-sky-200">
                {roleName}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-medium">
              {user.role.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {roleDescription}
          </p>
        </div>
      </div>

      {/* 4. Permission Summary Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isBn ? 'পারমিশন ম্যাট্রিক্স' : 'Permission Matrix'}
          </h5>
          <span className="text-[11px] text-slate-400">
            {isBn ? 'রোল অনুযায়ী সক্রিয় অনুমতি' : 'Derived from role'}
          </span>
        </div>

        <div className="space-y-2.5">
          {modules.map((mod) => {
            const modulePerms = allPermissions.filter((p) => p.module === mod);

            return (
              <div
                key={mod}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold capitalize text-slate-800 dark:text-slate-200">
                    {mod}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {modulePerms.filter((p) => permissionApi.can(user, p.id)).length} / {modulePerms.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {modulePerms.map((perm) => {
                    const hasAccess = permissionApi.can(user, perm.id);

                    return (
                      <div
                        key={perm.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                          hasAccess
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                            : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                        title={perm.description}
                      >
                        {hasAccess ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span>{isBn ? perm.nameBn || perm.name : perm.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const activitySection = (
    <div className="space-y-3">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5" />
        {isBn ? 'সাম্প্রতিক কার্যক্রম' : 'Activity Summary'}
      </h5>

      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center space-y-2">
        <History className="w-5 h-5 text-slate-400 mx-auto" />
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {isBn ? 'অডিট লগ প্রস্তুত' : 'Audit Trail Prepared'}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          {isBn
            ? 'ব্যবহারকারীর ট্রায়াজ লগ এবং মডারেশন হিস্ট্রি অডিট মডিউলের মাধ্যমে সমন্বিত থাকবে।'
            : 'Triage actions, moderation timestamps, and workflow transitions logged by this user.'}
        </p>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={user.name}
      description={user.email}
      size="lg"
      mobileSheet={true}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            <span>{isBn ? 'আরবিএসি পলিসি সুরক্ষিত' : 'RBAC Policy Protected'}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </Button>
        </div>
      }
    >
      {/* Mobile Tab Header (<sm) */}
      <div className="sm:hidden -mt-1 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5">
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
            <UserIcon className="w-3.5 h-3.5" />
            <span>{isBn ? 'সারসংক্ষেপ' : 'Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('permissions')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[36px] cursor-pointer',
              mobileTab === 'permissions'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isBn ? 'অনুমতি' : 'Permissions'}</span>
          </button>

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
            <Activity className="w-3.5 h-3.5" />
            <span>{isBn ? 'কার্যক্রম' : 'Activity'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Body (<sm) */}
      <div className="sm:hidden">
        {mobileTab === 'overview' && overviewSection}
        {mobileTab === 'permissions' && permissionsSection}
        {mobileTab === 'activity' && activitySection}
      </div>

      {/* Desktop Stack (sm+) */}
      <div className="hidden sm:block space-y-6">
        {overviewSection}
        {permissionsSection}
        {activitySection}
      </div>
    </Drawer>
  );
};

export default UserDetailDrawer;
