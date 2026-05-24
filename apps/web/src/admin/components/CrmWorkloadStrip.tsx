import { memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSmartPollInterval, useCrmPollMeta } from '@/admin/hooks/useSmartPollInterval';
import { AlertTriangle, Clock, Users, Zap } from 'lucide-react';
import { crmApiGet } from '@/admin/lib/crm-api';
import { crmQueryOptions, crmErrorMessage } from '@/admin/lib/crm-query-options';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { CRM_CACHE_OPERATIONAL } from '@/admin/lib/crm-cache-policy';
import CrmInlineError from '@/admin/components/CrmInlineError';
import { cn } from '@/lib/utils';
import { SLA_STATE_CLASS, SLA_STATE_LABEL, type SlaStateKey } from '@/admin/lib/request-sla';

type WorkloadResponse = {
  totals: { open: number; overdue: number; stale: number };
  unassigned: { assigned: number; overdue: number; stale: number };
  managers: Array<{
    assigneeId: string;
    assigneeName: string;
    role: string | null;
    assigned: number;
    overdue: number;
    stale: number;
    active: number;
  }>;
};

type VelocityMetrics = {
  latency: { avgFirstContactMinutes: number | null };
  communication: { callbackOverdueCount: number; unreadConversations: number };
};

type Props = {
  slaFilter: string;
  onSlaFilter: (v: string) => void;
};

function CrmWorkloadStrip({ slaFilter, onSlaFilter }: Props) {
  const pollInterval = useSmartPollInterval('workload');
  const { online } = useCrmPollMeta();

  const { data, isError, error } = useQuery({
    queryKey: CRM_QUERY_KEYS.requests.workload,
    queryFn: () => crmApiGet<WorkloadResponse>('/admin/requests/workload', 'requests_workload'),
    ...crmQueryOptions({
      ...CRM_CACHE_OPERATIONAL,
      refetchInterval: pollInterval === false ? false : pollInterval,
      enabled: online,
    }),
  });

  const velocityQuery = useQuery({
    queryKey: ['admin', 'requests', 'responsiveness-metrics'],
    queryFn: () => crmApiGet<VelocityMetrics>('/admin/requests/responsiveness-metrics', 'responsiveness_metrics'),
    ...crmQueryOptions({
      staleTime: 60_000,
      refetchInterval: pollInterval === false ? false : pollInterval,
      enabled: online,
    }),
  });

  if (isError) {
    return (
      <CrmInlineError
        message={crmErrorMessage(error, 'Ошибка загрузки нагрузки менеджеров')}
        className="mb-4"
      />
    );
  }

  if (!data) return null;

  const velocity = velocityQuery.data;

  return (
    <div className="mb-4 space-y-3">
      {velocity ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground rounded-lg border bg-muted/20 px-3 py-2">
          <span className="inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Первый контакт:{' '}
            <span className="font-medium text-foreground tabular-nums">
              {velocity.latency.avgFirstContactMinutes != null
                ? `${velocity.latency.avgFirstContactMinutes} мин`
                : '—'}
            </span>
          </span>
          {velocity.communication.callbackOverdueCount > 0 ? (
            <span className="text-red-600 font-medium">
              Callback просрочен: {velocity.communication.callbackOverdueCount}
            </span>
          ) : null}
          {velocity.communication.unreadConversations > 0 ? (
            <span>Непрочитано: {velocity.communication.unreadConversations}</span>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onSlaFilter('')}
          className={cn(
            'rounded-xl border p-3 text-left transition-colors',
            !slaFilter ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/50',
          )}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Открытых</p>
          <p className="text-xl font-bold">{data.totals.open}</p>
        </button>
        <button
          type="button"
          onClick={() => onSlaFilter(slaFilter === 'overdue' ? '' : 'overdue')}
          className={cn(
            'rounded-xl border p-3 text-left transition-colors',
            slaFilter === 'overdue' ? 'border-red-500 bg-red-500/10' : 'bg-card hover:bg-muted/50',
          )}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500" /> Просрочено
          </p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{data.totals.overdue}</p>
        </button>
        <button
          type="button"
          onClick={() => onSlaFilter(slaFilter === 'stale' ? '' : 'stale')}
          className={cn(
            'rounded-xl border p-3 text-left transition-colors',
            slaFilter === 'stale' ? 'border-amber-500 bg-amber-500/10' : 'bg-card hover:bg-muted/50',
          )}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" /> Застой
          </p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{data.totals.stale}</p>
        </button>
        <div className="rounded-xl border bg-card p-3 text-left">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Users className="w-3 h-3" /> Без менеджера
          </p>
          <p className="text-xl font-bold">{data.unassigned.assigned}</p>
          {data.unassigned.overdue > 0 ? (
            <p className="text-[10px] text-red-600">{data.unassigned.overdue} просроч.</p>
          ) : null}
        </div>
      </div>

      {data.managers.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {data.managers.slice(0, 6).map((m) => (
            <div key={m.assigneeId} className="shrink-0 rounded-lg border bg-card px-3 py-2 min-w-[120px]">
              <p className="text-xs font-medium truncate max-w-[140px]">{m.assigneeName}</p>
              <p className="text-[10px] text-muted-foreground">
                {m.assigned} ·{' '}
                {m.overdue > 0 ? (
                  <span className="text-red-600">{m.overdue} проср.</span>
                ) : (
                  `${m.active} акт.`
                )}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default memo(CrmWorkloadStrip);

export function SlaBadge({
  slaState,
  inactiveLabel,
  compact,
}: {
  slaState: string;
  inactiveLabel?: string;
  compact?: boolean;
}) {
  const key = slaState as SlaStateKey;
  if (slaState === 'ARCHIVED' || slaState === 'ACTIVE') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        SLA_STATE_CLASS[key] ?? 'bg-muted',
        compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
      )}
    >
      {SLA_STATE_LABEL[key] ?? slaState}
      {inactiveLabel && slaState !== 'FRESH' ? ` · ${inactiveLabel}` : null}
    </span>
  );
}
