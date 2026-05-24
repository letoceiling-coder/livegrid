import { lazy, memo, Suspense, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  Bot,
  ClipboardList,
  Clock,
  Loader2,
  RefreshCw,
  Shield,
  Users,
  CreditCard,
} from 'lucide-react';
import { crmApiGet, crmApiGetOptional } from '@/admin/lib/crm-api';
import { crmQueryOptions, crmErrorMessage } from '@/admin/lib/crm-query-options';
import CrmInlineError from '@/admin/components/CrmInlineError';
import { cn } from '@/lib/utils';
import CrmAnalyticsErrorBoundary from '@/admin/components/CrmAnalyticsErrorBoundary';
import CrmAnalyticsSkeleton from '@/admin/components/CrmAnalyticsSkeleton';
const CrmAnalyticsPanel = lazy(() => import('@/admin/components/CrmAnalyticsPanel'));
import { SlaBadge } from '@/admin/components/CrmWorkloadStrip';
import type { CrmAnalyticsResponse } from '@/admin/lib/crm-analytics';
import { crmObsAnalyticsFetch, crmObsOpsFetch } from '@/admin/lib/crm-observability';
import { getPollInterval } from '@/admin/lib/crm-polling-policy';
import { useSmartPollInterval, useCrmPollMeta } from '@/admin/hooks/useSmartPollInterval';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { CRM_CACHE_ANALYTICS, CRM_CACHE_OPERATIONAL } from '@/admin/lib/crm-cache-policy';
import { crmInvalidate } from '@/admin/lib/crm-invalidation';
import { formatRequestDate, REQUEST_STATUS_LABEL, type RequestStatusKey } from '@/admin/lib/request-crm';
import { computeSlaClient, type SlaStateKey } from '@/admin/lib/request-sla';

type QueueRow = {
  id: number;
  name: string | null;
  phone: string | null;
  status: string;
  lastActivityAt: string;
  createdAt: string;
  assignedTo: string | null;
  slaState?: SlaStateKey;
  inactiveLabel?: string;
  assignedUser?: { fullName: string | null; email: string | null } | null;
};

type OpsSummary = {
  refreshedAt: string;
  totals: { open: number; overdue: number; stale: number };
  unassigned: { assigned: number; overdue: number; stale: number };
  notifications: { unread: number };
  escalation: {
    overdueCount: number;
    staleCount: number;
    unassignedRisk: number;
    overloadManagers: number;
  };
  queues: { overdue: QueueRow[]; stale: QueueRow[]; unassigned: QueueRow[] };
  managers: Array<{
    assigneeId: string;
    assigneeName: string;
    assigned: number;
    overdue: number;
    stale: number;
  }>;
  heat: { overdue: number; stale: number; open: number; pressure: number };
};

type AutomationMetrics = {
  staleRescueRate: number;
  overdueCallbacks: number;
  followUpCompletionRate: number;
  taskPressure: number;
  automationEffectiveness: number;
  tasksCreated24h: number;
  tasksCompleted24h: number;
};

type TrustMetrics = {
  rejectRate: number;
  repeatedViolations: number;
  duplicateFrequency: number;
  suspiciousAgentCount: number;
  qualityDistribution: { high: number; medium: number; low: number };
  flaggedListings: number;
  avgQualityScore: number;
};

type BillingOpsMetrics = {
  activeSubscriptions: number;
  overdueInvoices: number;
  promotionRevenue30dRub: number;
  pendingPromotionOrders: number;
  planDistribution: Record<string, number>;
  quotaPressureHint: string;
};

