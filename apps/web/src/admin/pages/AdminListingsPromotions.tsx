import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Loader2, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { formatPrice } from '@/redesign/data/mock-data';

type PromoRow = {
  id: number;
  title: string | null;
  address: string | null;
  price: string | number | null;
  promotionTier: string;
  promotedUntil: string;
  promotion: { tier: string; isActive: boolean };
  ownerUser: { fullName: string | null; email: string | null } | null;
  region: { name: string } | null;
};

type ListResponse = {
  data: PromoRow[];
  meta: { page: number; total_pages: number };
};

const TIERS = ['VIP', 'BOOSTED', 'PREMIUM'] as const;

export default function AdminListingsPromotions() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [assignId, setAssignId] = useState<number | null>(null);
  const [tier, setTier] = useState<(typeof TIERS)[number]>('VIP');
  const [days, setDays] = useState('30');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'promotions', page],
    queryFn: () => apiGet<ListResponse>(`/admin/listings/promotions?page=${page}&per_page=20`),
  });

  const assign = useMutation({
    mutationFn: ({ id, until }: { id: number; until: string }) =>
      apiPatch(`/admin/listings/promotions/${id}`, { tier, promotedUntil: until }),
    onSuccess: () => {
      toast.success('Продвижение назначено');
      setAssignId(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
    },
    onError: () => toast.error('Не удалось назначить'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/listings/promotions/${id}`),
    onSuccess: () => {
      toast.success('Продвижение снято');
      void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
    },
  });

  const bulkExpire = useMutation({
    mutationFn: () => apiPost('/admin/listings/promotions/expire', { limit: 500 }),
    onSuccess: (r: { expired: number }) => {
      toast.success(`Снято просроченных: ${r.expired}`);
      void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] });
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-5xl pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />
            Продвижение объявлений
          </h1>
          <p className="text-sm text-muted-foreground mt-1">VIP · Boost · Premium — операционное управление</p>
        </div>
        <Button variant="outline" className="min-h-[44px]" onClick={() => bulkExpire.mutate()}>
          Снять просроченные
        </Button>
      </div>

      <div className="rounded-xl border p-4 mb-6 space-y-3">
        <p className="text-sm font-medium">Назначить продвижение</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input
            placeholder="ID объявления"
            className="min-h-11"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = e.currentTarget;
                const id = Number(input.value);
                if (!Number.isFinite(id)) return;
                setAssignId(id);
              }
            }}
          />
          <select className="border rounded-lg h-11 px-3 text-sm" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
            {TIERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="min-h-11" />
          <Button
            className="min-h-11"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('input[placeholder="ID объявления"]');
              const id = Number(input?.value);
              if (!Number.isFinite(id)) {
                toast.error('Укажите ID');
                return;
              }
              setAssignId(id);
            }}
          >
            Назначить
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Нет активных продвижений</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">#{row.id} · {row.promotionTier}</p>
                <p className="text-xs text-muted-foreground truncate">{row.title || row.address}</p>
                <p className="text-xs text-muted-foreground">
                  до {new Date(row.promotedUntil).toLocaleDateString('ru-RU')} ·{' '}
                  {row.ownerUser?.fullName ?? row.ownerUser?.email ?? '—'}
                </p>
              </div>
              <p className="text-sm font-semibold shrink-0">{formatPrice(Number(row.price ?? 0))}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => setAssignId(row.id)}
                >
                  Изменить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-[44px] text-destructive"
                  onClick={() => {
                    if (confirm('Снять продвижение?')) remove.mutate(row.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {assignId != null ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-background rounded-2xl p-4 w-full max-w-md space-y-3">
            <h2 className="font-semibold">Назначить #{assignId}</h2>
            <select
              className="w-full border rounded-lg h-11 px-3 text-sm"
              value={tier}
              onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Дней"
              className="min-h-11"
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 min-h-[44px]"
                onClick={() => {
                  const d = Number(days);
                  if (!Number.isFinite(d) || d < 1) return;
                  const until = new Date(Date.now() + d * 86400000).toISOString();
                  assign.mutate({ id: assignId, until });
                }}
              >
                Сохранить
              </Button>
              <Button variant="ghost" className="min-h-[44px]" onClick={() => setAssignId(null)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {data?.meta && data.meta.total_pages > 1 ? (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <span className="text-sm self-center">{page} / {data.meta.total_pages}</span>
          <Button
            variant="outline"
            disabled={page >= data.meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Далее
          </Button>
        </div>
      ) : null}
    </div>
  );
}
