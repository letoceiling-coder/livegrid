import { useEffect, useState } from 'react';
import { Settings, User, Shield, Globe, Database, Activity, Key, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats } from '../../api/dashboard';
import type { DashboardStats } from '../../api/types';
import { cn } from '@/lib/utils';
import { getContactsSettings, getTelegramSettings, testTelegramSettings, updateContactsSettings, updateTelegramSettings } from '../../api/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  const { user } = useAuth();
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [notifyUrl, setNotifyUrl] = useState('');
  const [notifyToken, setNotifyToken] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [contactsSaving, setContactsSaving] = useState(false);
  const [contactsEmail, setContactsEmail] = useState('');
  const [contactsAddress, setContactsAddress] = useState('');
  const [contactsWorkHours, setContactsWorkHours] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => null)
      .finally(() => setLoading(false));

    getTelegramSettings()
      .then((data) => {
        setNotifyUrl(data.notifyUrl ?? '');
        setNotifyToken(data.notifyToken ?? '');
      })
      .catch(() => null)
      .finally(() => setTelegramLoading(false));

    getContactsSettings()
      .then((data) => {
        setContactsEmail(data.email ?? '');
        setContactsAddress(data.address ?? '');
        setContactsWorkHours(data.workHours ?? '');
      })
      .catch(() => null);
  }, []);

  const s = stats?.stats;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Конфигурация системы и информация</p>
      </div>

      {/* Live stats */}
      <div className="bg-background border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Состояние системы</h2>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin ml-auto" />}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'ЖК', value: s?.complexes },
            { label: 'Квартир', value: s?.apartments },
            { label: 'Застройщиков', value: s?.builders },
            { label: 'Районов', value: s?.districts },
          ].map(item => (
            <div key={item.label} className="bg-muted/40 rounded-xl p-3 text-center">
              <p className={cn('text-2xl font-bold', loading && 'opacity-40')}>
                {item.value?.toLocaleString('ru-RU') ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="bg-background border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Профиль администратора</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoRow label="Имя"   value={user?.name  ?? '—'} />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Роль"  value="Администратор" />
          <InfoRow label="ID"    value={user ? `#${user.id}` : '—'} />
        </div>
      </div>

      <div className="bg-background border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Контакты для Telegram бота</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Эти значения используются в команде /contacts у бота.
        </p>
        <div className="grid gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Email</p>
            <Input
              value={contactsEmail}
              onChange={(e) => setContactsEmail(e.target.value)}
              placeholder="info@livegrid.ru"
              disabled={contactsSaving}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Адрес</p>
            <Input
              value={contactsAddress}
              onChange={(e) => setContactsAddress(e.target.value)}
              placeholder="Белгород, офис Live Grid"
              disabled={contactsSaving}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Режим работы</p>
            <Input
              value={contactsWorkHours}
              onChange={(e) => setContactsWorkHours(e.target.value)}
              placeholder="пн–пт 9:00–18:00"
              disabled={contactsSaving}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              disabled={contactsSaving}
              onClick={async () => {
                setSaveMessage('');
                setContactsSaving(true);
                try {
                  const data = await updateContactsSettings({
                    email: contactsEmail.trim(),
                    address: contactsAddress.trim(),
                    workHours: contactsWorkHours.trim(),
                  });
                  setContactsEmail(data.email);
                  setContactsAddress(data.address);
                  setContactsWorkHours(data.workHours);
                  setSaveMessage('Контакты для бота сохранены');
                } catch (e) {
                  setSaveMessage(e instanceof Error ? e.message : 'Ошибка сохранения контактов');
                } finally {
                  setContactsSaving(false);
                }
              }}
            >
              {contactsSaving ? 'Сохранение...' : 'Сохранить контакты'}
            </Button>
          </div>
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

      {/* API Keys */}
      <div className="bg-background border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">API Ключи</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium">Яндекс Карты</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">a79c56f4-efea-471e-bee5-fe9226cd53fd</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">Активен</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium">CRM API</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">/api/v1/crm</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">Работает</span>
          </div>
        </div>
      </div>

      <div className="bg-background border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Telegram Bot интеграция</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Настройки webhook уведомлений для Telegram-бота. Управляются только из CRM.
        </p>
        <div className="grid gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">URL endpoint бота</p>
            <Input
              value={notifyUrl}
              onChange={(e) => setNotifyUrl(e.target.value)}
              placeholder="https://bot.livegrid.ru/internal/notify"
              disabled={telegramLoading || telegramSaving}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Внутренний токен (опционально)</p>
            <Input
              value={notifyToken}
              onChange={(e) => setNotifyToken(e.target.value)}
              placeholder="secret-token"
              disabled={telegramLoading || telegramSaving}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              disabled={telegramLoading || telegramSaving}
              onClick={async () => {
                setSaveMessage('');
                setTelegramSaving(true);
                try {
                  const data = await updateTelegramSettings({
                    notifyUrl: notifyUrl.trim() || null,
                    notifyToken: notifyToken.trim() || null,
                  });
                  setNotifyUrl(data.notifyUrl ?? '');
                  setNotifyToken(data.notifyToken ?? '');
                  setSaveMessage('Настройки Telegram сохранены');
                } catch (e) {
                  setSaveMessage(e instanceof Error ? e.message : 'Ошибка сохранения');
                } finally {
                  setTelegramSaving(false);
                }
              }}
            >
              {telegramSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button
              variant="outline"
              disabled={telegramLoading || telegramSaving || testSending}
              onClick={async () => {
                setSaveMessage('');
                setTestSending(true);
                try {
                  await testTelegramSettings('registration');
                  setSaveMessage('Тестовое уведомление отправлено');
                } catch (e) {
                  setSaveMessage(e instanceof Error ? e.message : 'Ошибка тестовой отправки');
                } finally {
                  setTestSending(false);
                }
              }}
            >
              {testSending ? 'Отправка...' : 'Проверить интеграцию'}
            </Button>
            {saveMessage ? <p className="text-sm text-muted-foreground">{saveMessage}</p> : null}
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="bg-background border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Информация о системе</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoRow label="Система"         value="Live Grid CRM" />
          <InfoRow label="Аутентификация"  value="Laravel Sanctum" />
          <InfoRow label="База данных"     value="MySQL 8.0" />
          <InfoRow label="Поиск"           value="Full-text + фильтры" />
        </div>
      </div>

      {/* Database */}
      <div className="bg-background border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">База данных</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoRow label="Квартир активных"   value={s?.apartments?.toLocaleString('ru-RU') ?? '—'} />
          <InfoRow label="ЖК в базе"          value={s?.complexes?.toLocaleString('ru-RU') ?? '—'} />
          <InfoRow label="Застройщиков"        value={s?.builders?.toLocaleString('ru-RU') ?? '—'} />
          <InfoRow label="Районов"             value={s?.districts?.toLocaleString('ru-RU') ?? '—'} />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <div className="flex items-start gap-2">
          <Settings className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Конфигурация Telegram Bot уведомлений выполняется в этом разделе CRM без правки серверных переменных окружения.</p>
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
