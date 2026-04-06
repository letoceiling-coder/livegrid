import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntityHistory } from '../hooks/useEntityHistory';
import { useEntityRecord } from '../hooks/useEntityForm';
import type { EntityHistoryItemDto } from '../types/schema';
import { v2 } from '../api/v2Client';
import { entityListSearchParams } from '../lib/queryParams';

function actionLabel(action: string): string {
  return (
    {
      created: 'Создание',
      updated: 'Обновление',
      deleted: 'Удаление',
      restored: 'Восстановление',
    }[action] ?? action
  );
}

function toText(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return v.map(x => String(x)).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

type DiffRow = { field: string; oldValue: unknown; newValue: unknown };

function extractRollbackValues(item: EntityHistoryItemDto): Record<string, unknown> | null {
  if (item.action !== 'updated') return null;
  const d = item.diff ?? {};
  const changed = (d as { changed?: Record<string, { old?: unknown; new?: unknown }> }).changed;
  if (!changed || typeof changed !== 'object') return null;

  const out: Record<string, unknown> = {};
  for (const [field, pair] of Object.entries(changed)) {
    out[field] = pair?.old ?? null;
  }
  return Object.keys(out).length ? out : null;
}

function extractDiffRows(item: EntityHistoryItemDto): DiffRow[] {
  const d = item.diff ?? {};
  const changed = (d as { changed?: Record<string, { old?: unknown; new?: unknown }> }).changed;
  if (changed && typeof changed === 'object') {
    return Object.entries(changed).map(([field, pair]) => ({
      field,
      oldValue: pair?.old ?? null,
      newValue: pair?.new ?? null,
    }));
  }

  const values = (d as { values?: Record<string, unknown> }).values;
  if (item.action === 'created' && values && typeof values === 'object') {
    return Object.entries(values).map(([field, newValue]) => ({ field, oldValue: null, newValue }));
  }

  const before = (d as { before?: Record<string, unknown> }).before;
  if (item.action === 'deleted' && before && typeof before === 'object') {
    return Object.entries(before).map(([field, oldValue]) => ({ field, oldValue, newValue: null }));
  }

  return [];
}

export default function EntityHistoryPage() {
  const { type: typeParam, id: idParam } = useParams<{ type: string; id: string }>();
  const type = typeParam ?? '';
  const id = idParam ?? '';
  const qc = useQueryClient();
  const recordQ = useEntityRecord(type, id);
  const [action, setAction] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const q = useEntityHistory(type, id, {
    per_page: 50,
    action: action || undefined,
    user_id: userId || undefined,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
  });
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const items = useMemo(() => q.data?.pages.flatMap(p => p.data) ?? [], [q.data]);

  const rollback = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return v2.put(`/entities/${id}`, values);
    },
    onSuccess: async () => {
      toast.success('Изменения восстановлены');
      qc.invalidateQueries({ queryKey: ['v2', 'entity', type, id] });
      await q.refetch();
    },
    onError: (e: unknown) => {
      const ex = e as { message?: string };
      toast.error(ex.message || 'Не удалось восстановить');
    },
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Загрузка истории…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{(q.error as Error).message}</p>
        <Button type="button" variant="outline" onClick={() => q.refetch()}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link to={`/crm2/entities/${type}/${id}`}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Назад к записи
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">История изменений #{id}</h1>

      <div className="rounded-lg border p-4 bg-muted/20">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Действие</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={action}
              onChange={e => setAction(e.target.value)}
            >
              <option value="">Все</option>
              <option value="created">created</option>
              <option value="updated">updated</option>
              <option value="deleted">deleted</option>
              <option value="restored">restored</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">user_id</Label>
            <Input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="5"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">С даты</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">По дату</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label className="text-xs">Поиск по diff (поле/значение)</Label>
            <Input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="price" />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">История пуста</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const key = item.id;
            const expanded = !!open[key];
            const diffRows = extractDiffRows(item);
            const rollbackValues = extractRollbackValues(item);
            const recordUpdatedAt = recordQ.data?.data?.updated_at ?? null;
            const itemCreatedAt = item.created_at ?? null;
            const hasConcurrentChange =
              !!recordUpdatedAt && !!itemCreatedAt && Date.parse(recordUpdatedAt) > Date.parse(itemCreatedAt);

            return (
              <section key={item.id} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 bg-muted/30 hover:bg-muted/50 flex flex-wrap items-center gap-3"
                  onClick={() => setOpen(prev => ({ ...prev, [key]: !expanded }))}
                >
                  <span className="font-medium">{actionLabel(item.action)}</span>
                  {hasConcurrentChange ? (
                    <span className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200">
                      warning: updated_at новее события
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {item.user ? `${item.user.name} · ${item.user.email}` : `user_id: ${item.user_id ?? '—'}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
                  </span>
                  <span className="ml-auto text-muted-foreground">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                </button>

                {expanded ? (
                  <div className="p-4 text-sm">
                    {rollbackValues ? (
                      <div className="mb-3 flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={rollback.isPending}
                          onClick={e => {
                            e.stopPropagation();
                            const msg = hasConcurrentChange
                              ? 'WARNING: запись менялась после этого события (updated_at новее). Rollback может перезаписать свежие изменения. Продолжить?'
                              : 'Восстановить изменённые поля к старым значениям?';
                            if (!window.confirm(msg)) return;
                            rollback.mutate(rollbackValues);
                          }}
                        >
                          {rollback.isPending ? 'Восстановление…' : 'Восстановить значения'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={e => {
                            e.stopPropagation();
                            const qs = entityListSearchParams({
                              action: action || undefined,
                              user_id: userId || undefined,
                              from: from || undefined,
                              to: to || undefined,
                              search: debouncedSearch || undefined,
                            });
                            window.open(`/api/v2/entities/${type}/${id}/history/export?${qs}&format=csv`, '_blank');
                          }}
                        >
                          Экспорт CSV
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={e => {
                            e.stopPropagation();
                            const qs = entityListSearchParams({
                              action: action || undefined,
                              user_id: userId || undefined,
                              from: from || undefined,
                              to: to || undefined,
                              search: debouncedSearch || undefined,
                            });
                            window.open(`/api/v2/entities/${type}/${id}/history/export?${qs}&format=json`, '_blank');
                          }}
                        >
                          Экспорт JSON
                        </Button>
                      </div>
                    ) : null}
                    {diffRows.length === 0 ? (
                      <p className="text-muted-foreground">Нет изменённых полей.</p>
                    ) : (
                      <div className="space-y-2">
                        {diffRows.map(r => (
                          <div key={`${item.id}-${r.field}`} className="rounded border border-muted bg-background p-3">
                            <div className="font-mono text-xs text-muted-foreground mb-1">{r.field}</div>
                            <div className="grid md:grid-cols-2 gap-2">
                              <div>
                                <span className="text-xs text-muted-foreground">old</span>
                                <div className="font-mono text-xs px-2 py-1 rounded bg-red-50 text-red-800 border border-red-200">
                                  {toText(r.oldValue)}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">new</span>
                                <div className="font-mono text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {toText(r.newValue)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {q.hasNextPage ? (
        <div className="pt-2">
          <Button type="button" variant="outline" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            {q.isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

