import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, Receipt } from 'lucide-react';
import { useCallback, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

type BillingSummary = {
  account: {
    plan: string;
    planLabel: string;
    status: string;
    quotas: Record<string, number>;
  };
  usage: Record<string, number>;
  pressure: {
    pressurePct: Record<string, number>;
    atLimit: boolean;
  };
};

type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  amountRub: number;
  dueAt: string;
  paidAt: string | null;
  lineItems: Array<{ description: string; amountRub: number }>;
};

type PromotionProduct = {
  id: string;
  label: string;
  description: string;
  priceRub: number;
  tier: string;
  durationDays: number;
};

type PromotionOrder = {
  id: string;
  listingId: number;
  listingTitle: string | null;
  productId: string;
  status: string;
  amountRub: number;
  invoice: { number: string; status: string } | null;
  createdAt: string;
};

const QUOTA_LABELS: Record<string, string> = {
  activeListings: 'Объявления',
  promotions: 'Продвижения',
  savedSearches: 'Поиски',
  crmSeats: 'CRM-места',
};

function QuotaBar({ label, used, limit, pct }: { label: string; used: number; limit: number; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className={pct >= 90 ? 'text-amber-700 font-medium' : 'text-muted-foreground'}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct >= 90 ? 'bg-amber-500' : 'bg-primary')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function SwipeInvoiceRow({
  invoice,
  onArchive,
}: {
  invoice: InvoiceRow;
  onArchive: (id: string) => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => setStartX(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX == null) return;
    const dx = e.touches[0].clientX - startX;
    setOffsetX(Math.max(-120, Math.min(0, dx)));
  };
  const onTouchEnd = () => {
    if (offsetX < -80) onArchive(invoice.id);
    setOffsetX(0);
    setStartX(null);
  };

  const statusColor =
    invoice.status === 'PAID'
      ? 'text-green-700'
      : invoice.status === 'OVERDUE'
        ? 'text-red-700'
        : 'text-muted-foreground';

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <div className="absolute inset-y-0 right-0 flex items-center px-4 bg-muted text-xs text-muted-foreground">
        Архив
      </div>
      <div
        className="relative bg-card p-3 touch-pan-y"
        style={{ transform: `translateX(${offsetX}px)`, transition: offsetX === 0 ? 'transform 0.2s' : undefined }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{invoice.number}</p>
            <p className="text-xs text-muted-foreground truncate">
              {(invoice.lineItems?.[0] as { description?: string })?.description ?? 'Счёт'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-sm">{invoice.amountRub.toLocaleString('ru-RU')} ₽</p>
            <p className={cn('text-[10px] uppercase', statusColor)}>{invoice.status}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          до {new Date(invoice.dueAt).toLocaleDateString('ru-RU')}
        </p>
      </div>
    </div>
  );
}

export default function AccountBillingPage() {
  const qc = useQueryClient();
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [orderListingId, setOrderListingId] = useState('');
  const [orderProductId, setOrderProductId] = useState('VIP_7D');

  const summaryQuery = useQuery({
    queryKey: ['account', 'billing', 'summary'],
    queryFn: () => apiGet<BillingSummary>('/account/billing/summary'),
  });

  const invoicesQuery = useQuery({
    queryKey: ['account', 'billing', 'invoices'],
    queryFn: () =>
      apiGet<{ data: InvoiceRow[] }>('/account/billing/invoices?per_page=20'),
  });

  const catalogQuery = useQuery({
    queryKey: ['account', 'billing', 'catalog'],
    queryFn: () => apiGet<PromotionProduct[]>('/account/billing/promotions/catalog'),
  });

  const ordersQuery = useQuery({
    queryKey: ['account', 'billing', 'orders'],
    queryFn: () =>
      apiGet<{ data: PromotionOrder[] }>('/account/billing/promotions/orders'),
  });

  const orderMutation = useMutation({
    mutationFn: () =>
      apiPost('/account/billing/promotions/orders', {
        listingId: Number(orderListingId),
        productId: orderProductId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account', 'billing'] });
      setOrderListingId('');
    },
  });

  const archiveInvoice = useCallback((id: string) => {
    setArchivedIds((prev) => new Set(prev).add(id));
  }, []);

  const summary = summaryQuery.data;
  const visibleInvoices = (invoicesQuery.data?.data ?? []).filter((i) => !archivedIds.has(i.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Биллинг</h2>
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : summary ? (
        <section className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Текущий план</p>
              <p className="text-xl font-bold">{summary.account.planLabel}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted">{summary.account.status}</span>
          </div>
          {summary.pressure.atLimit ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Приближение к лимиту квот. Обновите план или свяжитесь с менеджером.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(summary.account.quotas).map(([key, limit]) => (
              <QuotaBar
                key={key}
                label={QUOTA_LABELS[key] ?? key}
                used={summary.usage[key] ?? 0}
                limit={limit}
                pct={summary.pressure.pressurePct[key as keyof typeof summary.pressure.pressurePct] ?? 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border p-4 space-y-3">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Заказ продвижения
        </h3>
        <p className="text-xs text-muted-foreground">
          Счёт выставляется автоматически. Оплата через менеджера — без онлайн-платежей.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(catalogQuery.data ?? []).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOrderProductId(p.id)}
              className={cn(
                'text-left rounded-lg border p-3 min-h-[88px] transition-colors',
                orderProductId === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
              )}
            >
              <p className="font-medium text-sm">{p.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
              <p className="text-sm font-semibold mt-2">{p.priceRub.toLocaleString('ru-RU')} ₽</p>
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            placeholder="ID объявления"
            value={orderListingId}
            onChange={(e) => setOrderListingId(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2.5 text-sm min-h-[44px]"
          />
          <button
            type="button"
            disabled={!orderListingId || orderMutation.isPending}
            onClick={() => orderMutation.mutate()}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium min-h-[44px] disabled:opacity-50"
          >
            {orderMutation.isPending ? 'Оформление…' : 'Заказать'}
          </button>
        </div>
        {orderMutation.isError ? (
          <p className="text-xs text-red-600">Не удалось создать заказ. Проверьте ID и квоту.</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium text-sm">Счета</h3>
        {invoicesQuery.isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : visibleInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Счетов пока нет</p>
        ) : (
          <div className="space-y-2">
            {visibleInvoices.map((inv) => (
              <SwipeInvoiceRow key={inv.id} invoice={inv} onArchive={archiveInvoice} />
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground text-center">Смахните счёт влево для архива</p>
      </section>

      {(ordersQuery.data?.data?.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h3 className="font-medium text-sm">История продвижений</h3>
          <div className="space-y-2">
            {ordersQuery.data!.data.map((o) => (
              <div key={o.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="truncate">#{o.listingId} {o.listingTitle ?? ''}</span>
                  <span className="shrink-0 font-medium">{o.amountRub.toLocaleString('ru-RU')} ₽</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {o.status} · {o.invoice?.number ?? '—'}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
