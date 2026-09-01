import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  Clock,
  UserX,
  RefreshCw,
  Info,
} from 'lucide-react';
import { User, Role, UserFilterState, UserStats } from '@/types/User';
import { userApi, roleApi } from '@/services/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  UserTable,
  MobileUserCardList,
  UserFilters,
  UserDetailDrawer,
} from '@/components/users';
import { useLanguage } from '@/context/LanguageContext';

export const UsersPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    inactiveUsers: 0,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState<UserFilterState>({
    search: '',
    role: 'all',
    status: 'all',
  });

  // Load initial roles & stats
  useEffect(() => {
    const initData = async () => {
      try {
        const [fetchedRoles, fetchedStats] = await Promise.all([
          roleApi.getRoles(),
          userApi.getUserStats(),
        ]);
        setRoles(fetchedRoles);
        setStats(fetchedStats);
      } catch (err) {
        console.error('Failed to load roles and stats:', err);
      }
    };
    initData();
  }, []);

  // Fetch filtered users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await userApi.getUsers(filters);
      setUsers(res.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (newFilters: Partial<UserFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
    });
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title={isBn ? 'ব্যবহারকারী' : 'Users'}
        description={
          isBn
            ? 'অ্যাডমিন ব্যবহারকারী এবং অ্যাক্সেস অনুমতি পরিচালনা করুন।'
            : 'Manage admin users and access permissions.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchUsers}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              {isBn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddUserModalOpen(true)}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              {isBn ? 'নতুন ব্যবহারকারী যোগ' : 'Add User'}
            </Button>
          </div>
        }
      />

      {/* 2. User KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isBn ? 'মোট ব্যবহারকারী' : 'Total Users'}
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {stats.totalUsers}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Active Users */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {isBn ? 'সক্রিয় ব্যবহারকারী' : 'Active'}
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {stats.activeUsers}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {isBn ? 'অপেক্ষমাণ' : 'Pending'}
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {stats.pendingUsers}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Inactive */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {stats.inactiveUsers}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <UserX className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Search and Filters */}
      <UserFilters
        filters={filters}
        roles={roles}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* 4. Users Table & Mobile Card List */}
      <div className="hidden md:block">
        <UserTable
          users={users}
          roles={roles}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          hasFilters={
            Boolean(filters.search.trim()) ||
            filters.role !== 'all' ||
            filters.status !== 'all'
          }
          onResetFilters={handleResetFilters}
          isLoading={isLoading}
        />
      </div>

      <div className="md:hidden">
        <MobileUserCardList
          users={users}
          roles={roles}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          isLoading={isLoading}
        />
      </div>

      {/* 5. User Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        roles={roles}
      />

      {/* 6. Add User Placeholder Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title={isBn ? 'ব্যবহারকারী আমন্ত্রণ প্রস্তুত' : 'Add User Placeholder'}
        size="md"
        footer={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddUserModalOpen(false)}
          >
            {isBn ? 'বুঝেছি' : 'Understood'}
          </Button>
        }
      >
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 rounded-lg flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isBn
                ? 'এটি একটি আর্কিটেকচারাল প্লেসহোল্ডার। ব্যাকএন্ড অথেন্টিকেশন এবং আইডেন্টিটি প্রভাইডার সংযুক্তির পর সরাসরি ইউজার ইনভাইটেশন চালু হবে।'
                : 'This is an architectural placeholder. Real user provisioning will be activated when backend authentication and identity services are connected.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              {isBn ? 'প্রস্তুতকৃত ডেমো রোলসমূহ:' : 'Configured Demo Roles:'}
            </h5>
            <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
              <li><strong>Admin:</strong> {isBn ? 'পূর্ণ প্রশাসনিক নিয়ন্ত্রণ' : 'Full access across all modules'}</li>
              <li><strong>Moderator:</strong> {isBn ? 'অভিযোগ ও ফিড মডারেশন' : 'Complaint review, content moderation & publishing'}</li>
              <li><strong>Reviewer:</strong> {isBn ? 'অভিযোগ ও ম্যাপ পর্যবেক্ষণ' : 'Complaint review & geospatial monitoring'}</li>
              <li><strong>Auditor:</strong> {isBn ? 'পর্যবেক্ষণ ও নিরীক্ষা' : 'Read-only audit & monitoring access'}</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
