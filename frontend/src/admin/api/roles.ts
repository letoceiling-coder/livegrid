import { api } from '@/crm/api/client';

export interface AdminRole {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface AdminPermission {
  id: number;
  name: string;
  description: string | null;
}

export interface AdminUserRole {
  id: number;
  name: string;
  email: string;
  role_id: number | null;
  role: string;
  team_id: number | null;
  team: string | null;
}

export interface AdminRoleMeta {
  roles: Array<{ id: number; name: string }>;
  teams: Array<{ id: number; name: string }>;
}

export const rolesApi = {
  roles: () => api.get<{ data: AdminRole[] }>('/roles'),
  permissions: () => api.get<{ data: AdminPermission[] }>('/permissions'),
  users: () => api.get<{ data: AdminUserRole[]; meta: AdminRoleMeta }>('/users'),
  createRole: (body: { name: string; description?: string | null; permissions?: string[] }) =>
    api.post<{ data: AdminRole }>('/roles', body),
  updateRole: (id: number, body: { name?: string; description?: string | null; permissions?: string[] }) =>
    api.put<{ data: AdminRole }>(`/roles/${id}`, body),
  updateUserRole: (id: number, body: { role_id: number; team_id?: number | null }) =>
    api.put<{ data: AdminUserRole }>(`/users/${id}/role`, body),
};
