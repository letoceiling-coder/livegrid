import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { crmApiGet, crmApiPost } from '@/admin/lib/crm-api';
import { crmQueryOptions } from '@/admin/lib/crm-query-options';
import CrmInlineError from '@/admin/components/CrmInlineError';

type BillingMetrics = {
  activeSubscriptions: number;
  overdueInvoices: number;
  promotionRevenue30dRub: number;
  promotionOrdersFulfilled30d: number;
  pendingPromotionOrders: number;
  planDistribution: Record<string, number>;
  quotaPressureHint: string;
};

type AccountRow = {
  id: string;
  plan: string;
  planLabel: string;
  status: string;
  user: { fullName: string | null; email: string | null; role: string };
  invoiceCount: number;
};

type OverdueInvoice = {
  id: string;
  number: string;
  amountRub: number;
  dueAt: string;
  account: { user: { fullName: string | null; email: string | null } };
};

export default function AdminBillingPage() {
  const qc = useQueryClient();

  const metricsQuery = useQuery({
    queryKey: ['admin', 'billing', 'metrics'],
    queryFn: () => crmApiGet<BillingMetrics>('/admin/billing/metrics', 'billing_metrics'),
    ...crmQueryOptions({ staleTime: 60_000 }),
  });

  const accountsQuery = useQuery({
    queryKey: ['admin', 'billing', 'accounts'],
    queryFn: () =>
      crmApiGet<{ data: AccountRow[]; overdueInvoices: number }>(
        '/admin/billing/accounts?per_page=30',
        'billing_accounts',
      ),
    ...crmQueryOptions({ staleTime: 60_000 }),
  });

  const overdueQuery = useQuery({
    queryKey: ['admin', 'billing', 'overdue'],
    queryFn: () =>
      crmApiGet<{ data: OverdueInvoice[] }>(
        '/admin/billing/invoices/overdue?per_page=20',
        'billing_overdue',
      ),
    ...crmQueryOptions({ staleTime: 60_000 }),
  });

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      crmApiPost(`/admin/billing/invoices/${invoiceId}/paid`, {}, 'billing_mark_paid'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'billing'] });
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => crmApiPost('/admin/billing/scan/overdue', {}, 'billing_scan'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'billing'] }),
  });

  const m = metricsQuery.data;

  return (
    <div className="p-4 sm:p-6 max-w-6xl pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Billing Center</h1>
            <p className="text-sm text-muted-foreground">Подписки · счета · продвижения</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="inline-flex items-center gap-1.5 text-xs border rounded-lg px-3 py-2 min-h-[36px] hover:bg-muted"
          >
            <RefreshCw className={cnIcon(scanMutation.isPending)} />
            Scan overdue
          </button>
          <Link to="/admin/ops" className="text-xs text-primary hover:underline self-center">
            Ops Center →
          </Link>
        </div>
      </div>

      {metricsQuery.isError ? <CrmInlineError message="Не удалось загрузить метрики" /> : null}

      {m ? (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          <MetricCard label="Подписки" value={m.activeSubscriptions} />
          <MetricCard label="Просрочено" value={m.overdueInvoices} warn={m.overdueInvoices > 0} />
          <MetricCard label="Выручка 30д" value={`${(m.promotionRevenue30dRub / 1000).toFixed(0)}k ₽`} />
          <MetricCard label="Заказы 30д" value={m.promotionOrdersFulfilled30d} />
          <MetricCard label="В ожидании" value={m.pendingPromotionOrders} />
          <MetricCard label="Давление" value={m.quotaPressureHint} />
        </section>
      ) : metricsQuery.isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-6" />
      ) : null}

      {m ? (
        <section className="rounded-xl border bg-card p-4 mb-6">
          <h2 className="font-semibold text-sm mb-3">Распределение планов</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(m.planDistribution).map(([plan, count]) => (
              <span key={plan} className="text-xs border rounded-full px-3 py-1">
                {plan}: {count}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3">Аккаунты</h2>
          {accountsQuery.isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(accountsQuery.data?.data ?? []).map((a) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium truncate">{a.user.fullName ?? a.user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.planLabel} · {a.status} · счетов: {a.invoiceCount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3">Просроченные счета</h2>
          {overdueQuery.isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (overdueQuery.data?.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Нет просроченных</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {overdueQuery.data!.data.map((inv) => (
                <div key={inv.id} className="rounded-lg border p-3 text-sm flex justify-between gap-2 items-start">
                  <div className="min-w-0">
                    <p className="font-medium">{inv.number}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {inv.account.user.fullName ?? inv.account.user.email}
                    </p>
                    <p className="text-xs">{inv.amountRub.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <button
                    type="button"
                    disabled={markPaidMutation.isPending}
                    onClick={() => markPaidMutation.mutate(inv.id)}
                    className="shrink-0 text-xs bg-primary text-primary-foreground rounded-lg px-2 py-1.5 min-h-[32px]"
                  >
                    Оплачен
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${warn ? 'text-red-600' : ''}`}>{value}</p>
    </div>
  );
}

function cnIcon(spin: boolean) {
  return spin ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5';
}
