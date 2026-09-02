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

