import React from 'react';
import { User, Role } from '@/types/User';
import { useLanguage } from '@/context/LanguageContext';
import { Card } from '@/components/ui/Card';
import { UserStatusBadge } from './UserStatusBadge';
import { Shield, Calendar, Clock, User as UserIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';

export interface MobileUserCardListProps {
  users: User[];
  roles: Role[];
  selectedUser?: User | null;
  onSelectUser: (user: User) => void;
  isLoading?: boolean;
  className?: string;
}

export const MobileUserCardList: React.FC<MobileUserCardListProps> = ({
  users,
  roles,
  selectedUser,
  onSelectUser,
  isLoading = false,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const getRoleDisplayName = (roleId: string) => {
    const r = roles.find(
      (item) => item.id.toLowerCase() === roleId.toLowerCase() || item.name.toLowerCase() === roleId.toLowerCase()
    );
    if (r) {
      return isBn ? r.nameBn || r.name : r.name;
    }
    return roleId.charAt(0).toUpperCase() + roleId.slice(1);
  };

  const formatCreatedDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) {
      return isBn ? 'কখনও নয়' : 'Never';
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 space-y-3 animate-pulse border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
        <p>{isBn ? 'কোনো ব্যবহারকারী পাওয়া যায়নি' : 'No users found'}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {users.map((user) => {
        const isSelected = selectedUser?.id === user.id;

        return (
          <Card
            key={user.id}
            variant="default"
            padding="none"
            onClick={() => onSelectUser(user)}
            className={cn(
              'w-full text-left transition-all overflow-hidden border border-slate-200 dark:border-slate-800',
              'hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.99] cursor-pointer',
              isSelected && 'ring-1 ring-sky-500 border-sky-500 dark:border-sky-500 bg-sky-50/20'
            )}
          >
            <div className="p-4 space-y-2.5">
              {/* Header: User avatar + Name + Status badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-xs border border-slate-200 dark:border-slate-700 shrink-0">
                      {user.name.charAt(0) || <UserIcon className="w-4 h-4" />}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {user.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <UserStatusBadge status={user.status} />
                </div>
              </div>

              {/* User ID and Role */}
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                  <Shield className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="truncate">{getRoleDisplayName(user.role)}</span>
                </div>

                <span className="font-mono text-[11px] text-slate-400">
                  {user.id}
                </span>
              </div>

              {/* Meta Row: Created date + Last Active */}
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{formatCreatedDate(user.createdAt)}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{formatLastActive(user.lastActive)}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileUserCardList;
