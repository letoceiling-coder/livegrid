import { Settings, User, Shield, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Конфигурация системы</p>
      </div>

      {/* Profile */}
      <div className="bg-background border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Профиль администратора</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoRow label="Имя"  value={user?.name  ?? '—'} />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Роль"  value="Администратор" />
          <InfoRow label="ID"    value={user ? `#${user.id}` : '—'} />
        </div>
      </div>

      {/* Access */}
      <div className="bg-background border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Права доступа</h2>
        </div>
        {[
          'Управление жилыми комплексами',
          'Управление квартирами',
          'Управление атрибутами (застройщики, районы)',
          'Запуск импорта фида',
          'Просмотр статистики',
        ].map(p => (
          <div key={p} className="flex items-center gap-2 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            {p}
          </div>
        ))}
      </div>

      {/* System info */}
      <div className="bg-background border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Информация о системе</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoRow label="Система"  value="Live Grid CRM" />
          <InfoRow label="API"      value="/api/v1/crm" />
          <InfoRow label="Аутентификация" value="Sanctum Token" />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <div className="flex items-start gap-2">
          <Settings className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Расширенные настройки конфигурации (SMTP, API-ключи, интеграции) настраиваются в файле <code className="bg-amber-100 px-1 rounded">.env</code> на сервере.</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
