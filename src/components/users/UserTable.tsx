import React from 'react';
import { Eye, Shield, Calendar, Clock, User as UserIcon } from 'lucide-react';
import { User, Role } from '@/types/User';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { UserStatusBadge } from './UserStatusBadge';
import { UserEmptyState } from './UserEmptyState';
import { MobileUserCardList } from './MobileUserCardList';
import { useLanguage } from '@/context/LanguageContext';

export interface UserTableProps {
  users: User[];
  roles: Role[];
  selectedUser?: User | null;
  onSelectUser: (user: User) => void;
  hasFilters?: boolean;
  onResetFilters?: () => void;
  isLoading?: boolean;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  roles,
  selectedUser,
  onSelectUser,
  hasFilters = false,
  onResetFilters,
  isLoading = false,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  if (!isLoading && users.length === 0) {
    return <UserEmptyState hasFilters={hasFilters} onResetFilters={onResetFilters} />;
  }

  const getRoleDisplayName = (roleId: string) => {
    const r = roles.find(
      (item) => item.id.toLowerCase() === roleId.toLowerCase() || item.name.toLowerCase() === roleId.toLowerCase()
    );
    if (r) {
      return isBn ? r.nameBn || r.name : r.name;
    }
    return roleId.charAt(0).toUpperCase() + roleId.slice(1);
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) {
      return isBn ? 'কখনও নয়' : 'Never';
    }
    const d = new Date(dateString);
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCreatedDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table View */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">{isBn ? 'নাম ও আইডি' : 'Name'}</TableHead>
              <TableHead className="w-[200px]">{isBn ? 'ইমেইল' : 'Email'}</TableHead>
              <TableHead className="w-[130px]">{isBn ? 'রোল' : 'Role'}</TableHead>
              <TableHead className="w-[120px]">{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
              <TableHead className="w-[160px]">{isBn ? 'সর্বশেষ সক্রিয়' : 'Last Active'}</TableHead>
              <TableHead className="w-[130px]">{isBn ? 'যোগদানের তারিখ' : 'Created Date'}</TableHead>
              <TableHead className="w-[90px] text-right">{isBn ? 'অ্যাকশন' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelected = selectedUser?.id === user.id;

              return (
                <TableRow
                  key={user.id}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50/70 dark:bg-sky-950/20'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                  onClick={() => onSelectUser(user)}
                >
                  {/* Name + Avatar */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-xs border border-slate-200 dark:border-slate-700 shrink-0">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {user.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate block max-w-[190px]">
                      {user.email}
                    </span>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      <Shield className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>{getRoleDisplayName(user.role)}</span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <UserStatusBadge status={user.status} />
                  </TableCell>

                  {/* Last Active */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{formatLastActive(user.lastActive)}</span>
                    </div>
                  </TableCell>

                  {/* Created Date */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatCreatedDate(user.createdAt)}</span>
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUser(user);
                      }}
                      leftIcon={<Eye className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                      className="text-xs"
                    >
                      {isBn ? 'দেখুন' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="sm:hidden">
        <MobileUserCardList
          users={users}
          roles={roles}
          selectedUser={selectedUser}
          onSelectUser={onSelectUser}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default UserTable;
