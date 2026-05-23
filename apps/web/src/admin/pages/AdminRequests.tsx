import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { ApiError, apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import CrmWorkloadStrip, { SlaBadge } from '@/admin/components/CrmWorkloadStrip';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { CRM_CACHE_OPERATIONAL, CRM_CACHE_REFERENCE } from '@/admin/lib/crm-cache-policy';
import { crmInvalidate } from '@/admin/lib/crm-invalidation';
import { crmQueryOptions } from '@/admin/lib/crm-query-options';
import {
  REQUEST_STATUS_CLASS,
  REQUEST_STATUS_LABEL,
  REQUEST_TYPE_LABEL,
  STATUS_FILTER_OPTIONS,
  formatRequestDate,
  telHrefFromPhone,
  type RequestStatusKey,
} from '@/admin/lib/request-crm';
import { computeSlaClient, rowUrgencyClass, type SlaStateKey } from '@/admin/lib/request-sla';
import { useSmartPollInterval, useCrmPollMeta } from '@/admin/hooks/useSmartPollInterval';
import { crmObsListFetch } from '@/admin/lib/crm-observability';

const REQUESTS_LIST_KEY = CRM_QUERY_KEYS.requests.listPrefix;

interface RequestRow {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  type: string;
  status: string;
  comment: string | null;
  sourceUrl: string | null;
  blockId: number | null;
  listingId: number | null;
  telegramSent: boolean;
  createdAt: string;
  lastActivityAt: string;
  assignedUser: { id: string; fullName: string | null; email: string } | null;
  assignedTo: string | null;
  slaState?: SlaStateKey;
  inactiveLabel?: string;
}

interface PaginatedResult {
  data: RequestRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number; sort?: string };
}

type AssigneeRow = { id: string; role: string; fullName: string | null; email: string | null };

export default function AdminRequests() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    const sla = searchParams.get('sla');
    if (sla === 'overdue' || sla === 'stale') setSlaFilter(sla);
    const assignee = searchParams.get('assigned_to');
    if (assignee === 'none') setAssigneeFilter('none');
  }, [searchParams]);

  const pollInterval = useSmartPollInterval('requestQueue');
  const { online } = useCrmPollMeta();

  const assigneesQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.requests.assignees,
    queryFn: () => apiGet<AssigneeRow[]>('/admin/requests/assignees'),
    ...crmQueryOptions({ ...CRM_CACHE_REFERENCE }),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...REQUESTS_LIST_KEY, statusFilter, assigneeFilter, searchDebounced, slaFilter, page],
    queryFn: async () => {
      const t0 = performance.now();
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('per_page', String(perPage));
      sp.set('sort', 'priority');
      if (statusFilter) sp.set('status', statusFilter);
      if (assigneeFilter) sp.set('assigned_to', assigneeFilter);
      if (searchDebounced.trim()) sp.set('search', searchDebounced.trim());
      if (slaFilter) sp.set('sla', slaFilter);
      const result = await apiGet<PaginatedResult>(`/admin/requests?${sp}`);
      const slaT0 = performance.now();
      const enriched = result.data.map((r) => {
        const sla = computeSlaClient(r);
        return { ...r, ...sla };
      });
      crmObsListFetch(performance.now() - t0, enriched.length, performance.now() - slaT0);
      return { ...result, data: enriched };
    },
    refetchInterval: pollInterval === false ? false : pollInterval,
    ...crmQueryOptions({
      staleTime: CRM_CACHE_OPERATIONAL.staleTime,
      gcTime: CRM_CACHE_OPERATIONAL.gcTime,
      enabled: online,
    }),
  });

  const meta = data?.meta;
  const rows = data?.data ?? [];

  const applySearch = () => {
    setSearchDebounced(search);
    setPage(1);
  };

  const handleSlaFilter = (v: string) => {
    setSlaFilter(v);
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl pb-24">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ClipboardList className="w-6 h-6 text-primary shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold truncate">Заявки</h1>
          {meta ? <span className="text-sm text-muted-foreground">({meta.total})</span> : null}
        </div>
        <button
          type="button"
          onClick={() => void crmInvalidate(qc, 'requests_manual', { force: true })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground shrink-0"
        >
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      <CrmWorkloadStrip slaFilter={slaFilter} onSlaFilter={handleSlaFilter} />

      <div className="sticky top-0 z-10 bg-muted/30 backdrop-blur-sm -mx-4 px-4 py-3 mb-4 space-y-3 border-b border-border/50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Поиск: имя, телефон, #id…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border text-sm bg-background"
            />
          </div>
          <button type="button" onClick={applySearch} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm">
            Найти
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={assigneeFilter}
          onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border px-2 text-xs bg-background w-full sm:w-auto"
        >
          <option value="">Все исполнители</option>
          <option value="none">Не назначены</option>
          {(assigneesQuery.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {(a.fullName ?? a.email ?? a.id).trim()} ({a.role})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!isLoading && rows.length === 0 ? (
        <div className="bg-background border rounded-2xl p-12 text-center text-sm text-muted-foreground">
          Нет заявок
        </div>
      ) : null}

      <div className="md:hidden space-y-3">
        {rows.map((r) => {
          const sla = r.slaState ?? computeSlaClient(r).slaState;
          return (
            <Link
              key={r.id}
              to={`/admin/requests/${r.id}`}
              className={cn(
                'block rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors',
                rowUrgencyClass(sla),
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">#{r.id} {r.name || 'Без имени'}</p>
                  <p className="text-xs text-muted-foreground">{REQUEST_TYPE_LABEL[r.type] ?? r.type}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', REQUEST_STATUS_CLASS[r.status as RequestStatusKey] ?? 'bg-muted')}>
                    {REQUEST_STATUS_LABEL[r.status as RequestStatusKey] ?? r.status}
                  </span>
                  <SlaBadge slaState={sla} inactiveLabel={r.inactiveLabel} compact />
                </div>
              </div>
              <p className="text-sm">{r.phone}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {r.assignedUser?.fullName ?? r.assignedUser?.email ?? 'Не назначен'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                активность {formatRequestDate(r.lastActivityAt)}
              </p>
            </Link>
          );
        })}
      </div>

      {rows.length > 0 ? (
        <div className="hidden md:block bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">SLA</th>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Клиент</th>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Менеджер</th>
                  <th className="px-4 py-3 font-medium">Активность</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const sla = r.slaState ?? computeSlaClient(r).slaState;
                  return (
                    <tr
                      key={r.id}
                      className={cn('hover:bg-muted/50', rowUrgencyClass(sla), sla === 'ARCHIVED' && 'opacity-60')}
                    >
                      <td className="px-4 py-3">
                        <SlaBadge slaState={sla} inactiveLabel={r.inactiveLabel} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{r.name || '—'}</span>
                        <p className="text-[11px] text-muted-foreground">{REQUEST_TYPE_LABEL[r.type] ?? r.type}</p>
                      </td>
                      <td className="px-4 py-3">
                        {r.phone ? (
                          <a href={telHrefFromPhone(r.phone)} className="hover:text-primary">{r.phone}</a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-lg', REQUEST_STATUS_CLASS[r.status as RequestStatusKey] ?? 'bg-muted')}>
                          {REQUEST_STATUS_LABEL[r.status as RequestStatusKey] ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.assignedUser?.fullName ?? r.assignedUser?.email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRequestDate(r.lastActivityAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/requests/${r.id}`} className="text-xs text-primary hover:underline">
                          Открыть
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {meta && meta.total_pages > 1 ? (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">Стр. {meta.page} из {meta.total_pages}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))} disabled={page >= meta.total_pages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
