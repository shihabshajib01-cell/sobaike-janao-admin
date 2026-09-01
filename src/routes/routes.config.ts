import React from 'react';
import {
  LayoutDashboard,
  AlertCircle,
  Rss,
  MessageSquare,
  FolderTree,
  MapPin,
  MapPinned,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { TranslationDictionary } from '@/context/LanguageContext';

export interface RouteItem {
  path: string;
  labelKey: keyof TranslationDictionary['nav'];
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  exact?: boolean;
}

export const ADMIN_NAVIGATION_ITEMS: RouteItem[] = [
  {
    path: '/dashboard',
    labelKey: 'dashboard',
    defaultLabel: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/complaints',
    labelKey: 'complaints',
    defaultLabel: 'Complaints',
    icon: AlertCircle,
  },
  {
    path: '/feed',
    labelKey: 'feed',
    defaultLabel: 'Public Feed',
    icon: Rss,
  },
  {
    path: '/responses',
    labelKey: 'responses',
    defaultLabel: 'Responses',
    icon: MessageSquare,
  },
  {
    path: '/categories',
    labelKey: 'categories',
    defaultLabel: 'Categories',
    icon: FolderTree,
  },
  {
    path: '/map',
    labelKey: 'map',
    defaultLabel: 'Map Monitoring',
    icon: MapPin,
  },
  {
    path: '/location-activity',
    labelKey: 'locationActivity',
    defaultLabel: 'Location Activity',
    icon: MapPinned,
  },
  {
    path: '/users',
    labelKey: 'users',
    defaultLabel: 'Users',
    icon: Users,
  },
  {
    path: '/analytics',
    labelKey: 'analytics',
    defaultLabel: 'Analytics',
    icon: BarChart3,
  },
  {
    path: '/audit-logs',
    labelKey: 'auditLogs',
    defaultLabel: 'Audit Logs',
    icon: ShieldCheck,
  },
  {
    path: '/settings',
    labelKey: 'settings',
    defaultLabel: 'Settings',
    icon: Settings,
  },
];
