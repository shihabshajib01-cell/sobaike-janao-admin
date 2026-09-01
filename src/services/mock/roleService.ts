/**
 * Role Management Mock Service
 * Provides role definitions and assigned permissions.
 * Demo roles for Sobaike Admin RBAC foundation.
 */

import { Role } from '@/types/User';
import { MOCK_PERMISSIONS } from './permissionService';

export const MOCK_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    nameBn: 'অ্যাডমিন',
    description: 'Demo role: Full access to available admin modules',
    descriptionBn: 'ডেমো রোল: অ্যাডমিন মডিউলসমূহে পূর্ণ প্রবেশাধিকার',
    permissions: MOCK_PERMISSIONS.map((p) => p.id),
    isSystemDefault: true,
  },
  {
    id: 'moderator',
    name: 'Moderator',
    nameBn: 'মডারেটর',
    description: 'Demo role: Reviews and manages available content workflows',
    descriptionBn: 'ডেমো রোল: কনটেন্ট ও ওয়ার্কফ্লো পর্যালোচনা এবং পরিচালনার অনুমতি',
    permissions: [
      'complaints.view',
      'complaints.review',
      'feed.view',
      'feed.moderate',
      'feed.publish',
      'responses.view',
      'responses.review',
      'categories.view',
      'map.view',
    ],
    isSystemDefault: true,
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    nameBn: 'রিভিউয়ার',
    description: 'Demo role: Reviews complaints and related records',
    descriptionBn: 'ডেমো রোল: অভিযোগ এবং সংশ্লিষ্ট রেকর্ড পর্যালোচনা',
    permissions: [
      'complaints.view',
      'complaints.review',
      'responses.view',
      'categories.view',
      'map.view',
    ],
    isSystemDefault: true,
  },
  {
    id: 'auditor',
    name: 'Auditor',
    nameBn: 'অডিটর',
    description: 'Demo role: Views system records and activity history',
    descriptionBn: 'ডেমো রোল: সিস্টেম রেকর্ড এবং কার্যকলাপের ইতিহাস পর্যবেক্ষণ',
    permissions: [
      'complaints.view',
      'feed.view',
      'responses.view',
      'categories.view',
      'map.view',
      'users.view',
    ],
    isSystemDefault: true,
  },
];

export class RoleService {
  /**
   * Return all defined roles (Demo data)
   */
  async getRoles(): Promise<Role[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [...MOCK_ROLES];
  }

  /**
   * Get single role by ID or name
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const role = MOCK_ROLES.find(
      (r) => r.id.toLowerCase() === roleId.toLowerCase() || r.name.toLowerCase() === roleId.toLowerCase()
    );
    return role ? { ...role } : null;
  }

  /**
   * Return permission objects associated with a specific role
   */
  async getPermissionsForRole(roleId: string) {
    const role = await this.getRoleById(roleId);
    if (!role) return [];
    return MOCK_PERMISSIONS.filter((p) => role.permissions.includes(p.id));
  }
}

export const mockRoleService = new RoleService();
export default mockRoleService;
