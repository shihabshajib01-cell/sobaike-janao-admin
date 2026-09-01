import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { AuditLogFilters, AuditModule } from '@/types/AuditLog';
import { useLanguage } from '@/context/LanguageContext';

export interface AuditFiltersProps {
  filters: AuditLogFilters;
  onChange: (filters: AuditLogFilters) => void;
  onReset: () => void;
  totalResults?: number;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  filters,
  onChange,
  onReset,
  totalResults,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim().length > 0) ||
      (filters.module && filters.module !== 'all') ||
      (filters.action && filters.action !== 'all') ||
      (filters.dateRange && filters.dateRange !== 'all')
  );

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Search Query */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Input
            placeholder={
              isBn ? 'লগ আইডি, বিবরণ, অ্যাক্টর খুঁজুন...' : 'Search logs, ID, actor, entity...'
            }
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            className="h-9 text-xs"
          />
        </div>

        {/* 2. Module Selector */}
        <div>
          <Select
            value={filters.module || 'all'}
            onChange={(e) =>
              onChange({
                ...filters,
                module: e.target.value as AuditModule | 'all',
              })
            }
            className="h-9 text-xs"
          >
            <option value="all">{isBn ? 'সকল মডিউল' : 'All Modules'}</option>
            <option value="complaints">{isBn ? 'অভিযোগ (Complaints)' : 'Complaints'}</option>
            <option value="feed">{isBn ? 'পাবলিক ফিড (Feed)' : 'Public Feed'}</option>
            <option value="responses">{isBn ? 'প্রতিক্রিয়া (Responses)' : 'Responses'}</option>
            <option value="categories">{isBn ? 'বিভাগসমূহ (Categories)' : 'Categories'}</option>
            <option value="users">{isBn ? 'ব্যবহারকারী (Users)' : 'Users'}</option>
            <option value="system">{isBn ? 'সিস্টেম (System)' : 'System'}</option>
          </Select>
        </div>

        {/* 3. Action Selector */}
        <div>
          <Select
            value={filters.action || 'all'}
            onChange={(e) =>
              onChange({
                ...filters,
                action: e.target.value,
              })
            }
            className="h-9 text-xs"
          >
            <option value="all">{isBn ? 'সকল অ্যাকশন' : 'All Actions'}</option>
            <option value="approve">{isBn ? 'অনুমোদন (Approve)' : 'Approve'}</option>
            <option value="reject">{isBn ? 'বাতিল (Reject)' : 'Reject'}</option>
            <option value="publish">{isBn ? 'প্রকাশ (Publish)' : 'Publish'}</option>
            <option value="resolve">{isBn ? 'সমাধান (Resolve)' : 'Resolve'}</option>
            <option value="status_change">{isBn ? 'স্ট্যাটাস পরিবর্তন (Status)' : 'Status Change'}</option>
            <option value="role_change">{isBn ? 'রোল পরিবর্তন (Role)' : 'Role Change'}</option>
            <option value="update">{isBn ? 'হালনাগাদ (Update)' : 'Update'}</option>
            <option value="deactivate">{isBn ? 'নিষ্ক্রিয় (Deactivate)' : 'Deactivate'}</option>
            <option value="export">{isBn ? 'এক্সপোর্ট (Export)' : 'Export'}</option>
          </Select>
        </div>

        {/* 4. Date Range Selector */}
        <div>
          <Select
            value={filters.dateRange || 'all'}
            onChange={(e) =>
              onChange({
                ...filters,
                dateRange: e.target.value as AuditLogFilters['dateRange'],
              })
            }
            className="h-9 text-xs"
          >
            <option value="all">{isBn ? 'সর্বকাল (All Time)' : 'All Time'}</option>
            <option value="today">{isBn ? 'আজকের লগ (Today)' : 'Today'}</option>
            <option value="7days">{isBn ? 'বিগত ৭ দিন (Last 7 Days)' : 'Last 7 Days'}</option>
            <option value="30days">{isBn ? 'বিগত ৩০ দিন (Last 30 Days)' : 'Last 30 Days'}</option>
          </Select>
        </div>
      </div>

      {/* Filter Stats & Reset Toolbar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {isBn ? 'মোট ফলাফল:' : 'Found:'}{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {totalResults !== undefined ? totalResults : 0}
            </strong>{' '}
            {isBn ? 'টি লগ এন্ট্রি' : 'log entries'}
          </span>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="w-3 h-3 text-slate-400" />}
            className="text-xs h-7 px-2 text-slate-600 dark:text-slate-400"
          >
            {isBn ? 'ফিল্টার মুছুন' : 'Clear Filters'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AuditFilters;
