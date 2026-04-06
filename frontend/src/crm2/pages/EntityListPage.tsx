import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntityType, useEntityTypes } from '../hooks/useEntityTypes';
import { useEntitiesList } from '../hooks/useEntities';
import { useEntityBulkMutations } from '../hooks/useEntityBulk';
import { EntityFilters, filtersToQueryParams, type FilterState } from '../components/EntityFilters';
import { EntityTable } from '../components/EntityTable';
import type { EntityFieldSchema } from '../types/schema';

function TableSkeleton({ colCount }: { colCount: number }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex gap-2 p-2 border-b bg-muted/40 items-center">
        <Skeleton className="h-8 w-8 shrink-0" />
        <Skeleton className="h-8 w-12 shrink-0" />
        {Array.from({ length: colCount }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 min-w-[80px]" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} className="flex gap-2 p-2 border-b border-border/60 items-center">
          <Skeleton className="h-6 w-8 shrink-0" />
          <Skeleton className="h-6 w-12 shrink-0" />
          {Array.from({ length: colCount }).map((_, i) => (
            <Skeleton key={i} className="h-6 flex-1 min-w-[80px]" />
          ))}
        </div>
      ))}
    </div>
  );
}

function parseBulkValue(field: EntityFieldSchema, raw: string): unknown {
  if (raw === '') {
    return null;
  }
  if (field.ui_type === 'number') {
    return field.type === 'float' ? parseFloat(raw) : parseInt(raw, 10);
  }
  if (field.ui_type === 'boolean') {
    return raw === '1' || raw === 'true';
  }
  if (field.ui_type === 'relation') {
    return parseInt(raw, 10);
  }
  return raw;
}

