import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesApi, type AdminRole } from '../api/roles';

export default function AdminRoles() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const rolesQuery = useQuery({ queryKey: ['admin-roles'], queryFn: rolesApi.roles });
  const permissionsQuery = useQuery({ queryKey: ['admin-permissions'], queryFn: rolesApi.permissions });
  const usersQuery = useQuery({ queryKey: ['admin-role-users'], queryFn: rolesApi.users });

  const permissions = permissionsQuery.data?.data ?? [];
  const roles = rolesQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const metaRoles = usersQuery.data?.meta.roles ?? [];
  const teams = usersQuery.data?.meta.teams ?? [];

  const permissionGroups = useMemo(() => {
    return permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
      const group = p.name.split('.')[0] ?? 'other';
      acc[group] = acc[group] ?? [];
      acc[group].push(p);
      return acc;
    }, {});
  }, [permissions]);

  const createRole = useMutation({
    mutationFn: () => rolesApi.createRole({ name, description, permissions: selectedPermissions }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setSelectedPermissions([]);
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ role, permissions }: { role: AdminRole; permissions: string[] }) =>
      rolesApi.updateRole(role.id, { permissions }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-roles'] }),
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, roleId, teamId }: { userId: number; roleId: number; teamId: number | null }) =>
      rolesApi.updateUserRole(userId, { role_id: roleId, team_id: teamId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-role-users'] });
    },
  });

  const toggleNewPermission = (permission: string) => {
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((x) => x !== permission) : [...current, permission],
    );
  };

  const toggleRolePermission = (role: AdminRole, permission: string) => {
    const next = role.permissions.includes(permission)
      ? role.permissions.filter((x) => x !== permission)
      : [...role.permissions, permission];
    updateRole.mutate({ role, permissions: next });
  };

  const changeUserTeam = (userId: number, currentRoleId: number | null, teamId: number) => {
    const roleId = currentRoleId ?? metaRoles[0]?.id;
    if (!roleId) return;
    updateUser.mutate({ userId, roleId, teamId });
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Роли и права</h1>
        <p className="text-sm text-muted-foreground">Управление RBAC: роли, permissions, пользователи и команды.</p>
      </div>

      <section className="bg-background border rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold">Создать роль</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="ROLE_NAME" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <PermissionMatrix groups={permissionGroups} selected={selectedPermissions} onToggle={toggleNewPermission} />
        <button
          type="button"
          disabled={!name || createRole.isPending}
          onClick={() => createRole.mutate()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          Создать роль
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Роли</h2>
        {roles.map((role) => (
          <div key={role.id} className="bg-background border rounded-2xl p-4 space-y-3">
            <div>
              <div className="font-semibold">{role.name}</div>
              <div className="text-xs text-muted-foreground">{role.description ?? 'Без описания'}</div>
            </div>
            <PermissionMatrix groups={permissionGroups} selected={role.permissions} onToggle={(permission) => toggleRolePermission(role, permission)} />
          </div>
        ))}
      </section>

      <section className="bg-background border rounded-2xl overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Пользователи</h2>
        </div>
        <div className="divide-y">
          {users.map((user) => (
            <div key={user.id} className="p-4 grid md:grid-cols-[1fr_180px_180px] gap-3 items-center">
              <div>
                <div className="font-medium text-sm">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={user.role_id ?? ''}
                onChange={(e) => updateUser.mutate({ userId: user.id, roleId: Number(e.target.value), teamId: user.team_id })}
              >
                <option value="" disabled>Роль</option>
                {metaRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={user.team_id ?? ''}
                onChange={(e) => changeUserTeam(user.id, user.role_id, Number(e.target.value))}
              >
                <option value="" disabled>Команда</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PermissionMatrix({
  groups,
  selected,
  onToggle,
}: {
  groups: Record<string, Array<{ id: number; name: string }>>;
  selected: string[];
  onToggle: (permission: string) => void;
}) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Object.entries(groups).map(([group, permissions]) => (
        <div key={group} className="border rounded-xl p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}</div>
          <div className="space-y-1">
            {permissions.map((permission) => (
              <label key={permission.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(permission.name)}
                  onChange={() => onToggle(permission.name)}
                />
                <span>{permission.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
