/**
 * User Fallback Service
 */

import { User, UserFilterState, UserStats } from '@/types/User';
import { mockUserService } from '@/services/mock/userService';

export const userFallback = {
  getUsers(params: Partial<UserFilterState> = {}): Promise<{
    users: User[];
    total: number;
  }> {
    return mockUserService.getUsers(params);
  },

  getUserById(id: string): Promise<User | null> {
    return mockUserService.getUserById(id);
  },

  getUserStats(): Promise<UserStats> {
    return mockUserService.getUserStats();
  },
};

export default userFallback;
