import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardCheck, Loader2, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { LISTING_VISIBILITY_LABEL, listingVisibilityClass } from '@/admin/lib/listingVisibility';
import { cn } from '@/lib/utils';
import { formatPriceSafe, isPriceFallbackText, PRICE_ON_REQUEST_CLASS } from '@/redesign/lib/display-price';
import { cn } from '@/lib/utils';

type Tab = 'REVIEW' | 'REJECTED' | 'PENDING_REVISION' | 'RECENTLY_APPROVED';

type QueueRow = {
  id: number;
  kind: string;
  title: string | null;
  address: string | null;
  price: string | number | null;
  visibility: string;
  moderationNote: string | null;
  isPendingRevision: boolean;
  isStaleReview: boolean;
  region: { name: string } | null;
  ownerUser: { fullName: string | null; email: string | null } | null;
  lastActivityAt: string | null;
};

type QueueResponse = {
  data: QueueRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

type AgentRow = { id: string; fullName: string | null; email: string | null };
type RegionRow = { id: number; name: string; code: string };

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'REVIEW', label: 'На модерации' },
  { key: 'REJECTED', label: 'Отклонённые' },
  { key: 'PENDING_REVISION', label: 'Правки опублик.' },
  { key: 'RECENTLY_APPROVED', label: 'Недавно одобрено' },
];

export default function AdminModerationListings() {
  const [tab, setTab] = useState<Tab>('REVIEW');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [regionId, setRegionId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [staleOnly, setStaleOnly] = useState(false);

  const qs = useMemo(() => {
    const sp = new URLSearchParams({ tab, page: String(page), per_page: '20' });
    if (q.trim()) sp.set('q', q.trim());
    if (regionId) sp.set('region_id', regionId);
    if (ownerId) sp.set('owner_user_id', ownerId);
    if (staleOnly) sp.set('stale_only', 'true');
    return sp.toString();
  }, [tab, page, q, regionId, ownerId, staleOnly]);

  const { data, isLoading } = useQuery({
    queryKey: ['moderation', 'queue', qs],
    queryFn: () => apiGet<QueueResponse>(`/admin/moderation/listings?${qs}`),
    staleTime: 15_000,
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60_000,
  });

  const { data: agents } = useQuery({
    queryKey: ['admin', 'listings', 'agents'],
    queryFn: () => apiGet<AgentRow[]>('/admin/listings/agents'),
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-4 sm:p-6 max-w-6xl pb-24">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          Модерация объявлений
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Очередь проверки ручных объектов</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={cn(
              'shrink-0 px-4 py-2 rounded-full text-sm font-medium border min-h-[44px]',
              tab === t.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск: ID, адрес, заголовок"
            className="pl-9 min-h-11"
          />
        </div>
        <select
          className="border rounded-lg px-3 min-h-11 text-sm bg-background"
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Все регионы</option>
          {(regions ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="border rounded-lg px-3 min-h-11 text-sm bg-background"
          value={ownerId}
          onChange={(e) => {
            setOwnerId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Все агенты</option>
          {(agents ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.fullName ?? a.email ?? a.id}
            </option>
          ))}
        </select>
      </div>

      {tab === 'REVIEW' ? (
        <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
          <input type="checkbox" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />
          Только просроченные (&gt;48ч)
        </label>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Очередь пуста</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              to={`/admin/moderation/listings/${row.id}`}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-4 hover:bg-muted/30 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">#{row.id}</span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full',
                      listingVisibilityClass(row.visibility),
                    )}
                  >
                    {LISTING_VISIBILITY_LABEL[row.visibility as keyof typeof LISTING_VISIBILITY_LABEL] ??
                      row.visibility}
                  </span>
                  {row.isPendingRevision ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      правки
                    </span>
                  ) : null}
                  {row.isStaleReview ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> stale
                    </span>
                  ) : null}
                </div>
                <p className="text-sm truncate mt-1">{row.title || row.address || row.kind}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {row.region?.name ?? '—'} · {row.ownerUser?.fullName ?? row.ownerUser?.email ?? '—'}
                </p>
                {row.moderationNote ? (
                  <p className="text-xs text-red-700 mt-1 truncate">{row.moderationNote}</p>
                ) : null}
              </div>
              <p className={cn("text-sm font-semibold shrink-0", isPriceFallbackText(formatPriceSafe(row.price)) && PRICE_ON_REQUEST_CLASS)}>{formatPriceSafe(row.price)}</p>
            </Link>
          ))}
        </div>
      )}

      {meta && meta.total_pages > 1 ? (
        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border rounded-lg text-sm min-h-11 disabled:opacity-50"
          >
            Назад
          </button>
          <span className="text-sm self-center">
            {meta.page} / {meta.total_pages}
          </span>
          <button
            type="button"
            disabled={page >= meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border rounded-lg text-sm min-h-11 disabled:opacity-50"
          >
            Далее
          </button>
        </div>
      ) : null}
    </div>
  );
}