export default function EntityListPage() {
  const { type: typeParam } = useParams<{ type: string }>();
  const type = typeParam ?? '';
  const { data: types } = useEntityTypes();
  const schema = useEntityType(type, types);
  const { bulkDelete, bulkUpdate, bulkRestore } = useEntityBulkMutations(type);

  const [filterDraft, setFilterDraft] = useState<FilterState>({});
  const [filterApplied, setFilterApplied] = useState<FilterState>({});
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deletedScope, setDeletedScope] = useState<'active' | 'only' | 'with'>('active');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFieldCode, setBulkFieldCode] = useState('');
  const [bulkRaw, setBulkRaw] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filterParams = useMemo(() => {
    if (!schema) return {};
    return filtersToQueryParams(filterApplied, schema.fields);
  }, [filterApplied, schema]);

  const listQuery = useEntitiesList(type, {
    cursor,
    per_page: 20,
    sort: sortField,
    sort_dir: sortDir,
    search: debouncedSearch || undefined,
    deleted: deletedScope,
    filters: filterParams,
  });

  const rows = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const resetListState = useCallback(() => {
    setCursor(undefined);
    setSelected(new Set());
  }, []);

  useEffect(() => {
    resetListState();
  }, [type, debouncedSearch, sortField, sortDir, filterApplied, deletedScope, resetListState]);

  const onSort = (code: string) => {
    if (sortField !== code) {
      setSortField(code);
      setSortDir('asc');
    } else {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    }
  };

  const toggle = (id: number, add: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (add) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (ids: number[], add: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const id of ids) {
        if (add) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const bulkField = schema?.fields.find(f => f.code === bulkFieldCode);

  const runBulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Удалить записи: ${ids.join(', ')}?`)) return;
    try {
      await bulkDelete.mutateAsync(ids);
      setSelected(new Set());
      toast.success('Записи удалены');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const runBulkUpdate = async () => {
    if (!bulkField || !schema) return;
    const ids = [...selected];
    if (!ids.length) return;
    const v = parseBulkValue(bulkField, bulkRaw);
    try {
      await bulkUpdate.mutateAsync({ ids, values: { [bulkField.code]: v } });
      setBulkOpen(false);
      setSelected(new Set());
      setBulkRaw('');
      toast.success('Записи обновлены');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const runBulkRestore = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      await bulkRestore.mutateAsync(ids);
      setSelected(new Set());
      toast.success('Записи восстановлены');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  if (!schema) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Загрузка схемы…
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{schema.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">{schema.code}</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/40 p-8 text-center space-y-3 max-w-lg">
          <p className="text-destructive">{(listQuery.error as Error).message}</p>
          <Button type="button" variant="outline" onClick={() => listQuery.refetch()}>
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  const showInitialSkeleton = listQuery.isLoading && !listQuery.data;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{schema.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{schema.code}</p>
        </div>
        <Button asChild>
          <Link to={`/crm2/entities/${type}/create`}>
            <Plus className="w-4 h-4 mr-1" />
            Создать
          </Link>
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Быстрый поиск…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          type="button"
          size="sm"
          variant={deletedScope === 'active' ? 'default' : 'outline'}
          onClick={() => setDeletedScope('active')}
        >
          Активные
        </Button>
        <Button
          type="button"
          size="sm"
          variant={deletedScope === 'only' ? 'default' : 'outline'}
          onClick={() => setDeletedScope('only')}
        >
          Удалённые
        </Button>
        <Button
          type="button"
          size="sm"
          variant={deletedScope === 'with' ? 'default' : 'outline'}
          onClick={() => setDeletedScope('with')}
        >
          Все
        </Button>
      </div>

      <EntityFilters
        fields={schema.fields}
        values={filterDraft}
        onChange={setFilterDraft}
        onApply={() => {
          setFilterApplied({ ...filterDraft });
        }}
        onReset={() => {
          setFilterDraft({});
          setFilterApplied({});
        }}
      />

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50 border text-sm">
          <span className="font-medium">Выбрано: {selected.size}</span>
          {deletedScope === 'only' ? (
            <Button size="sm" variant="secondary" disabled={bulkRestore.isPending} onClick={runBulkRestore}>
              {bulkRestore.isPending ? 'Восстановление…' : 'Восстановить'}
            </Button>
          ) : (
            <Button size="sm" variant="destructive" disabled={bulkDelete.isPending} onClick={runBulkDelete}>
              {bulkDelete.isPending ? 'Удаление…' : 'Удалить'}
            </Button>
          )}
          <Button size="sm" variant="secondary" type="button" onClick={() => setBulkOpen(true)}>
            Изменить поле…
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Снять выделение
          </Button>
        </div>
      ) : null}

      {listQuery.isFetching && !showInitialSkeleton ? (
        <div className="flex items-center gap-2 text-muted-foreground mb-2 text-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Обновление…
        </div>
      ) : null}

      {showInitialSkeleton ? (
        <TableSkeleton colCount={schema.fields.length} />
      ) : (
        <EntityTable
          fields={schema.fields}
          rows={rows}
          sortField={sortField}
          sortDir={sortDir}
          onSort={onSort}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      )}

      <div className="flex justify-between items-center mt-4">
        <p className="text-xs text-muted-foreground">
          Cursor pagination · на странице {meta?.count ?? rows.length}
          {meta?.has_more ? ' · есть ещё' : ''}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!cursor}
            onClick={() => {
              setCursor(undefined);
            }}
          >
            В начало
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!meta?.has_more || !meta?.next_cursor}
            onClick={() => setCursor(meta?.next_cursor ?? undefined)}
          >
            Следующая
          </Button>
        </div>
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Массовое обновление</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Поле</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={bulkFieldCode}
                onChange={e => {
                  setBulkFieldCode(e.target.value);
                  setBulkRaw('');
                }}
              >
                <option value="">— выберите —</option>
                {[...schema.fields]
                  .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
                  .map(f => (
                    <option key={f.code} value={f.code}>
                      {f.name} ({f.code})
                    </option>
                  ))}
              </select>
            </div>
            {bulkField ? (
              <div className="space-y-1">
                <Label>Новое значение</Label>
                {bulkField.ui_type === 'boolean' ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={bulkRaw}
                    onChange={e => setBulkRaw(e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="1">Да</option>
                    <option value="0">Нет</option>
                  </select>
                ) : bulkField.ui_type === 'select' && bulkField.options.length ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={bulkRaw}
                    onChange={e => setBulkRaw(e.target.value)}
                  >
                    <option value="">—</option>
                    {bulkField.options.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={bulkRaw}
                    onChange={e => setBulkRaw(e.target.value)}
                    type={bulkField.ui_type === 'number' || bulkField.ui_type === 'relation' ? 'number' : 'text'}
                  />
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              Отмена
            </Button>
            <Button type="button" disabled={!bulkField || bulkUpdate.isPending} onClick={runBulkUpdate}>
              {bulkUpdate.isPending ? 'Сохранение…' : 'Применить ко всем'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
