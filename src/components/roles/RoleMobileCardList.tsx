import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { RoleListItem } from '@/types/Role';
import { Shield, KeyRound, Users, Calendar } from 'lucide-react';

export interface RoleMobileCardListProps {
  roles: RoleListItem[];
}

export const RoleMobileCardList: React.FC<RoleMobileCardListProps> = ({ roles }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const formatNumber = (num: number): string => {
    if (!isBn) return num.toLocaleString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString()
      .split('')
      .map((d) => (/[0-9]/.test(d) ? bnDigits[parseInt(d, 10)] : d))
      .join('');
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-3">
      {roles.map((role) => {
        const displayName = isBn ? role.name_bn || role.name_en : role.name_en;

        return (
          <Card
            key={role.id}
            className="border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <CardContent className="p-4 space-y-3">
              {/* Header: Title + Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 p-1.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {displayName}
                      </h4>
                      {role.is_system && (
                        <Badge size="sm" variant="subtle" status="info">
                          {isBn ? 'সিস্টেম' : 'System'}
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>

                <Badge
                  size="sm"
                  status={role.active ? 'success' : 'default'}
                  dot
                  className="shrink-0"
                >
                  {role.active
                    ? isBn
                      ? 'সক্রিয়'
                      : 'Active'
                    : isBn
                    ? 'নিষ্ক্রিয়'
                    : 'Inactive'}
                </Badge>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>
                    {formatNumber(role.permission_count)}{' '}
                    <span className="text-slate-500 dark:text-slate-400">
                      {isBn
                        ? 'টি অনুমতি'
                        : role.permission_count === 1
                        ? 'permission'
                        : 'permissions'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>
                    {formatNumber(role.assigned_user_count)}{' '}
                    <span className="text-slate-500 dark:text-slate-400">
                      {isBn
                        ? 'জন ব্যবহারকারী'
                        : role.assigned_user_count === 1
                        ? 'user'
                        : 'users'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Created Date */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>{isBn ? 'তৈরির তারিখ:' : 'Created:'}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(role.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RoleMobileCardList;
