export interface RoleRpcRow {
  id: string;
  name_en: string;
  name_bn: string | null;
  description: string | null;
  active: boolean;
  is_system: boolean;
  permission_count: number;
  assigned_user_count: number;
  created_at: string;
  updated_at: string | null;
}

export type RoleListItem = RoleRpcRow;

export interface PermissionCatalogueItem {
  id: string;
  module: string;
  action: string;
  name_en: string;
  name_bn: string | null;
  description: string | null;
  created_at: string;
}

export interface CreateRoleInput {
  name: string;
  active: boolean;
  permission_ids: string[];
  description?: string | null;
}

export interface CreateRoleResult {
  id: string;
  name_en: string;
  name_bn: string | null;
  description: string | null;
  active: boolean;
  is_system: boolean;
  permission_ids: string[];
  permission_count: number;
  created_at: string;
  updated_at: string;
}

export class RoleApiError extends Error {
  code?: string;
  details?: string;
  hint?: string;

  constructor(message: string, code?: string, details?: string, hint?: string) {
    super(message);
    this.name = 'RoleApiError';
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
}

export interface UserAssignedRole {
  id: string;
  name_en: string;
  name_bn: string | null;
  description?: string | null;
  active: boolean;
  is_system?: boolean;
}

export interface UserPermissionProfile {
  role: UserAssignedRole | null;
  permissions: string[];
  isBootstrapMode: boolean;
}


