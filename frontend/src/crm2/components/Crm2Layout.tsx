import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { Database, ChevronLeft, LogOut, User, LayoutGrid, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/crm/context/AuthContext';
import { useEntityTypes } from '../hooks/useEntityTypes';
import { Button } from '@/components/ui/button';

export default function Crm2Layout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: types, isLoading } = useEntityTypes();

  if (loading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/crm/login" replace />;

  const handleLogout = async () => {
    await signOut();
    navigate('/crm/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      <aside className="w-64 flex flex-col border-r bg-background shrink-0">
        <div className="flex items-center gap-2 px-4 h-14 border-b">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <Database className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm">Entity CRM</div>
            <div className="text-xs text-muted-foreground">Schema-driven</div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <NavLink
            to="/crm2"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )
            }
          >
            <LayoutGrid className="w-4 h-4" />
            Типы
          </NavLink>
          <NavLink
            to="/crm2/types"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )
            }
          >
            <Wrench className="w-4 h-4" />
            Конструктор
          </NavLink>
          <div className="pt-2 pb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Сущности
          </div>
          {(types ?? []).map(t => (
            <NavLink
              key={t.code}
              to={`/crm2/entities/${t.code}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )
              }
            >
              <span className="truncate">{t.name}</span>
              <span className="text-[10px] opacity-60 font-mono">{t.code}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <a href="/crm" className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Классическая CRM
            </a>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{user.name}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
