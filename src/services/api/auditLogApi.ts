/**
 * Audit Log API Service
 */
import { AuditLog, AuditLogFilters, AuditStats } from '@/types/AuditLog';

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AUD-9021',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    module: 'complaints',
    action: 'publish',
    entityId: 'CMP-2025-0012',
    entityType: 'Complaint',
    description: 'Complaint approved and published to public feed after verification',
    descriptionBn: 'অভিযোগটি যাচাইপূর্বক অনুমোদন ও পাবলিক ফিডে প্রকাশ করা হয়েছে',
    actor: {
      id: 'USR-ADMIN-1',
      name: 'Rahim Ahmed',
      email: 'rahim.ahmed@gov.bd',
      role: 'Chief Administrative Officer',
    },
    metadata: {
      ward: 'Ward 18',
      category: 'Roads & Traffic',
      previousStatus: 'submitted',
      newStatus: 'published',
    },
  },
  {
    id: 'AUD-9020',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    module: 'responses',
    action: 'create',
    entityId: 'RES-2025-0045',
    entityType: 'Official Response',
    description: 'Official department response drafted and sent for citizen inquiry',
    descriptionBn: 'নাগরিক অনুসন্ধানের বিপরীতে দাপ্তরিক অগ্রগতি প্রতিবেদন যুক্ত করা হয়েছে',
    actor: {
      id: 'USR-MOD-2',
      name: 'Dr. Nusrat Jahan',
      email: 'nusrat.jahan@dcc.gov.bd',
      role: 'Zonal Executive Officer',
    },
    metadata: {
      linkedComplaintId: 'CMP-2025-0008',
      department: 'Waste Management Division',
    },
  },
  {
    id: 'AUD-9019',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    module: 'complaints',
    action: 'status_change',
    entityId: 'CMP-2025-0005',
    entityType: 'Complaint',
    description: 'Complaint status changed from in_progress to resolved following on-site completion',
    descriptionBn: 'মাঠপর্যায়ে মেরামত কাজ সমাপ্ত হওয়ায় স্ট্যাটাস সম্পন্ন করা হয়েছে',
    actor: {
      id: 'USR-ADMIN-1',
      name: 'Rahim Ahmed',
      email: 'rahim.ahmed@gov.bd',
      role: 'Chief Administrative Officer',
    },
    metadata: {
      ward: 'Ward 32',
      previousStatus: 'in_progress',
      newStatus: 'resolved',
    },
  },
  {
    id: 'AUD-9018',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    module: 'categories',
    action: 'update',
    entityId: 'CAT-003',
    entityType: 'Category',
    description: 'Subcategory taxonomy updated: added "Illegal Encroachment" under Civic Issues',
    descriptionBn: 'ক্যাটাগরি হালনাগাদ: নাগরিক সমস্যার অধীনে অবৈধ দখল যুক্ত করা হয়েছে',
    actor: {
      id: 'USR-SUPER-0',
      name: 'System Admin',
      email: 'admin@sobaike.org',
      role: 'Super Administrator',
    },
    metadata: {
      categoryId: 'civic_issues',
      subcategoryId: 'illegal_encroachment',
    },
  },
  {
    id: 'AUD-9017',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    module: 'complaints',
    action: 'reject',
    entityId: 'CMP-2025-0002',
    entityType: 'Complaint',
    description: 'Complaint rejected due to duplicate submission and insufficient geographic details',
    descriptionBn: 'ভুল ও দ্বৈত এন্ট্রি হিসেবে অভিযোগটি বাতিল করা হয়েছে',
    actor: {
      id: 'USR-MOD-3',
      name: 'Tanvir Hossain',
      email: 'tanvir.hossain@gov.bd',
      role: 'Complaints Moderator',
    },
    metadata: {
      reason: 'Duplicate submission',
    },
  },
  {
    id: 'AUD-9016',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    module: 'users',
    action: 'role_change',
    entityId: 'USR-MOD-3',
    entityType: 'Admin User',
    description: 'User role escalated to Complaints Moderator with triage permissions',
    descriptionBn: 'ব্যবহারকারীর রোল অভিযোগ মডারেটরে উন্নীত করা হয়েছে',
    actor: {
      id: 'USR-SUPER-0',
      name: 'System Admin',
      email: 'admin@sobaike.org',
      role: 'Super Administrator',
    },
    metadata: {
      targetUser: 'Tanvir Hossain',
      newRole: 'moderator',
    },
  },
];

export const auditLogApi = {
  getAuditLogs: async (filters?: AuditLogFilters): Promise<AuditLog[]> => {
    let result = [...INITIAL_AUDIT_LOGS];

    if (!filters) return result;

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.entityId.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          (l.descriptionBn && l.descriptionBn.toLowerCase().includes(q)) ||
          l.actor.name.toLowerCase().includes(q) ||
          l.actor.email.toLowerCase().includes(q)
      );
    }

    if (filters.module && filters.module !== 'all') {
      result = result.filter((l) => l.module === filters.module);
    }

    if (filters.action && filters.action !== 'all') {
      result = result.filter((l) => l.action === filters.action);
    }

    return result;
  },

  getAuditStats: async (): Promise<AuditStats> => {
    return {
      totalLogs: INITIAL_AUDIT_LOGS.length + 142,
      todayLogs: 18,
      activeModules: 5,
      topAction: 'publish',
    };
  },

  logAction: async (
    action: string,
    module: string,
    entityId: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> => {
    const newLog: AuditLog = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      module,
      action,
      entityId,
      description,
      actor: {
        id: 'USR-ADMIN-CURRENT',
        name: 'Current Admin',
        email: 'admin@sobaike.org',
        role: 'Administrator',
      },
      metadata,
    };
    INITIAL_AUDIT_LOGS.unshift(newLog);
    return newLog;
  },
};

export default auditLogApi;
