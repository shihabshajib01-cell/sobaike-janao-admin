import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { ADMIN_NAVIGATION_ITEMS } from '@/routes/routes.config';
import { authService } from '@/services/auth/authService';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import {
  Menu,
  Bell,
  Search,
  User as UserIcon,
  ChevronDown,
  LogOut,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils';

export interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AdminHeader: React.FC<HeaderProps> = ({
  onToggleSidebar,
}) => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    await authService.logout();
    setProfileOpen(false);
    navigate('/login');
  };

  // Determine current active page label
  const currentNav = ADMIN_NAVIGATION_ITEMS.find((item) =>
    location.pathname.startsWith(item.path)
  );
  const currentTitle = currentNav ? t.nav[currentNav.labelKey] : 'Overview';

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 w-full shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left side: Mobile Toggle & Page Title / Quick Search */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current Context / Breadcrumb indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline-block text-xs font-medium text-slate-400 dark:text-slate-500">
            Sobai Ke Janao
          </span>
          <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">/</span>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {currentTitle}
          </h2>
        </div>

        {/* Quick Search Bar Placeholder */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 text-xs w-64 border border-transparent dark:border-slate-800/60 ml-4 focus-within:border-sky-500 transition-all">
          <Search className="w-3.5 h-3.5" />
          <input
            type="text"
            placeholder={t.header.searchPlaceholder}
            className="bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 w-full"
            disabled
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side: Controls (Lang, Theme, Notifs, Profile) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Language Switcher */}
        <LanguageToggle />

        {/* Theme Mode Toggle */}
        <ThemeToggle />

        {/* Notifications Dropdown Placeholder */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className={cn(
              'relative p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
              notificationsOpen && 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            )}
            aria-label={t.header.notifications}
            aria-expanded={notificationsOpen}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {/* Notifications Popover Skeleton */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 text-left">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {t.header.notifications}
                </span>
                <Badge status="info" size="sm" variant="subtle">
                  3 New
                </Badge>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      High urgency road hazard in Ward 12
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">5 mins ago</p>
                  </div>
                </div>
                <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      WASA sanitation response published
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">28 mins ago</p>
                  </div>
                </div>
                <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      System backup completed successfully
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">2 hours ago</p>
                  </div>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Notification Center • Phase 3 Shell
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

        {/* User Profile Dropdown Placeholder */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 text-left"
            aria-label="User profile menu"
            aria-expanded={profileOpen}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              SO
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {t.header.operator}
              </div>
              <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium leading-tight">
                {t.header.superadmin}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block ml-0.5" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 text-left">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {t.header.operator}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  superadmin@sobaike.gov.bd
                </p>
              </div>

              <div className="py-1 text-xs text-slate-700 dark:text-slate-300">
                <button
                  type="button"
                  className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Security & Roles</span>
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Public Portal</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.header.signOut}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
