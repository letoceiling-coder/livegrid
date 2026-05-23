import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import {
  LISTING_VISIBILITY_LABEL,
  LISTING_VISIBILITY_TABS,
  listingVisibilityClass,
} from '@/admin/lib/listingVisibility';
import { formatPrice } from '@/redesign/data/mock-data';

type Kind = 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'PARKING';

type ListingRow = {
  id: number;
  kind: Kind;
  price: string | number | null;
  title: string | null;
  address: string | null;
  visibility: string;
  status: string;
  updatedAt: string;
  lastActivityAt?: string | null;
  isStale?: boolean;
  dataSource: string;
  apartment?: { planUrl?: string | null } | null;
  house?: { photoUrl?: string | null } | null;
  land?: { photoUrl?: string | null } | null;
  commercial?: { photoUrl?: string | null } | null;
  parking?: null;
};

type Paginated = {
  data: ListingRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

function photoFor(row: ListingRow): string | null {
  return (
    row.apartment?.planUrl ??
    row.house?.photoUrl ??
    row.land?.photoUrl ??
    row.commercial?.photoUrl ??
    null
  );
}

function editPath(kind: Kind, id: number): string {
  switch (kind) {
    case 'APARTMENT':
      return `/admin/listings/manual/${id}/edit`;
    case 'HOUSE':
      return `/admin/listings/manual-house/${id}/edit`;
    case 'LAND':
      return `/admin/listings/manual-land/${id}/edit`;
    case 'COMMERCIAL':
      return `/admin/listings/manual-commercial/${id}/edit`;
    case 'PARKING':
      return `/admin/listings/manual-parking/${id}/edit`;
  }
}

function parseError(e: unknown): string {
  if (e instanceof ApiError) return e.message || String(e.status);
  if (e instanceof Error) return e.message;
  return 'Ошибка';
}

export default function AdminMyListings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof LISTING_VISIBILITY_TABS)[number]['key']>('PUBLIC');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const queryString = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      data_source: 'MANUAL',
      admin_view: 'true',
      scope: 'owned',
    });
    if (tab !== 'all') sp.set('visibility', tab);
    return sp.toString();
  }, [page, tab]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'my-listings', tab, page],
    queryFn: () => apiGet<Paginated>(`/admin/listings?${queryString}`),
    staleTime: 20_000,
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      apiPatch(`/admin/listings/${id}/lifecycle`, { action }),
    onSuccess: async () => {
      toast.success('Статус обновлён');
      await qc.invalidateQueries({ queryKey: ['admin', 'my-listings'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
    },
    onError: (e) => toast.error(parseError(e)),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-4 sm:p-6 max-w-6xl pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Home className="w-6 h-6 text-primary" />
            Мои объявления
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.fullName ?? user?.email} · только ваши MANUAL объекты
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border text-sm"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
          <Link
            to="/admin/listings/wizard/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Создать
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {LISTING_VISIBILITY_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={cn(
              'shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[44px]',
              tab === t.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">Нет объявлений в этой вкладке</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map((row) => {
            const photo = photoFor(row);
            return (
              <article
                key={row.id}
                className="rounded-xl border bg-card overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="sm:w-28 h-28 sm:h-auto bg-muted shrink-0">
                  {photo ? (
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      Нет фото
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 min-w-0 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {row.title || row.address || `#${row.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{row.address}</p>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full shrink-0',
                        listingVisibilityClass(row.visibility),
                      )}
                    >
                      {LISTING_VISIBILITY_LABEL[row.visibility as keyof typeof LISTING_VISIBILITY_LABEL] ??
                        row.visibility}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(Number(row.price ?? 0))}</p>
                  <p className="text-[10px] text-muted-foreground">
                    обновлено {new Date(row.updatedAt).toLocaleDateString('ru-RU')}
                    {row.isStale ? ' · рекомендуется обновить (30+ дн.)' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    <Link
                      to={editPath(row.kind, row.id)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-muted min-h-[36px]"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Редактировать
                    </Link>
                    {row.visibility === 'PUBLIC' ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-muted min-h-[36px]"
                        onClick={() => lifecycleMutation.mutate({ id: row.id, action: 'hide' })}
                      >
                        <EyeOff className="w-3.5 h-3.5" /> Скрыть
                      </button>
                    ) : null}
                    {row.visibility === 'HIDDEN' || row.visibility === 'ARCHIVED' ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-muted min-h-[36px]"
                        onClick={() => lifecycleMutation.mutate({ id: row.id, action: 'republish' })}
                      >
                        <Upload className="w-3.5 h-3.5" /> Опубликовать
                      </button>
                    ) : null}
                    {row.visibility !== 'ARCHIVED' ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-muted min-h-[36px]"
                        onClick={() => lifecycleMutation.mutate({ id: row.id, action: 'archive' })}
                      >
                        <Archive className="w-3.5 h-3.5" /> Архив
                      </button>
                    ) : null}
                    {row.visibility === 'DRAFT' ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-muted min-h-[36px]"
                        onClick={() => lifecycleMutation.mutate({ id: row.id, action: 'publish' })}
                      >
                        <Eye className="w-3.5 h-3.5" /> Опубликовать
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {meta && meta.total_pages > 1 ? (
        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            Назад
          </button>
          <span className="text-sm text-muted-foreground self-center">
            {meta.page} / {meta.total_pages}
          </span>
          <button
            type="button"
            disabled={page >= meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            Далее
          </button>
        </div>
      ) : null}
    </div>
  );
}
