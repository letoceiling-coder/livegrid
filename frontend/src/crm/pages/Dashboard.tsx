import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, BedDouble, HardHat, MapPin,
  CheckCircle2, Clock, XCircle, ArrowRight,
} from 'lucide-react';
import { getDashboardStats } from '../api/dashboard';
import type { DashboardStats } from '../api/types';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  selling: 'Продажи', completed: 'Сдан', planned: 'Проект', building: 'Строится',
};

export default function CrmDashboard() {
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-destructive text-sm">{error}</div>;
  }

  if (!stats) return null;

  const s    = stats.stats              ?? { complexes: 0, apartments: 0, builders: 0, districts: 0 };
  const apt  = stats.apartments_by_status ?? { available: 0, reserved: 0, sold: 0 };
  const recent = stats.recent_complexes   ?? [];

  const mainStats = [
    { label: 'Жилых комплексов', value: s.complexes,  icon: Building2, color: 'text-primary',        bg: 'bg-primary/10',      to: '/crm/complexes' },
    { label: 'Квартир в базе',   value: s.apartments, icon: BedDouble, color: 'text-blue-600',      bg: 'bg-blue-500/10',     to: '/crm/apartments' },
    { label: 'Застройщиков',     value: s.builders,   icon: HardHat,   color: 'text-amber-600',     bg: 'bg-amber-500/10',    to: '/crm/attributes' },
    { label: 'Районов',          value: s.districts,  icon: MapPin,    color: 'text-emerald-600',   bg: 'bg-emerald-500/10',  to: '/crm/attributes' },
  ];

  const aptStats = [
    { label: 'Свободно',   value: apt.available, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Резерв',     value: apt.reserved,  icon: Clock,        color: 'text-amber-600' },
    { label: 'Продано',    value: apt.sold,       icon: XCircle,      color: 'text-muted-foreground' },
  ];

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Обзор системы управления</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mainStats.map(s => (
          <Link
            key={s.label}
            to={s.to}
            className="bg-background border rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <p className="text-2xl font-bold">{s.value.toLocaleString('ru-RU')}</p>
            <p className="text-muted-foreground text-sm mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Apartments by status */}
        <div className="bg-background border rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-primary" /> Квартиры по статусу
          </h2>
          <div className="space-y-3">
            {aptStats.map(s => {
              const total = apt.available + apt.reserved + apt.sold || 1;
              const pct   = Math.round((s.value / total) * 100);
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm">
                      <s.icon className={cn('w-3.5 h-3.5', s.color)} />
                      <span>{s.label}</span>
                    </div>
                    <span className="text-sm font-medium">{s.value.toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent complexes */}
        <div className="bg-background border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Последние ЖК
            </h2>
            <Link to="/crm/complexes" className="text-xs text-primary hover:underline flex items-center gap-1">
              Все <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map(c => (
              <Link
                key={c.id}
                to={`/crm/complexes/${c.id}/edit`}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.builder && <p className="text-xs text-muted-foreground truncate">{c.builder}</p>}
                </div>
                {c.status && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg shrink-0 ml-2">
                    {statusLabels[c.status] ?? c.status}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-background border rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Быстрые действия</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { to: '/crm/complexes/new', label: '+ Новый ЖК' },
            { to: '/crm/apartments/new', label: '+ Новая квартира' },
            { to: '/crm/attributes', label: 'Управление атрибутами' },
            { to: '/crm/feed', label: 'Запустить импорт' },
          ].map(a => (
            <Link
              key={a.to}
              to={a.to}
              className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
