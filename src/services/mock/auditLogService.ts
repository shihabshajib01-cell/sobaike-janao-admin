/**
 * Audit Log Mock Service
 * Provides administrative visibility over system events and operator decisions.
 * Correlates actions across complaints, feed moderation, responses, users, and categories.
 */

import { AuditLog, AuditLogFilters, AuditStats, AuditModule } from '@/types/AuditLog';

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-8001',
    action: 'approve',
    module: 'complaints',
    entityId: 'CMP-10489',
    entityType: 'Complaint',
    actor: {
      id: 'USR-101',
      name: 'Shihab Admin',
      email: 'admin@sobaike.gov.bd',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-28T07:45:00Z',
    description: 'Approved complaint CMP-10489 after administrative review.',
    descriptionBn: 'প্রশাসনিক পর্যালোচনা শেষে অভিযোগ CMP-10489 অনুমোদন করা হয়েছে।',
    metadata: {
      previousStatus: 'submitted',
      newStatus: 'published',
    },
  },
  {
    id: 'LOG-8002',
    action: 'publish',
    module: 'complaints',
    entityId: 'CMP-10488',
    entityType: 'Complaint',
    actor: {
      id: 'USR-102',
      name: 'Tanvir Hossain',
      email: 'tanvir.mod@sobaike.gov.bd',
      role: 'moderator',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-28T07:00:00Z',
    description: 'Published complaint CMP-10488 onto public transparency board.',
    descriptionBn: 'অভিযোগ CMP-10488 পাবলিক নোটিশ বোর্ডে প্রকাশ করা হয়েছে।',
    metadata: {
      previousStatus: 'submitted',
      newStatus: 'published',
    },
  },
  {
    id: 'LOG-8003',
    action: 'resolve',
    module: 'complaints',
    entityId: 'CMP-10487',
    entityType: 'Complaint',
    actor: {
      id: 'USR-101',
      name: 'Shihab Admin',
      email: 'admin@sobaike.gov.bd',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-28T04:20:00Z',
    description: 'Closed complaint CMP-10487 as resolved after verification.',
    descriptionBn: 'যাচাই শেষে অভিযোগ CMP-10487 সমাধান হিসেবে চিহ্নিত করা হয়েছে।',
    metadata: {
      previousStatus: 'in_progress',
      newStatus: 'resolved',
    },
  },
  {
    id: 'LOG-8004',
    action: 'publish',
    module: 'feed',
    entityId: 'POST-101',
    entityType: 'FeedPost',
    actor: {
      id: 'USR-104',
      name: 'Kamal Uddin',
      email: 'kamal.u@sobaike.gov.bd',
      role: 'moderator',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-28T03:15:00Z',
    description: 'Approved and published citizen post POST-101 to the public community feed.',
    descriptionBn: 'নাগরিক পোস্ট POST-101 অনুমোদন করে পাবলিক ফিডে প্রকাশ করা হয়েছে।',
    metadata: {
      previousStatus: 'pending',
      newStatus: 'published',
    },
  },
  {
    id: 'LOG-8005',
    action: 'publish',
    module: 'responses',
    entityId: 'RESP-201',
    entityType: 'OfficialResponse',
    actor: {
      id: 'USR-101',
      name: 'Shihab Admin',
      email: 'admin@sobaike.gov.bd',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-27T16:45:00Z',
    description: 'Published official response RESP-201 regarding complaint CMP-10487.',
    descriptionBn: 'অভিযোগ CMP-10487 এর জন্য আনুষ্ঠানিক প্রতিক্রিয়া RESP-201 প্রকাশ করা হয়েছে।',
    metadata: {
      previousStatus: 'draft',
      newStatus: 'published',
    },
  },
  {
    id: 'LOG-8006',
    action: 'reject',
    module: 'complaints',
    entityId: 'CMP-10485',
    entityType: 'Complaint',
    actor: {
      id: 'USR-103',
      name: 'Nusrat Jahan',
      email: 'nusrat.review@sobaike.gov.bd',
      role: 'reviewer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-27T10:00:00Z',
    description: 'Rejected complaint CMP-10485 after review due to policy violation.',
    descriptionBn: 'নীতিমালা লঙ্ঘনের কারণে পর্যালোচনা শেষে অভিযোগ CMP-10485 বাতিল করা হয়েছে।',
    metadata: {
      previousStatus: 'submitted',
      newStatus: 'rejected',
    },
  },
  {
    id: 'LOG-8007',
    action: 'edit',
    module: 'complaints',
    entityId: 'CMP-10490',
    entityType: 'Complaint',
    actor: {
      id: 'USR-103',
      name: 'Nusrat Jahan',
      email: 'nusrat.review@sobaike.gov.bd',
      role: 'reviewer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-27T08:10:00Z',
    description: 'Edited complaint CMP-10490 details and added editorial revision.',
    descriptionBn: 'অভিযোগ CMP-10490 এর বিবরণ সম্পাদনা ও সংস্করণ যোগ করা হয়েছে।',
    metadata: {
      previousStatus: 'submitted',
      newStatus: 'edited',
    },
  },
  {
    id: 'LOG-8008',
    action: 'status_change',
    module: 'users',
    entityId: 'USR-105',
    entityType: 'User',
    actor: {
      id: 'USR-101',
      name: 'Shihab Admin',
      email: 'admin@sobaike.gov.bd',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-26T14:30:00Z',
    description: 'Updated account status for operator Farzana Akter after review.',
    descriptionBn: 'পর্যালোচনা শেষে অপারেটর ফারজানা আক্তারের অ্যাকাউন্ট স্ট্যাটাস হালনাগাদ করা হয়েছে।',
    metadata: {
      previousStatus: 'pending',
      newStatus: 'active',
    },
  },
  {
    id: 'LOG-8009',
    action: 'status_change',
    module: 'complaints',
    entityId: 'CMP-10484',
    entityType: 'Complaint',
    actor: {
      id: 'USR-101',
      name: 'Shihab Admin',
      email: 'admin@sobaike.gov.bd',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-25T11:20:00Z',
    description: 'Updated complaint CMP-10484 details and published.',
    descriptionBn: 'অভিযোগ CMP-10484 এর বিবরণ হালনাগাদ ও প্রকাশ করা হয়েছে।',
    metadata: {
      previousStatus: 'submitted',
      newStatus: 'published',
    },
  },
  {
    id: 'LOG-8010',
    action: 'publish',
    module: 'feed',
    entityId: 'POST-102',
    entityType: 'FeedPost',
    actor: {
      id: 'USR-104',
      name: 'Kamal Uddin',
      email: 'kamal.u@sobaike.gov.bd',
      role: 'moderator',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-25T09:15:00Z',
    description: 'Published community post POST-102 after moderation.',
    descriptionBn: 'মডারেশন শেষে নাগরিক পোস্ট POST-102 প্রকাশ করা হয়েছে।',
    metadata: {
      previousStatus: 'pending',
      newStatus: 'published',
    },
  },
  {
    id: 'LOG-8011',
    action: 'resolve',
    module: 'complaints',
    entityId: 'CMP-10482',
    entityType: 'Complaint',
    actor: {
      id: 'USR-101',
      name: 'Shihab Admin',
      email: 'admin@sobaike.gov.bd',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-24T16:00:00Z',
    description: 'Closed complaint CMP-10482 as resolved after review.',
    descriptionBn: 'পর্যালোচনা শেষে অভিযোগ CMP-10482 সমাধান হিসেবে চিহ্নিত করা হয়েছে।',
    metadata: {
      previousStatus: 'in_progress',
      newStatus: 'resolved',
    },
  },
  {
    id: 'LOG-8012',
    action: 'status_change',
    module: 'complaints',
    entityId: 'CMP-10481',
    entityType: 'Complaint',
    actor: {
      id: 'USR-101',
      name: 'Shihab Admin',
      email: 'admin@sobaike.gov.bd',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
    timestamp: '2026-08-23T12:00:00Z',
    description: 'Updated complaint CMP-10481 details.',
    descriptionBn: 'অভিযোগ CMP-10481 এর বিবরণ হালনাগাদ করা হয়েছে।',
    metadata: {
      previousStatus: 'submitted',
      newStatus: 'edited',
    },
  },
];

export class AuditLogService {
  /**
   * Fetch filtered and searched audit logs
   */
  async getAuditLogs(filters: Partial<AuditLogFilters> = {}): Promise<AuditLog[]> {
    await new Promise((resolve) => setTimeout(resolve, 120));

    let list = [...MOCK_AUDIT_LOGS];

    // Search filter (ID, description, entityId, actor name, actor email)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (log) =>
          log.id.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          (log.descriptionBn && log.descriptionBn.toLowerCase().includes(q)) ||
          log.actor.name.toLowerCase().includes(q) ||
          log.actor.email.toLowerCase().includes(q)
      );
    }

    // Module filter
    if (filters.module && filters.module !== 'all') {
      list = list.filter((log) => log.module === filters.module);
    }

    // Action filter
    if (filters.action && filters.action !== 'all') {
      list = list.filter((log) => log.action.toLowerCase() === filters.action!.toLowerCase());
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      // Baseline fixture reference date: 2026-08-28T23:59:59Z
      const refDate = new Date('2026-08-28T23:59:59Z').getTime();
      let durationMs = 30 * 24 * 60 * 60 * 1000;

      if (filters.dateRange === 'today') {
        durationMs = 1 * 24 * 60 * 60 * 1000;
      } else if (filters.dateRange === '7days') {
        durationMs = 7 * 24 * 60 * 60 * 1000;
      }

      list = list.filter((log) => {
        const time = new Date(log.timestamp).getTime();
        return refDate - time <= durationMs && time <= refDate;
      });
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Fetch single audit log entry by ID
   */
  async getAuditLogById(id: string): Promise<AuditLog | null> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const found = MOCK_AUDIT_LOGS.find((l) => l.id.toLowerCase() === id.toLowerCase());
    return found ? { ...found } : null;
  }

  /**
   * Return high-level audit summary metrics
   */
  async getAuditStats(): Promise<AuditStats> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const total = MOCK_AUDIT_LOGS.length;
    const refDate = new Date('2026-08-28T23:59:59Z').getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const todayLogs = MOCK_AUDIT_LOGS.filter((l) => {
      const time = new Date(l.timestamp).getTime();
      return refDate - time <= oneDayMs;
    }).length;

    const distinctModules = new Set(MOCK_AUDIT_LOGS.map((l) => l.module)).size;

    // Determine most frequent action
    const actionCounts: Record<string, number> = {};
    MOCK_AUDIT_LOGS.forEach((l) => {
      actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
    });

    let topAction = 'publish';
    let maxCount = 0;
    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topAction = action;
      }
    });

    return {
      totalLogs: total,
      todayLogs,
      activeModules: distinctModules,
      topAction,
    };
  }
}

export const mockAuditLogService = new AuditLogService();
export default mockAuditLogService;
