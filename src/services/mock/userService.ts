/**
 * User Management Mock Service
 * Provides minimal admin user records, filtered querying, and statistics.
 * API-ready architecture with pure client-side simulation.
 */

import { User, UserFilterState, UserStats } from '@/types/User';

export const MOCK_USERS: User[] = [
  {
    id: 'USR-101',
    name: 'Shihab Admin',
    email: 'admin@sobaike.gov.bd',
    status: 'active',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    lastActive: '2026-08-28T10:45:00Z',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'USR-102',
    name: 'Tanvir Hossain',
    email: 'tanvir.mod@sobaike.gov.bd',
    status: 'active',
    role: 'moderator',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    lastActive: '2026-08-28T09:30:00Z',
    createdAt: '2026-02-14T09:15:00Z',
  },
  {
    id: 'USR-103',
    name: 'Nusrat Jahan',
    email: 'nusrat.review@sobaike.gov.bd',
    status: 'active',
    role: 'reviewer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    lastActive: '2026-08-27T16:20:00Z',
    createdAt: '2026-03-01T11:00:00Z',
  },
  {
    id: 'USR-104',
    name: 'Kamal Uddin',
    email: 'kamal.u@sobaike.gov.bd',
    status: 'active',
    role: 'moderator',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    lastActive: '2026-08-28T08:10:00Z',
    createdAt: '2026-03-18T14:30:00Z',
  },
  {
    id: 'USR-105',
    name: 'Farzana Akter',
    email: 'farzana.a@sobaike.gov.bd',
    status: 'pending',
    role: 'reviewer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80',
    lastActive: undefined,
    createdAt: '2026-08-25T10:00:00Z',
  },
  {
    id: 'USR-106',
    name: 'Rafiqul Islam',
    email: 'rafiqul.i@sobaike.gov.bd',
    status: 'inactive',
    role: 'reviewer',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    lastActive: '2026-07-15T12:00:00Z',
    createdAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 'USR-107',
    name: 'Mehedi Hasan',
    email: 'mehedi.h@sobaike.gov.bd',
    status: 'active',
    role: 'reviewer',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
    lastActive: '2026-08-28T11:15:00Z',
    createdAt: '2026-04-05T09:00:00Z',
  },
  {
    id: 'USR-108',
    name: 'Sadia Rahman',
    email: 'sadia.r@sobaike.gov.bd',
    status: 'active',
    role: 'moderator',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    lastActive: '2026-08-28T07:45:00Z',
    createdAt: '2026-05-12T13:20:00Z',
  },
  {
    id: 'USR-109',
    name: 'Anisur Rahman',
    email: 'anisur.audit@sobaike.gov.bd',
    status: 'active',
    role: 'auditor',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
    lastActive: '2026-08-28T06:30:00Z',
    createdAt: '2026-06-01T10:00:00Z',
  },
];

export class UserService {
  /**
   * Fetch filtered and searched users list (Demo map/admin data)
   */
  async getUsers(params: Partial<UserFilterState> = {}): Promise<{
    users: User[];
    total: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    let filtered = [...MOCK_USERS];

    // Search by Name or Email
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
      );
    }

    // Role filter
    if (params.role && params.role !== 'all') {
      filtered = filtered.filter(
        (u) => u.role.toLowerCase() === params.role!.toLowerCase()
      );
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(
        (u) => u.status.toLowerCase() === params.status!.toLowerCase()
      );
    }

    return {
      users: filtered,
      total: filtered.length,
    };
  }

  /**
   * Fetch single user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const user = MOCK_USERS.find((u) => u.id.toLowerCase() === id.toLowerCase());
    return user ? { ...user } : null;
  }

  /**
   * Return high-level summary counts
   */
  async getUserStats(): Promise<UserStats> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const total = MOCK_USERS.length;
    const active = MOCK_USERS.filter((u) => u.status === 'active').length;
    const pending = MOCK_USERS.filter((u) => u.status === 'pending').length;
    const inactive = MOCK_USERS.filter(
      (u) => u.status === 'inactive' || u.status === 'suspended'
    ).length;

    return {
      totalUsers: total,
      activeUsers: active,
      pendingUsers: pending,
      inactiveUsers: inactive,
    };
  }
}

export const mockUserService = new UserService();
export default mockUserService;
