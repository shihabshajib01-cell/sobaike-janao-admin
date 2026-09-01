/**
 * Permission Foundation Service
 * Prepares module/action based authorization checks for admin operations.
 * Ready for integration with real identity & RBAC providers.
 * Pure module/action-based permissions without organizational assumptions.
 */

import { Complaint } from '@/types/Complaint';
import { User, Permission, UserStatus } from '@/types/User';
import { mockStatusTransitionService } from './statusTransitionService';

export type AdminRole = 'admin' | 'moderator' | 'reviewer' | 'auditor';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole | string;
  status?: UserStatus;
}

// Current simulated admin user for mock session (Demo user)
export const CURRENT_ADMIN_USER: AdminUser = {
  id: 'USR-101',
  name: 'Shihab Admin',
  email: 'admin@sobaike.gov.bd',
  role: 'admin',
  status: 'active',
};

/**
 * Standard Permission Matrix Definitions for Sobaike Admin (Demo Permissions)
 */
export const MOCK_PERMISSIONS: Permission[] = [
  // Complaints module
  {
    id: 'complaints.view',
    module: 'complaints',
    action: 'view',
    name: 'View Complaints',
    nameBn: 'অভিযোগ দর্শন',
    description: 'View citizen complaints and details',
    descriptionBn: 'নাগরিকের দাখিলকৃত অভিযোগ ও বিবরণ দেখার এক্সেস',
  },
  {
    id: 'complaints.review',
    module: 'complaints',
    action: 'review',
    name: 'Review Complaints',
    nameBn: 'অভিযোগ পর্যালোচনা',
    description: 'Move complaints to under review and request citizen information',
    descriptionBn: 'অভিযোগ পর্যালোচনায় নেওয়া ও নাগরিকের কাছে তথ্য চাওয়ার ক্ষমতা',
  },
  {
    id: 'complaints.approve',
    module: 'complaints',
    action: 'approve',
    name: 'Approve Complaints',
    nameBn: 'অভিযোগ অনুমোদন',
    description: 'Approve complaints after review',
    descriptionBn: 'যাচাইকৃত অভিযোগ পদক্ষেপের জন্য অনুমোদন দেওয়া',
  },
  {
    id: 'complaints.reject',
    module: 'complaints',
    action: 'reject',
    name: 'Reject Complaints',
    nameBn: 'অভিযোগ বাতিল',
    description: 'Reject duplicate, invalid, or out-of-jurisdiction complaints',
    descriptionBn: 'অপ্রাসঙ্গিক বা স্প্যাম অভিযোগ বাতিল করা',
  },

  // Feed module
  {
    id: 'feed.view',
    module: 'feed',
    action: 'view',
    name: 'View Public Feed',
    nameBn: 'পাবলিক ফিড দর্শন',
    description: 'View public post queue and community feed',
    descriptionBn: 'উন্মুক্ত নাগরিক ফিড ও পোস্ট তালিকা দেখার অধিকার',
  },
  {
    id: 'feed.moderate',
    module: 'feed',
    action: 'moderate',
    name: 'Moderate Content',
    nameBn: 'কনটেন্ট মডারেশন',
    description: 'Edit public-facing copies and enforce privacy safeguards',
    descriptionBn: 'পাবলিক পোস্টের ভাষা ও গোপনীয়তা সংস্করণ করা',
  },
  {
    id: 'feed.publish',
    module: 'feed',
    action: 'publish',
    name: 'Publish to Feed',
    nameBn: 'ফিডে প্রকাশ',
    description: 'Publish approved posts to the public live stream',
    descriptionBn: 'অনুমোদিত পোস্ট পাবলিক ফিডে সরাসরি প্রকাশ করা',
  },
  {
    id: 'feed.unpublish',
    module: 'feed',
    action: 'unpublish',
    name: 'Unpublish Content',
    nameBn: 'পোস্ট অপসারণ',
    description: 'Take down or unpublish content from the citizen feed',
    descriptionBn: 'প্রয়োজনে পাবলিক ফিড থেকে পোস্ট প্রত্যাহার করা',
  },

  // Responses module
  {
    id: 'responses.view',
    module: 'responses',
    action: 'view',
    name: 'View Responses',
    nameBn: 'প্রতিক্রিয়া দর্শন',
    description: 'View verified updates and citizen replies',
    descriptionBn: 'অগ্রগতি বার্তা ও নাগরিক মন্তব্য দেখার এক্সেস',
  },
  {
    id: 'responses.review',
    module: 'responses',
    action: 'review',
    name: 'Review Responses',
    nameBn: 'প্রতিক্রিয়া পর্যালোচনা',
    description: 'Review response drafts prior to publication',
    descriptionBn: 'তৈরি করা ড্রাফট বার্তা পর্যালোচনা করা',
  },
  {
    id: 'responses.approve',
    module: 'responses',
    action: 'approve',
    name: 'Approve Responses',
    nameBn: 'প্রতিক্রিয়া অনুমোদন',
    description: 'Approve official statements for broadcast',
    descriptionBn: 'আনুষ্ঠানিক জবাব অনুমোদন করা',
  },
  {
    id: 'responses.publish',
    module: 'responses',
    action: 'publish',
    name: 'Publish Responses',
    nameBn: 'প্রতিক্রিয়া প্রকাশ',
    description: 'Publish approved updates to public timeline',
    descriptionBn: 'নাগরিক টাইমলাইনে অনুমোদিত অগ্রগতি বার্তা প্রকাশ করা',
  },

  // Category & Taxonomy module
  {
    id: 'categories.view',
    module: 'categories',
    action: 'view',
    name: 'View Categories',
    nameBn: 'ক্যাটাগরি দর্শন',
    description: 'Access civic category and subcategory classifications',
    descriptionBn: 'অভিযোগের ক্যাটাগরি ও সাব-ক্যাটাগরি তালিকা দেখা',
  },

  // Map Monitoring module
  {
    id: 'map.view',
    module: 'map',
    action: 'view',
    name: 'View Map Monitoring',
    nameBn: 'ম্যাপ পর্যবেক্ষণ দর্শন',
    description: 'Monitor geospatial distribution of complaint locations',
    descriptionBn: 'ভৌগোলিক মানচিত্রে অভিযোগের অবস্থান পর্যবেক্ষণ',
  },

  // Users module
  {
    id: 'users.view',
    module: 'users',
    action: 'view',
    name: 'View Users & Roles',
    nameBn: 'ব্যবহারকারী ও রোল দর্শন',
    description: 'View admin user directory and permission assignments',
    descriptionBn: 'অ্যাডমিন ব্যবহারকারী ও তাদের রোল তালিকা দেখা',
  },
];

