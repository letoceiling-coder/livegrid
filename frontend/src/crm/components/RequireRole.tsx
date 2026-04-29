import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../authz';

interface Props {
  roles: string[];
}

export default function RequireRole({ roles }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/crm/login" replace />;
  if (!hasRole(user, roles)) return <Navigate to="/crm" replace />;

  return <Outlet />;
}
