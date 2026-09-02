export interface RoleListItem {
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
