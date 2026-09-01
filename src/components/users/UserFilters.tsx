import React from 'react';
import { RotateCcw, Filter } from 'lucide-react';
import { UserFilterState, Role } from '@/types/User';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { UserSearch } from './UserSearch';
import { useLanguage } from '@/context/LanguageContext';

export interface UserFiltersProps {
  filters: UserFilterState;
  roles: Role[];
  onFilterChange: (filters: Partial<UserFilterState>) => void;
  onResetFilters: () => void;
  className?: string;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  roles,
  onFilterChange,
  onResetFilters,
  className,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    (filters.role !== 'all' && Boolean(filters.role)) ||
    (filters.status !== 'all' && Boolean(filters.status));

  return (
    <div
      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 ${
        className || ''
      }`}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[240px]">
          <UserSearch
            value={filters.search}
            onChange={(search) => onFilterChange({ search })}
          />
        </div>

        {/* Role Filter */}
        <div className="w-full md:w-48">
          <Select
            value={filters.role || 'all'}
            onChange={(e) => onFilterChange({ role: e.target.value })}
            options={[
              { value: 'all', label: isBn ? 'সকল রোল (All Roles)' : 'All Roles' },
              ...roles.map((r) => ({
                value: r.id,
                label: isBn ? `${r.nameBn || r.name} (${r.name})` : r.name,
              })),
            ]}
            className="w-full text-xs"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-44">
          <Select
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            options={[
              { value: 'all', label: isBn ? 'সকল স্ট্যাটাস' : 'All Statuses' },
              { value: 'active', label: isBn ? 'সক্রিয় (Active)' : 'Active' },
              { value: 'pending', label: isBn ? 'অপেক্ষমাণ (Pending)' : 'Pending' },
              { value: 'inactive', label: isBn ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive' },
            ]}
            className="w-full text-xs"
          />
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
          >
            {isBn ? 'ফিল্টার মুছুন' : 'Reset'}
          </Button>
        )}
      </div>

      {/* Active Filters Summary Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
            <Filter className="w-3 h-3" />
            {isBn ? 'সক্রিয় ফিল্টারসমূহ:' : 'Active filters:'}
          </span>
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {isBn ? 'অনুসন্ধান:' : 'Search:'} <strong className="font-semibold">{filters.search}</strong>
            </span>
          )}
          {filters.role && filters.role !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
              {isBn ? 'রোল:' : 'Role:'} <strong className="capitalize">{filters.role}</strong>
            </span>
          )}
          {filters.status && filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
              {isBn ? 'স্ট্যাটাস:' : 'Status:'} <strong className="capitalize">{filters.status}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UserFilters;
