import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  bulkAcceptCrmLeadRequests,
  getCrmLeadRequests,
  getCrmLeadRequestsExportUrl,
  updateCrmLeadRequestStatus,
  type CrmLeadRequest,
} from '../../api/requests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU');
}

function ageMinutes(iso: string | null): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

export default function RequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<CrmLeadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page') || 1)));
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState<'all' | 'new' | 'accepted'>(() => {
    const v = searchParams.get('status');
    return v === 'new' || v === 'accepted' ? v : 'all';
  });
  const [sla, setSla] = useState<'' | '30' | '60'>(() => {
    const v = searchParams.get('sla');
    return v === '30' || v === '60' ? v : '';
  });
  const [sort, setSort] = useState<'priority' | 'latest'>(() => {
    const v = searchParams.get('sort');
    return v === 'latest' ? 'latest' : 'priority';
  });
  const [mineOnly, setMineOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [criticalAlertPulse, setCriticalAlertPulse] = useState(false);
  const [alertsMuted, setAlertsMuted] = useState(false);
  const [stats, setStats] = useState({
    new_total: 0,
    accepted_total: 0,
    new_today: 0,
    accepted_today: 0,
    sla_over_30m: 0,
    sla_over_60m: 0,
  });

  const queryStatus = useMemo(() => (status === 'all' ? '' : status), [status]);

  useEffect(() => {
    setMineOnly(searchParams.get('mine') === '1');
    setUnassignedOnly(searchParams.get('unassigned') === '1');
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (page > 1) next.set('page', String(page));
    if (status !== 'all') next.set('status', status);
    if (sla) next.set('sla', sla);
    if (sort !== 'priority') next.set('sort', sort);
    if (search.trim()) next.set('search', search.trim());
    if (mineOnly) next.set('mine', '1');
    if (unassignedOnly) next.set('unassigned', '1');
    setSearchParams(next, { replace: true });
  }, [page, status, sla, sort, search, mineOnly, unassignedOnly, setSearchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('crm.requests.alertsMuted');
    setAlertsMuted(saved === '1');
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    getCrmLeadRequests({
      page,
      per_page: 20,
      status: queryStatus,
      search: search.trim() || undefined,
      sla,
      sort,
      mine: mineOnly,
      unassigned: unassignedOnly,
    })
      .then((res) => {
        setItems(res.data);
        setPages(Math.max(1, res.meta.pages || 1));
        setStats(res.meta.stats ?? {
          new_total: 0,
          accepted_total: 0,
          new_today: 0,
          accepted_today: 0,
          sla_over_30m: 0,
          sla_over_60m: 0,
        });
        setSelectedIds((prev) => prev.filter((id) => res.data.some((x) => x.id === id)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, queryStatus, search, sla, sort, mineOnly, unassignedOnly]);

  useEffect(() => {
    const timer = setInterval(() => {
      const prevCritical = stats.sla_over_60m;
      getCrmLeadRequests({
        page,
        per_page: 20,
        status: queryStatus,
        search: search.trim() || undefined,
        sla,
        sort,
        mine: mineOnly,
        unassigned: unassignedOnly,
      })
        .then((res) => {
          setItems(res.data);
          setPages(Math.max(1, res.meta.pages || 1));
          setStats(res.meta.stats ?? {
            new_total: 0,
            accepted_total: 0,
            new_today: 0,
            accepted_today: 0,
            sla_over_30m: 0,
            sla_over_60m: 0,
          });
          setSelectedIds((prev) => prev.filter((id) => res.data.some((x) => x.id === id)));
          const nextCritical = res.meta.stats?.sla_over_60m ?? 0;
          if (nextCritical > prevCritical && !alertsMuted) {
            const diff = nextCritical - prevCritical;
            toast.warning(`Появилось ${diff} новых критичных заявок (SLA > 60 мин)`);
            setCriticalAlertPulse(true);
            setTimeout(() => setCriticalAlertPulse(false), 4000);
          }
        })
        .catch(() => null);
    }, 15000);
    return () => clearInterval(timer);
  }, [page, queryStatus, search, sla, sort, mineOnly, unassignedOnly, stats.sla_over_60m, alertsMuted]);

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Заявки</h1>
          <p className="text-sm text-muted-foreground">
            Список входящих заявок с сайта и Telegram
            {stats.sla_over_60m > 0 ? (
              <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${criticalAlertPulse ? 'bg-red-600 text-white animate-pulse' : 'bg-red-100 text-red-700'}`}>
                Критичные: {stats.sla_over_60m}
              </span>
            ) : null}
          </p>
        </div>
        <Button asChild variant="outline">
          <a
            href={getCrmLeadRequestsExportUrl({
              status: queryStatus || undefined,
              search: search.trim() || undefined,
              sla,
              sort,
              mine: mineOnly,
              unassigned: unassignedOnly,
            })}
          >
            Экспорт CSV
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            setStatus('new');
            setSla('60');
            setSort('priority');
          }}
        >
          Показать просроченные &gt;60
        </Button>
        <Button disabled={selectedIds.length === 0} onClick={() => setConfirmBulkOpen(true)}>
          Принять выбранные ({selectedIds.length})
        </Button>
        <Button
          variant={alertsMuted ? 'secondary' : 'outline'}
          onClick={() => {
            const next = !alertsMuted;
            setAlertsMuted(next);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('crm.requests.alertsMuted', next ? '1' : '0');
            }
          }}
        >
          {alertsMuted ? 'Тихий режим: вкл' : 'Тихий режим: выкл'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="rounded-xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">Новые (всего)</p>
          <p className="text-lg font-semibold">{stats.new_total}</p>
        </div>
        <div className="rounded-xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">Принятые (всего)</p>
          <p className="text-lg font-semibold">{stats.accepted_total}</p>
        </div>
        <div className="rounded-xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">Новые сегодня</p>
          <p className="text-lg font-semibold">{stats.new_today}</p>
        </div>
        <div className="rounded-xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">Принятые сегодня</p>
          <p className="text-lg font-semibold">{stats.accepted_today}</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-3">
          <p className="text-xs text-amber-700">SLA: &gt; 30 мин</p>
          <p className="text-lg font-semibold text-amber-800">{stats.sla_over_30m}</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-3">
          <p className="text-xs text-red-700">SLA: &gt; 60 мин</p>
          <p className="text-lg font-semibold text-red-800">{stats.sla_over_60m}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Поиск: имя, телефон, тип"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <Button variant={status === 'all' ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus('all'); }}>
          Все
        </Button>
        <Button variant={status === 'new' ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus('new'); }}>
          Новые
        </Button>
        <Button variant={status === 'accepted' ? 'default' : 'outline'} onClick={() => { setPage(1); setStatus('accepted'); }}>
          Принятые
        </Button>
        <Button variant={sla === '' ? 'default' : 'outline'} onClick={() => { setPage(1); setSla(''); }}>
          SLA: все
        </Button>
        <Button variant={sla === '30' ? 'default' : 'outline'} onClick={() => { setPage(1); setSla('30'); }}>
          SLA &gt; 30
        </Button>
        <Button variant={sla === '60' ? 'default' : 'outline'} onClick={() => { setPage(1); setSla('60'); }}>
          SLA &gt; 60
        </Button>
        <Button variant={sort === 'priority' ? 'default' : 'outline'} onClick={() => { setPage(1); setSort('priority'); }}>
          Сначала старые новые
        </Button>
        <Button variant={sort === 'latest' ? 'default' : 'outline'} onClick={() => { setPage(1); setSort('latest'); }}>
          По дате создания
        </Button>
        <Button
          variant={mineOnly ? 'default' : 'outline'}
          onClick={() => {
            setPage(1);
            setMineOnly((prev) => !prev);
          }}
        >
          Только мои принятые
        </Button>
        <Button
          variant={unassignedOnly ? 'default' : 'outline'}
          onClick={() => {
            setPage(1);
            setUnassignedOnly((prev) => !prev);
          }}
        >
          Без назначенного менеджера
        </Button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="rounded-2xl border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Дата</th>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(items.map((x) => x.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <th className="p-3">Клиент</th>
              <th className="p-3">Тип</th>
              <th className="p-3">Объект</th>
              <th className="p-3">Статус</th>
              <th className="p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-muted-foreground" colSpan={7}>Загрузка...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-4 text-muted-foreground" colSpan={7}>Нет заявок</td></tr>
            ) : (
              items.map((r) => {
                const age = ageMinutes(r.created_at);
                const overdue60 = r.status === 'new' && age >= 60;
                const overdue30 = r.status === 'new' && age >= 30;
                return (
                <tr
                  key={r.id}
                  className={`border-t align-top ${overdue60 ? 'bg-red-50/60' : overdue30 ? 'bg-amber-50/60' : ''}`}
                >
                  <td className="p-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={(e) => {
                        setSelectedIds((prev) =>
                          e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id)
                        );
                      }}
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-muted-foreground">{r.phone}</div>
                  </td>
                  <td className="p-3">{r.kind}</td>
                  <td className="p-3">
                    {r.object_url ? (
                      <a href={r.object_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {r.object_name || r.object_url}
                      </a>
                    ) : (r.object_name || '—')}
                  </td>
                  <td className="p-3">
                    {r.status === 'accepted' ? (
                      <span className="text-emerald-700">
                        Принята{r.accepted_by ? ` (${r.accepted_by})` : ''}{r.accepted_at ? ` · ${formatDate(r.accepted_at)}` : ''}
                      </span>
                    ) : (
                      <span className={overdue60 ? 'text-red-700' : overdue30 ? 'text-amber-700' : 'text-amber-700'}>
                        Новая{overdue30 ? ` · ${age} мин` : ''}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {r.status !== 'accepted' ? (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await updateCrmLeadRequestStatus(r.id, 'accepted');
                            setItems((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'accepted' } : x));
                            toast.success('Заявка принята');
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Не удалось принять заявку');
                          }
                        }}
                      >
                        Принять
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateCrmLeadRequestStatus(r.id, 'new');
                            setItems((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'new', accepted_by: null } : x));
                            toast.success('Заявка возвращена в новые');
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Не удалось изменить статус заявки');
                          }
                        }}
                      >
                        Вернуть в новые
                      </Button>
                    )}
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Страница {page} из {pages}</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Назад</Button>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Вперёд</Button>
        </div>
      </div>
      <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите массовое принятие</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь принять {selectedIds.length} заявок. Действие можно будет откатить вручную для каждой заявки.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkSubmitting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkSubmitting}
              onClick={async (e) => {
                e.preventDefault();
                setBulkSubmitting(true);
                try {
                  await bulkAcceptCrmLeadRequests(selectedIds);
                  setSelectedIds([]);
                  const res = await getCrmLeadRequests({
                    page,
                    per_page: 20,
                    status: queryStatus,
                    search: search.trim() || undefined,
                    sla,
                    sort,
                    mine: mineOnly,
                    unassigned: unassignedOnly,
                  });
                  setItems(res.data);
                  setPages(Math.max(1, res.meta.pages || 1));
                  setStats(res.meta.stats ?? stats);
                  setConfirmBulkOpen(false);
                  toast.success('Выбранные заявки приняты');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Не удалось выполнить массовое принятие');
                } finally {
                  setBulkSubmitting(false);
                }
              }}
            >
              {bulkSubmitting ? 'Обработка...' : 'Подтвердить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
