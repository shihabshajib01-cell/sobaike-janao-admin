import React from 'react';
import {
  LayoutDashboard,
  AlertCircle,
  MessageSquare,
  FolderTree,
  MapPin,
  MapPinned,
  ShieldCheck,
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
    path: '/roles',
    labelKey: 'roles',
    defaultLabel: 'Roles & Permissions',
    icon: ShieldCheck,
  },
];
