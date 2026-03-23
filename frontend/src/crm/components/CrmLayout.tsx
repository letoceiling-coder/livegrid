import { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BedDouble, Tags, Rss,
  Settings, ChevronLeft, ChevronRight, LogOut, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/crm',            icon: LayoutDashboard, label: 'Дашборд',       end: true },
  { to: '/crm/complexes',  icon: Building2,       label: 'Жилые комплексы' },
  { to: '/crm/apartments', icon: BedDouble,       label: 'Квартиры' },
  { to: '/crm/attributes', icon: Tags,            label: 'Атрибуты' },
  { to: '/crm/feed',       icon: Rss,             label: 'Импорт фида' },
  { to: '/crm/settings',   icon: Settings,        label: 'Настройки' },
];

export default function CrmLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
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
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-200 shrink-0',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b shrink-0">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-xs">CRM</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-sm truncate leading-tight">
              Live Grid<br />
              <span className="text-muted-foreground font-normal text-xs">Управление</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center h-10 border-t text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Right column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{user.name}</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
