/**
 * Role Fallback Service
 */

import { Role, Permission } from '@/types/User';
import { mockRoleService } from '@/services/mock/roleService';

export const roleFallback = {
  getRoles(): Promise<Role[]> {
    return mockRoleService.getRoles();
  },

  getRoleById(id: string): Promise<Role | null> {
    return mockRoleService.getRoleById(id);
  },

  getPermissionsForRole(roleId: string): Promise<Permission[]> {
    return mockRoleService.getPermissionsForRole(roleId);
  },
};

export default roleFallback;
