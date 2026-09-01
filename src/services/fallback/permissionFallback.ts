/**
 * Permission Fallback Service
 */

import { Permission, User } from '@/types/User';
import { Complaint } from '@/types/Complaint';
import {
  mockPermissionService,
  AdminRole,
  AdminUser,
  CURRENT_ADMIN_USER,
} from '@/services/mock/permissionService';

export const permissionFallback = {
  getPermissions(): Promise<Permission[]> {
    return mockPermissionService.getPermissions();
  },

  getCurrentUser(): AdminUser {
    return CURRENT_ADMIN_USER;
  },

  can(user: User | AdminUser | null | undefined, permissionId: string): boolean {
    return mockPermissionService.can(user, permissionId);
  },

  canEditComplaint(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    return mockPermissionService.canEditComplaint(user, complaint);
  },

  canReject(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    return mockPermissionService.canReject(user, complaint);
  },

  canPublish(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    return mockPermissionService.canPublish(user, complaint);
  },

  canAddUpdate(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    return mockPermissionService.canAddUpdate(user, complaint);
  },
};

export default permissionFallback;
export { type AdminRole, type AdminUser, CURRENT_ADMIN_USER };