const QueueSection = memo(function QueueSection({
  title,
  icon: Icon,
  items,
  tone,
  filter,
}: {
  title: string;
  icon: typeof AlertTriangle;
  items: QueueRow[];
  tone: 'red' | 'amber' | 'blue';
  filter: string;
}) {
  const border =
    tone === 'red' ? 'border-red-500/30' : tone === 'amber' ? 'border-amber-500/30' : 'border-blue-500/30';

  return (
    <section className={cn('rounded-xl border bg-card overflow-hidden', border)}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </h2>
        <Link to={`/admin/requests?${filter}`} className="text-xs text-primary hover:underline">
          Все →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4">Нет заявок</p>
      ) : (
        <ul className="divide-y">
          {items.map((r) => {
            const sla = r.slaState ?? computeSlaClient(r).slaState;
            return (
              <li key={r.id}>
                <Link
                  to={`/admin/requests/${r.id}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/40 transition-colors motion-safe:transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      #{r.id} {r.name || r.phone || 'Без имени'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {REQUEST_STATUS_LABEL[r.status as RequestStatusKey] ?? r.status}
                      {' · '}
                      {formatRequestDate(r.lastActivityAt)}
                    </p>
                  </div>
                  <SlaBadge slaState={sla} inactiveLabel={r.inactiveLabel} compact />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
});

export default function AdminOpsCenter() {
  const qc = useQueryClient();
  const pollInterval = useSmartPollInterval('opsCenter');
  const analyticsPollInterval = useSmartPollInterval('opsCenter');
  const { profile, online } = useCrmPollMeta();

  const summaryQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.ops.summary,
    queryFn: async () => {
      const t0 = performance.now();
      const res = await crmApiGet<OpsSummary>('/admin/ops/summary', 'ops_summary');
      crmObsOpsFetch(performance.now() - t0);
      return res;
    },
    ...crmQueryOptions({
      refetchInterval: pollInterval === false ? false : pollInterval,
      staleTime: CRM_CACHE_OPERATIONAL.staleTime,
      gcTime: CRM_CACHE_OPERATIONAL.gcTime,
      enabled: online,
    }),
  });

  const analyticsInterval =
    analyticsPollInterval === false
      ? false
      : (analyticsPollInterval as number) * 2;

  const analyticsQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.ops.analytics,
    queryFn: async () => {
      const t0 = performance.now();
      const res = await crmApiGet<CrmAnalyticsResponse>(
        '/admin/ops/analytics?days=14',
        'ops_analytics',
      );
      crmObsAnalyticsFetch(
        performance.now() - t0,
        res.computeMs,
        res.timeline?.computeMs,
        res.history?.queryMs,
        res.attribution?.computeMs,
        res.pipeline?.computeMs,
        res.conversionQuality?.computeMs,
        res.operationalForecast?.computeMs,
      );
      return res;
    },
    ...crmQueryOptions({
      refetchInterval: analyticsInterval,
      staleTime: CRM_CACHE_ANALYTICS.staleTime,
      gcTime: CRM_CACHE_ANALYTICS.gcTime,
      enabled: online,
    }),
  });

  const automationQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.automation.metrics,
    queryFn: () => crmApiGetOptional<AutomationMetrics>('/admin/automation/metrics', 'automation_metrics'),
    retry: false,
    ...crmQueryOptions({
      refetchInterval: pollInterval === false ? false : (pollInterval as number) * 2,
      staleTime: CRM_CACHE_OPERATIONAL.staleTime,
      enabled: online,
    }),
  });

  const trustQuery = useQuery({
    queryKey: ['admin', 'trust', 'metrics'],
    queryFn: () => crmApiGetOptional<TrustMetrics>('/admin/trust/metrics', 'trust_metrics'),
    retry: false,
    ...crmQueryOptions({
      refetchInterval: pollInterval === false ? false : (pollInterval as number) * 3,
      staleTime: CRM_CACHE_OPERATIONAL.staleTime,
      enabled: online,
    }),
  });

  const billingQuery = useQuery({
    queryKey: ['admin', 'billing', 'metrics'],
    queryFn: () => crmApiGetOptional<BillingOpsMetrics>('/admin/billing/metrics', 'billing_metrics'),
    retry: false,
    ...crmQueryOptions({
      refetchInterval: pollInterval === false ? false : (pollInterval as number) * 4,
      staleTime: CRM_CACHE_OPERATIONAL.staleTime,
      enabled: online,
    }),
  });

  const data = summaryQuery.data;
  const isLoading = summaryQuery.isLoading;
  const isFetching = summaryQuery.isFetching || analyticsQuery.isFetching;

  const refetch = useCallback(() => {
    void crmInvalidate(qc, 'ops_manual', { force: true });
  }, [qc]);

  const currentInterval = getPollInterval(profile, 'opsCenter');

  return (
    <div className="p-4 sm:p-6 max-w-6xl pb-24">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Ops Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Операционная координация · профиль {profile}
            {currentInterval !== false ? ` · ${Math.round(currentInterval / 1000)}s` : ' · пауза'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground shrink-0 h-10 px-3 rounded-lg border"
        >
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin motion-safe:animate-spin')} />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {summaryQuery.isError && !data ? (
        <CrmInlineError
          message={crmErrorMessage(summaryQuery.error, 'CRM временно недоступен')}
          className="mb-4"
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Открытых</p>
              <p className="text-2xl font-bold">{data.totals.open}</p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Просрочено
              </p>
              <p className="text-2xl font-bold text-red-600">{data.escalation.overdueCount}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Застой
              </p>
              <p className="text-2xl font-bold text-amber-700">{data.escalation.staleCount}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <Bell className="w-3 h-3" /> Уведомления
              </p>
              <p className="text-2xl font-bold">{data.notifications.unread}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <QueueSection
              title="Просроченные"
              icon={AlertTriangle}
              items={data.queues.overdue}
              tone="red"
              filter="sla=overdue"
            />
            <QueueSection
              title="Застой"
              icon={Clock}
              items={data.queues.stale}
              tone="amber"
              filter="sla=stale"
            />
            <QueueSection
              title="Без менеджера"
              icon={Users}
              items={data.queues.unassigned}
              tone="blue"
              filter="assigned_to=none"
            />
          </div>

          {data.managers.length > 0 ? (
            <section className="rounded-xl border bg-card p-4 mb-4">
              <h2 className="font-semibold text-sm mb-3">Нагрузка менеджеров</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.managers.map((m) => (
                  <div
                    key={m.assigneeId}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm',
                      m.overdue >= 2 && 'border-red-500/40 bg-red-500/5',
                    )}
                  >
                    <p className="font-medium truncate">{m.assigneeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.assigned} заявок
                      {m.overdue > 0 ? ` · ${m.overdue} просроч.` : ''}
                      {m.stale > 0 ? ` · ${m.stale} застой` : ''}
                    </p>
                  </div>
                ))}
              </div>
              {data.escalation.overloadManagers > 0 ? (
                <p className="text-xs text-amber-700 mt-3">
                  Перегруз: {data.escalation.overloadManagers} менеджер(ов) с высокой нагрузкой
                </p>
              ) : null}
            </section>
          ) : null}

          {automationQuery.data ? (
            <section className="rounded-xl border bg-card p-4 mb-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  Automation Engine
                </h2>
                <Link to="/admin/tasks" className="text-xs text-primary hover:underline">
                  Task Center →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Stale rescue</p>
                  <p className="text-lg font-bold">{automationQuery.data.staleRescueRate}%</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Callback overdue</p>
                  <p className="text-lg font-bold text-red-600">{automationQuery.data.overdueCallbacks}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Follow-up done</p>
                  <p className="text-lg font-bold">{automationQuery.data.followUpCompletionRate}%</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Task pressure</p>
                  <p className="text-lg font-bold">{automationQuery.data.taskPressure}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Effectiveness</p>
                  <p className="text-lg font-bold">{automationQuery.data.automationEffectiveness}%</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">24h tasks</p>
                  <p className="text-lg font-bold">
                    {automationQuery.data.tasksCompleted24h}/{automationQuery.data.tasksCreated24h}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {trustQuery.data ? (
            <section className="rounded-xl border bg-card p-4 mb-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Trust & Quality
                </h2>
                <Link to="/admin/trust" className="text-xs text-primary hover:underline">
                  Trust Center →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Avg quality</p>
                  <p className="text-lg font-bold">{trustQuery.data.avgQualityScore}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Reject rate</p>
                  <p className="text-lg font-bold">{trustQuery.data.rejectRate}%</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Flagged</p>
                  <p className="text-lg font-bold text-amber-700">{trustQuery.data.flaggedListings}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Duplicates</p>
                  <p className="text-lg font-bold">{trustQuery.data.duplicateFrequency}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">High quality</p>
                  <p className="text-lg font-bold">{trustQuery.data.qualityDistribution.high}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Suspicious</p>
                  <p className="text-lg font-bold">{trustQuery.data.suspiciousAgentCount}</p>
                </div>
              </div>
            </section>
          ) : null}

          {billingQuery.data ? (
            <section className="rounded-xl border bg-card p-4 mb-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Billing
                </h2>
                <Link to="/admin/billing" className="text-xs text-primary hover:underline">
                  Billing Center →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Subscriptions</p>
                  <p className="text-lg font-bold">{billingQuery.data.activeSubscriptions}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Overdue</p>
                  <p className="text-lg font-bold text-red-600">{billingQuery.data.overdueInvoices}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Rev 30d</p>
                  <p className="text-lg font-bold">
                    {(billingQuery.data.promotionRevenue30dRub / 1000).toFixed(0)}k
                  </p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Pending orders</p>
                  <p className="text-lg font-bold">{billingQuery.data.pendingPromotionOrders}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">FREE plan</p>
                  <p className="text-lg font-bold">{billingQuery.data.planDistribution.FREE ?? 0}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] text-muted-foreground">Pressure</p>
                  <p className="text-lg font-bold">{billingQuery.data.quotaPressureHint}</p>
                </div>
              </div>
            </section>
          ) : null}

          {analyticsQuery.isError ? (
            <CrmInlineError
              message={crmErrorMessage(analyticsQuery.error, 'Ошибка загрузки аналитики')}
              className="mb-4"
              onRetry={() => void analyticsQuery.refetch()}
            />
          ) : null}

          {analyticsQuery.isLoading && !analyticsQuery.data ? <CrmAnalyticsSkeleton /> : null}

          {analyticsQuery.data ? (
            <CrmAnalyticsErrorBoundary onRetry={() => void analyticsQuery.refetch()}>
              <Suspense fallback={<CrmAnalyticsSkeleton />}>
                <CrmAnalyticsPanel data={analyticsQuery.data} />
              </Suspense>
            </CrmAnalyticsErrorBoundary>
          ) : null}

          <p className="text-[10px] text-muted-foreground">
            Обновлено {new Date(data.refreshedAt).toLocaleTimeString('ru-RU')}
            {summaryQuery.dataUpdatedAt
              ? ` · клиент ${new Date(summaryQuery.dataUpdatedAt).toLocaleTimeString('ru-RU')}`
              : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}