export class PermissionService {
  /**
   * Return all system permissions
   */
  async getPermissions(): Promise<Permission[]> {
    return [...MOCK_PERMISSIONS];
  }

  /**
   * Check if a User has a specific permission ID
   * Example: can(user, 'complaints.approve')
   */
  can(user: User | AdminUser | null | undefined, permissionId: string): boolean {
    if (!user) return false;
    
    const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';

    if (role === 'admin') {
      return true;
    }
    if (role === 'auditor') {
      return permissionId.endsWith('.view');
    }
    if (role === 'reviewer') {
      const allowed = [
        'complaints.view',
        'complaints.review',
        'responses.view',
        'categories.view',
        'map.view',
      ];
      return allowed.includes(permissionId);
    }
    if (role === 'moderator') {
      const allowed = [
        'complaints.view',
        'complaints.review',
        'feed.view',
        'feed.moderate',
        'feed.publish',
        'responses.view',
        'responses.review',
        'categories.view',
        'map.view',
      ];
      return allowed.includes(permissionId);
    }

    return false;
  }

  /**
   * Workflow method: Check if user can edit a complaint
   */
  canEditComplaint(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    if (!complaint) return false;
    const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
    if (role === 'auditor') return false;
    return mockStatusTransitionService.isTransitionAllowed(complaint.status, 'edited');
  }

  /**
   * Workflow method: Check if user can reject complaint
   */
  canReject(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    if (!complaint) return false;
    const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
    if (role === 'auditor') return false;
    return mockStatusTransitionService.isTransitionAllowed(complaint.status, 'rejected');
  }

  /**
   * Workflow method: Check if user can publish complaint to public feed
   */
  canPublish(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    if (!complaint) return false;
    const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
    if (role === 'auditor') return false;
    return mockStatusTransitionService.isTransitionAllowed(complaint.status, 'published');
  }

  /**
   * Workflow method: Check if user can post official progress note
   */
  canAddUpdate(user: AdminUser = CURRENT_ADMIN_USER, complaint?: Complaint | null): boolean {
    if (!complaint) return false;
    const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
    if (role === 'auditor') return false;
    return true;
  }
}

export const mockPermissionService = new PermissionService();
export default mockPermissionService;
