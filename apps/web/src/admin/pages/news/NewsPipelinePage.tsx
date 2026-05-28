import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

type WorkflowStatus = 'NEW' | 'REWRITTEN' | 'DRAFT' | 'PUBLISHED' | 'ERROR';

interface NewsRow {
  id: number;
  slug: string;
  title: string;
  body: string | null;
  originalText: string | null;
  rewrittenText: string | null;
  imageUrl: string | null;
  mediaFiles?: { id: number; url: string }[];
  source: string | null;
  isPublished: boolean;
  workflowStatus: WorkflowStatus;
  telegramChannelId: number | null;
  aiProvider: string | null;
  aiModel: string | null;
  rewriteTokens: number | null;
  rewriteCostUsd: string | null;
  rewriteDurationMs: number | null;
  errorMessage: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface PaginatedResult {
  data: NewsRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

interface RegionRow {
  id: number;
  code: string;
  name: string;
}

interface TelegramChannelRow {
  id: number;
  regionId: number;
  channelRef: string;
  label: string | null;
  avatarUrl: string | null;
  isEnabled: boolean;
  limitPerRun: number;
  lastSyncAt: string | null;
  postsImportedCount: number;
}

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  NEW: 'Новый',
  REWRITTEN: 'Переписан',
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликован',
  ERROR: 'Ошибка',
};

const STATUS_COLORS: Record<WorkflowStatus, string> = {
  NEW: 'bg-zinc-100 text-zinc-700',
  REWRITTEN: 'bg-blue-100 text-blue-800',
  DRAFT: 'bg-orange-100 text-orange-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  ERROR: 'bg-red-100 text-red-800',
};

function formatApiError(e: unknown): string {
  if (e instanceof ApiError) return e.message || `${e.status}`;
  return e instanceof Error ? e.message : 'Ошибка';
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function NewsPipelinePage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | ''>('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [channelSelection, setChannelSelection] = useState<Set<number>>(new Set());
  const [editor, setEditor] = useState<NewsRow | null>(null);

  const { data: channels = [] } = useQuery({
    queryKey: ['admin', 'news', 'telegram-channels'],
    queryFn: () => apiGet<TelegramChannelRow[]>('/admin/news/telegram-channels'),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'news', page, search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      return apiGet<PaginatedResult>(`/admin/news?${params}`);
    },
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'news'] });
    qc.invalidateQueries({ queryKey: ['admin', 'news', 'telegram-channels'] });
  };

  const importMutation = useMutation({
    mutationFn: (onlyChannelIds?: number[]) =>
      apiPost('/admin/news/import', {
        onlyChannelIds: onlyChannelIds?.length ? onlyChannelIds : null,
      }),
    onSuccess: () => {
      toast.success('Импорт поставлен в очередь');
      invalidate();
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const rewriteMutation = useMutation({
    mutationFn: (newsId: number) => apiPost('/admin/news/rewrite', { newsId }),
    onSuccess: () => {
      toast.success('Рерайт в очереди');
      invalidate();
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const rewriteBulkMutation = useMutation({
    mutationFn: (newsIds: number[]) =>
      apiPost('/admin/news/rewrite-all', { newsIds: newsIds.length ? newsIds : null, allNew: !newsIds.length }),
    onSuccess: () => {
      toast.success('Массовый рерайт в очереди');
      invalidate();
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const publishMutation = useMutation({
    mutationFn: (newsId: number) => apiPost('/admin/news/publish', { newsId }),
    onSuccess: () => {
      toast.success('Публикация в очереди');
      invalidate();
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const publishBulkMutation = useMutation({
    mutationFn: (newsIds: number[]) =>
      apiPost('/admin/news/publish-all', { newsIds: newsIds.length ? newsIds : null }),
    onSuccess: () => {
      toast.success('Массовая публикация в очереди');
      invalidate();
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const deleteBulkMutation = useMutation({
    mutationFn: (ids: number[]) => apiPost('/admin/news/bulk-delete', { ids }),
    onSuccess: () => {
      setSelected(new Set());
      toast.success('Удалено');
      invalidate();
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const saveEditor = useMutation({
    mutationFn: (payload: { id: number; patch: Record<string, unknown> }) =>
      apiPatch(`/admin/news/${payload.id}`, payload.patch),
    onSuccess: () => {
      toast.success('Сохранено');
      setEditor(null);
      invalidate();
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const channelMap = useMemo(() => {
    const m = new Map<number, TelegramChannelRow>();
    for (const c of channels) m.set(c.id, c);
    return m;
  }, [channels]);

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = [...selected];

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-7 h-7" />
            Новости — пайплайн
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Импорт → AI рерайт → публикация</p>
        </div>
        <Link
          to="/admin/settings/ai"
          className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border hover:bg-muted/50"
        >
          <Sparkles className="w-4 h-4" />
          Настройки AI
        </Link>
      </div>

      {/* Step 1 — Import */}
      <section className="bg-background border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-lg">1. Импорт</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={importMutation.isPending}
              onClick={() => importMutation.mutate(undefined)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Импортировать сейчас
            </button>
            <button
              type="button"
              disabled={importMutation.isPending || channelSelection.size === 0}
              onClick={() => importMutation.mutate([...channelSelection])}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium disabled:opacity-50"
            >
              Импортировать выбранные ({channelSelection.size})
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((ch) => {
            const checked = channelSelection.has(ch.id);
            return (
              <label
                key={ch.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                  checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
                  !ch.isEnabled && 'opacity-60',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!ch.isEnabled}
                  onChange={() =>
                    setChannelSelection((prev) => {
                      const next = new Set(prev);
                      if (next.has(ch.id)) next.delete(ch.id);
                      else next.add(ch.id);
                      return next;
                    })
                  }
                  className="mt-1"
                />
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {(ch.label ?? ch.channelRef).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{ch.label ?? ch.channelRef}</div>
                  <div className="text-xs text-muted-foreground truncate">{ch.channelRef}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Импортировано: {ch.postsImportedCount}
                    {ch.lastSyncAt && ` · ${new Date(ch.lastSyncAt).toLocaleString('ru-RU')}`}
                  </div>
                </div>
              </label>
            );
          })}
          {channels.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">Добавьте Telegram-каналы в настройках ниже (legacy блок).</p>
          )}
        </div>
      </section>

      {/* Sticky bulk toolbar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2 shadow-sm">
        <span className="text-sm text-muted-foreground mr-2">Выбрано: {selected.size}</span>
        <button
          type="button"
          disabled={rewriteBulkMutation.isPending}
          onClick={() => rewriteBulkMutation.mutate(selectedIds)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" /> Переписать
        </button>
        <button
          type="button"
          disabled={rewriteBulkMutation.isPending}
          onClick={() => rewriteBulkMutation.mutate([])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        >
          Все новые
        </button>
        <button
          type="button"
          disabled={publishBulkMutation.isPending || selected.size === 0}
          onClick={() => publishBulkMutation.mutate(selectedIds)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> Опубликовать
        </button>
        <button
          type="button"
          disabled={deleteBulkMutation.isPending || selected.size === 0}
          onClick={() => deleteBulkMutation.mutate(selectedIds)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm text-destructive disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> Удалить
        </button>
        <button
          type="button"
          onClick={() => invalidate()}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} /> Обновить
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск..."
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as WorkflowStatus | '');
            setPage(1);
          }}
          className="border rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          {(Object.keys(STATUS_LABELS) as WorkflowStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <section className="bg-background border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="p-3 w-10">
                  <button type="button" onClick={toggleAll} className="text-muted-foreground">
                    {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="p-3 w-16">Фото</th>
                <th className="p-3">Заголовок</th>
                <th className="p-3 hidden md:table-cell">Канал</th>
                <th className="p-3 hidden sm:table-cell">Дата</th>
                <th className="p-3">Статус</th>
                <th className="p-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Нет новостей
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const thumb = row.mediaFiles?.[0]?.url ?? row.imageUrl;
                const ch = row.telegramChannelId ? channelMap.get(row.telegramChannelId) : null;
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3">
                      <button type="button" onClick={() => toggleRow(row.id)}>
                        {selected.has(row.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="p-3">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-12 h-12 rounded-lg object-cover bg-muted" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted text-xs flex items-center justify-center text-muted-foreground">
                          —
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium line-clamp-2">{row.title}</div>
                      {row.rewriteTokens != null && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {row.aiProvider} · {row.rewriteTokens} tok
                          {row.rewriteCostUsd && ` · $${Number(row.rewriteCostUsd).toFixed(4)}`}
                        </div>
                      )}
                      {row.errorMessage && (
                        <div className="text-xs text-red-600 mt-0.5 line-clamp-1">{row.errorMessage}</div>
                      )}
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {ch?.label ?? ch?.channelRef ?? row.source ?? '—'}
                    </td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={row.workflowStatus} />
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <button
                          type="button"
                          title="Рерайт"
                          disabled={rewriteMutation.isPending}
                          onClick={() => rewriteMutation.mutate(row.id)}
                          className="p-2 rounded-lg hover:bg-muted"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Редактировать"
                          onClick={() => setEditor(row)}
                          className="p-2 rounded-lg hover:bg-muted"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Опубликовать"
                          disabled={publishMutation.isPending}
                          onClick={() => publishMutation.mutate(row.id)}
                          className="p-2 rounded-lg hover:bg-muted"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {meta && meta.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <span className="text-muted-foreground">
              {meta.total} записей · стр. {meta.page}/{meta.total_pages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 rounded-lg border disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-lg border disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Editor modal */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-background border-b px-5 py-4 flex justify-between items-center">
              <h3 className="font-semibold">Редактор</h3>
              <button type="button" onClick={() => setEditor(null)} className="text-sm text-muted-foreground">
                Закрыть
              </button>
            </div>
            <EditorForm
              row={editor}
              saving={saveEditor.isPending}
              onSave={(patch) => saveEditor.mutate({ id: editor.id, patch })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EditorForm({
  row,
  saving,
  onSave,
}: {
  row: NewsRow;
  saving: boolean;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [slug, setSlug] = useState(row.slug);
  const [body, setBody] = useState(row.rewrittenText ?? row.body ?? '');
  const [originalText, setOriginalText] = useState(row.originalText ?? row.body ?? '');
  const [seoTitle, setSeoTitle] = useState(row.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(row.seoDescription ?? '');
  const [tags, setTags] = useState((row.tags ?? []).join(', '));

  return (
    <div className="p-5 space-y-4">
      <div>
        <label className="text-sm font-medium">Заголовок</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium">Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm font-mono" />
      </div>
      <div>
        <label className="text-sm font-medium">Оригинал</label>
        <textarea
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          rows={4}
          className="w-full border rounded-xl px-3 py-2 mt-1 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Текст (рерайт)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="w-full border rounded-xl px-3 py-2 mt-1 text-sm"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">SEO title</label>
          <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Теги (через запятую)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full border rounded-xl px-3 py-2 mt-1 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">SEO description</label>
        <textarea
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          rows={2}
          className="w-full border rounded-xl px-3 py-2 mt-1 text-sm"
        />
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({
            title,
            slug,
            body,
            rewrittenText: body,
            originalText,
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            tags: tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
            workflowStatus: 'DRAFT',
          })
        }
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Сохранение…' : 'Сохранить черновик'}
      </button>
    </div>
  );
}
