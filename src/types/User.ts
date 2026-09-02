/**
 * User & Permission Foundation Types
 * Prepares authorization and actor identity data structures for admin operations.
 */

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export type AdminRole = 'admin' | 'moderator' | 'reviewer' | 'auditor';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole | string;
  status?: UserStatus;
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: string;
  avatar?: string;
  lastActive?: string;
  createdAt: string;
}

export interface Permission {
  id: string;
  module: 'complaints' | 'responses' | 'categories' | 'map' | string;
  action: string;
  name: string;
  nameBn?: string;
  description: string;
  descriptionBn?: string;
}

export interface Role {
  id: string;
  name: string;
  nameBn?: string;
  description?: string;
  descriptionBn?: string;
  permissions?: string[] | Permission[];
  usersCount?: number;
  isSystem?: boolean;
}

export interface UserFilterState {
  search: string;
  role?: string;
  status?: string;
}
