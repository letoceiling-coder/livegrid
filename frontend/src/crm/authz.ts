import { useAuth } from './context/AuthContext';

export function can(user: { role?: string; permissions?: string[] } | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.permissions?.includes(permission) ?? false;
}

export function hasRole(user: { role?: string } | null, roles: string | string[]): boolean {
  if (!user) return false;
  return (Array.isArray(roles) ? roles : [roles]).includes(user.role ?? '');
}

export function useCan(permission: string): boolean {
  const { user } = useAuth();
  return can(user, permission);
}
