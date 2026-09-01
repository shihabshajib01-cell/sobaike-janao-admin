/**
 * User, Role & Permission Foundation Types
 * Prepares user directory and RBAC data structures for admin operations.
 */

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: string; // role ID or name reference (e.g., 'admin', 'moderator', 'reviewer')
  avatar?: string;
  lastActive?: string; // ISO date string
  createdAt: string; // ISO date string
}

export interface Role {
  id: string;
  name: string;
  nameBn?: string;
  description: string;
  descriptionBn?: string;
  permissions: string[]; // List of permission IDs (e.g., ['complaints.view', 'complaints.approve'])
  isSystemDefault?: boolean;
}

export interface Permission {
  id: string; // e.g. 'complaints.approve'
  module: 'complaints' | 'feed' | 'responses' | 'categories' | 'map' | 'users' | string;
  action: string; // e.g. 'view', 'review', 'approve', 'publish'
  name: string;
  nameBn?: string;
  description: string;
  descriptionBn?: string;
}

export interface UserFilterState {
  search: string;
  role: string;
  status: string;
  page?: number;
  limit?: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;
}
