import { useEffect, useState } from 'react';
import {
  Rss, Download, RefreshCw, CheckCircle2, XCircle,
  Clock, Database, Building2, BedDouble,
} from 'lucide-react';
import { getFeedStatus, runFeedDownload, runFeedSync } from '../../api/feed';
import type { FeedStatus } from '../../api/types';
import { cn } from '@/lib/utils';

function formatDate(iso: string | null) {
  if (!iso) return 'Никогда';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function FeedPage() {
  const [status,      setStatus]      = useState<FeedStatus | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [downloading, setDownloading] = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [log,         setLog]         = useState<string[]>([]);

  const loadStatus = () => {
    setLoading(true);
    getFeedStatus()
      .then(setStatus)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStatus(); }, []);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString('ru-RU')}] ${msg}`, ...prev]);

  const handleDownload = async () => {
    setDownloading(true);
    addLog('Запуск загрузки фида...');
    try {
      const res = await runFeedDownload();
      addLog(`✓ ${res.message}`);
      if (res.status.output) addLog(res.status.output);
      setStatus(s => s ? { ...s, status: res.status } : null);
    } catch (e: any) {
      addLog(`✗ Ошибка: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    addLog('Запуск синхронизации поиска...');
    try {
      const res = await runFeedSync();
      addLog(`✓ ${res.message}`);
      if (res.status.output) addLog(res.status.output);
      setStatus(s => s ? { ...s, status: res.status } : null);
    } catch (e: any) {
      addLog(`✗ Ошибка: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const isRunning = status?.running || downloading || syncing;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Импорт фида</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Управление загрузкой и синхронизацией данных</p>
      </div>

      {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

      {/* Status card */}
      {status && (
        <div className="bg-background border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              'w-2.5 h-2.5 rounded-full',
              isRunning ? 'bg-amber-500 animate-pulse' :
              status.status.result === 'success' ? 'bg-emerald-500' :
              status.status.result === 'error'   ? 'bg-destructive' : 'bg-muted-foreground',
            )} />
            <span className="font-semibold text-sm">
              {isRunning ? 'Выполняется...' :
               status.status.result === 'success' ? 'Успешно' :
               status.status.result === 'error'   ? 'Ошибка' : 'Ожидание'}
            </span>
            <button onClick={loadStatus} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Clock,     label: 'Последний запуск', value: formatDate(status.status.last_run) },
              { icon: Database,  label: 'Статус',           value: status.status.result ?? 'Нет данных' },
              { icon: Building2, label: 'Комплексов',       value: status.status.complexes },
              { icon: BedDouble, label: 'Квартир',          value: status.status.apartments?.toLocaleString('ru-RU') ?? '—' },
            ].map(s => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </div>
                <p className="font-semibold text-sm">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-background border rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Операции</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <ActionCard
            icon={Download}
            title="Загрузить фид"
            description="Скачать актуальные данные с внешних источников"
            busy={downloading}
            disabled={isRunning}
            onClick={handleDownload}
          />
          <ActionCard
            icon={RefreshCw}
            title="Синхронизировать поиск"
            description="Обновить поисковый индекс по загруженным данным"
            busy={syncing}
            disabled={isRunning}
            onClick={handleSync}
          />
        </div>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h2 className="font-semibold text-sm">Лог операций</h2>
            <button onClick={() => setLog([])} className="text-xs text-muted-foreground hover:text-foreground">
              Очистить
            </button>
          </div>
          <div className="p-4 space-y-1 max-h-64 overflow-y-auto">
            {log.map((line, i) => (
              <p key={i} className={cn(
                'text-xs font-mono',
                line.includes('✓') ? 'text-emerald-600' :
                line.includes('✗') ? 'text-destructive' : 'text-muted-foreground',
              )}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Last output */}
      {status?.status.output && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2">
            {status.status.result === 'success'
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <XCircle className="w-4 h-4 text-destructive" />}
            <h2 className="font-semibold text-sm">Вывод последней операции</h2>
          </div>
          <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
            {status.status.output}
          </pre>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  icon: Icon, title, description, busy, disabled, onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-2 p-4 rounded-xl border hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className={cn('w-4 h-4 text-primary', busy && 'animate-spin')} />
      </div>
      <div>
        <p className="font-medium text-sm">{busy ? 'Выполняется…' : title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}
