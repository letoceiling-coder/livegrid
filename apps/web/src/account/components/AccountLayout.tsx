import { Link, NavLink, Outlet } from 'react-router-dom';
import { Heart, Search, Sparkles, Clock, Bell, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';

const tabs = [
  { to: '/account/favorites', label: 'Избранное', icon: Heart, end: true },
  { to: '/account/recommendations', label: 'Рекомендации', icon: Sparkles },
  { to: '/account/saved-searches', label: 'Сохранённые поиски', icon: Search },
  { to: '/account/history', label: 'История', icon: Clock },
  { to: '/account/notifications', label: 'Уведомления', icon: Bell },
  { to: '/account/billing', label: 'Биллинг', icon: CreditCard },
];

export default function AccountLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <RedesignHeader />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 pb-24">
        <h1 className="text-xl sm:text-2xl font-bold mb-4">Личный кабинет</h1>
        <nav className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium border min-h-[44px] transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border',
                )
              }
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
        <p className="text-xs text-muted-foreground mt-8 text-center">
          <Link to="/profile" className="underline hover:text-foreground">
            Настройки профиля
          </Link>
        </p>
      </div>
      <FooterSection />
    </div>
  );
}
