import { memo } from 'react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FUNNEL_STAGE_LABEL,
  HEALTH_HOTSPOT_LABEL,
  QUALITY_SIGNAL_LABEL,
  TREND_DIRECTION_LABEL,
  type CrmAnalyticsResponse,
  type TrendDirection,
} from '@/admin/lib/crm-analytics';
import { REQUEST_STATUS_LABEL, type RequestStatusKey } from '@/admin/lib/request-crm';

function MiniBarChart({
  data,
  tone = 'primary',
}: {
  data: Array<{ date: string; count: number }>;
  tone?: 'primary' | 'green';
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-0.5 h-12" role="img" aria-label="Trend chart">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 min-w-0 flex flex-col items-center justify-end gap-0.5"
          title={`${d.date}: ${d.count}`}
        >
          <div
            className={cn(
              'w-full rounded-sm motion-safe:transition-all',
              tone === 'green' ? 'bg-green-500/70' : 'bg-primary/70',
            )}
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function Sparkline({ values, tone = 'primary' }: { values: number[]; tone?: 'primary' | 'red' | 'amber' }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-0.5 h-8" role="img" aria-label="Sparkline">
      {values.map((v, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 min-w-0 rounded-sm',
            tone === 'red' ? 'bg-red-500/70' : tone === 'amber' ? 'bg-amber-500/70' : 'bg-primary/70',
          )}
          style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
          title={String(v)}
        />
      ))}
    </div>
  );
}

function TrendArrow({ direction }: { direction: TrendDirection; lowerIsBetter?: boolean }) {
  const Icon = direction === 'improving' ? ArrowDown : direction === 'degrading' ? ArrowUp : ArrowRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        direction === 'stable' && 'text-muted-foreground',
        direction === 'improving' && 'text-emerald-700',
        direction === 'degrading' && 'text-red-600',
      )}
    >
      <Icon className="w-3 h-3" />
      {TREND_DIRECTION_LABEL[direction]}
    </span>
  );
}

type Props = {
  data: CrmAnalyticsResponse;
};

function severityClass(sev: 'green' | 'yellow' | 'red'): string {
  if (sev === 'red') return 'text-red-600 border-red-500/30 bg-red-500/5';
  if (sev === 'yellow') return 'text-amber-700 border-amber-500/30 bg-amber-500/5';
  return 'text-emerald-700 border-emerald-500/30 bg-emerald-500/5';
}

function CrmAnalyticsPanel({ data }: Props) {
  const funnelMax = Math.max(1, ...data.funnel.map((f) => f.count));
  const hotspotLabel = HEALTH_HOTSPOT_LABEL[data.health.hotspot] ?? data.health.hotspot;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm">Операционная аналитика</h2>
        <span className="text-[10px] text-muted-foreground">
          {data.periodDays} дн.
          {data.cached ? ' · cache' : ''}
          {data.computeMs ? ` · ${data.computeMs}ms` : ''}
        </span>
      </div>

      {/* Health + SLA trend cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Просрочено</p>
          <p className="text-xl font-bold text-red-600">{data.slaTrend.overdueNow}</p>
        </div>
        <div className="rounded-xl border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Застой</p>
          <p className="text-xl font-bold text-amber-700">{data.slaTrend.staleNow}</p>
        </div>
        <div className="rounded-xl border p-3 bg-card">
          <p className="text-[10px] uppercase text-muted-foreground">Ср. без активности</p>
          <p className="text-xl font-bold">{data.sla.avgInactivityHours}ч</p>
        </div>
        <div
          className={cn(
            'rounded-xl border p-3',
            data.health.hotspot !== 'stable' ? 'border-amber-500/40 bg-amber-500/5' : 'bg-card',
          )}
        >
          <p className="text-[10px] uppercase text-muted-foreground">Состояние</p>
          <p className="text-sm font-semibold leading-tight">{hotspotLabel}</p>
        </div>
      </div>

      {data.history && data.history.snapshotCount > 0 ? (
        <>
          <div className="flex items-center justify-between gap-2 pt-1">
            <h2 className="font-semibold text-sm">Исторические тренды</h2>
            <span className="text-[10px] text-muted-foreground">
              {data.history.snapshotCount} снимков · {data.history.periodDays}д
              {data.history.queryMs ? ` · ${data.history.queryMs}ms` : ''}
            </span>
          </div>

          {data.history.driftWarnings.length > 0 ? (
            <ul className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-1">
              {data.history.driftWarnings.map((w) => (
                <li key={w} className="text-xs text-red-700">
                  · {w}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.history.series.slice(0, 4).map((s) => (
              <div key={s.metric} className="rounded-xl border bg-card p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className="text-xs font-medium">{s.label}</p>
                  <TrendArrow direction={s.direction} lowerIsBetter={s.lowerIsBetter} />
                </div>
                <Sparkline
                  values={s.points.slice(-7).map((p) => p.value)}
                  tone={s.metric === 'overdue' ? 'red' : s.metric === 'stale' ? 'amber' : 'primary'}
                />
                {s.deltaPct != null ? (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {s.deltaPct > 0 ? '+' : ''}
                    {s.deltaPct}% vs пред. период
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {data.history.managerHistory.length > 0 ? (
            <section className="rounded-xl border bg-card p-4 overflow-x-auto">
              <h3 className="text-sm font-semibold mb-2">История менеджеров</h3>
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="text-muted-foreground text-left border-b">
                    <th className="py-1.5 pr-2">Менеджер</th>
                    <th className="py-1.5 px-1">Просроч.</th>
                    <th className="py-1.5 px-1">Брошен.</th>
                    <th className="py-1.5 px-1">Точек</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.history.managerHistory.slice(0, 6).map((m) => (
                    <tr key={m.assigneeId}>
                      <td className="py-2 pr-2 font-medium truncate max-w-[100px]">{m.assigneeName}</td>
                      <td className="py-2 px-1">
                        <TrendArrow direction={m.overdueDirection} lowerIsBetter />
                      </td>
                      <td className="py-2 px-1">
                        <TrendArrow direction={m.abandonmentDirection} lowerIsBetter />
                      </td>
                      <td className="py-2 px-1 text-muted-foreground">{m.points.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      ) : data.slaTrend.historical === false ? (
        <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed p-3">
          Исторические тренды появятся после первых nightly snapshots. Запустите генерацию вручную или дождитесь cron.
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Воронка CRM</h3>
          <ul className="space-y-2">
            {data.funnel.map((row) => (
              <li key={row.stage}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span>{FUNNEL_STAGE_LABEL[row.stage] ?? row.stage}</span>
                  <span className="text-muted-foreground">
                    {row.count}
                    {row.shareOfPipelinePct != null ? ` · ${row.shareOfPipelinePct}%` : ''}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded-full motion-safe:transition-all"
                    style={{ width: `${(row.count / funnelMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {data.health.bottlenecks[0] ? (
            <p className="text-[11px] text-muted-foreground mt-3">
              Узкое место: {REQUEST_STATUS_LABEL[data.health.bottlenecks[0].stage as RequestStatusKey] ?? data.health.bottlenecks[0].stage} ({data.health.bottlenecks[0].count})
            </p>
          ) : null}
        </section>

        {/* Inflow + outcomes */}
        <section className="rounded-xl border bg-card p-4 space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-sm font-semibold">Входящие заявки</h3>
              {data.inflow.deltaPct != null ? (
                <span
                  className={cn(
                    'text-xs font-medium',
                    data.inflow.deltaPct > 0 ? 'text-amber-700' : 'text-green-700',
                  )}
                >
                  {data.inflow.deltaPct > 0 ? '+' : ''}
                  {data.inflow.deltaPct}% vs пред. нед.
                </span>
              ) : null}
            </div>
            <MiniBarChart data={data.inflow.byDay.slice(-14)} />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Закрытия / успех</h3>
            <MiniBarChart data={data.outcomes.byDay.slice(-14)} tone="green" />
          </div>
        </section>
      </div>

      {/* Latency + manager table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="rounded-xl border bg-card p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold mb-2">Скорость реакции</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Назначение</dt>
              <dd className="font-medium">
                {data.latency.assignmentLatencyMinutes != null
                  ? `${data.latency.assignmentLatencyMinutes} мин`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Первый контакт</dt>
              <dd className="font-medium">
                {data.latency.firstContactLatencyMinutes != null
                  ? `${data.latency.firstContactLatencyMinutes} мин`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Переоткрытия</dt>
              <dd className="font-medium">{data.health.reopenCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Без менеджера</dt>
              <dd className="font-medium">{data.sla.unassignedPressurePct}%</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border bg-card p-4 lg:col-span-2 overflow-x-auto">
          <h3 className="text-sm font-semibold mb-2">Менеджеры — операционные KPI</h3>
          {data.managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет назначенных заявок</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground text-left border-b">
                  <th className="py-1.5 pr-2">Менеджер</th>
                  <th className="py-1.5 px-2">Открытых</th>
                  <th className="py-1.5 px-2">Просроч.%</th>
                  <th className="py-1.5 px-2">Закрыто</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.managers.slice(0, 8).map((m) => (
                  <tr key={m.assigneeId}>
                    <td className="py-2 pr-2 font-medium truncate max-w-[120px]">{m.assigneeName}</td>
                    <td className="py-2 px-2">{m.assigned}</td>
                    <td className={cn('py-2 px-2', m.overduePct >= 25 && 'text-red-600 font-medium')}>
                      {m.overduePct}%
                    </td>
                    <td className="py-2 px-2">{m.completedInPeriod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {data.timeline ? (
        <>
          <div className="flex items-center justify-between gap-2 pt-2">
            <h2 className="font-semibold text-sm">Хронология заявок</h2>
            {data.timeline.computeMs ? (
              <span className="text-[10px] text-muted-foreground">{data.timeline.computeMs}ms</span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Гигиена GREEN</p>
              <p className="text-xl font-bold text-emerald-700">{data.timeline.hygiene.qualityGreen}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">YELLOW</p>
              <p className="text-xl font-bold text-amber-700">{data.timeline.hygiene.qualityYellow}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">RED</p>
              <p className="text-xl font-bold text-red-600">{data.timeline.hygiene.qualityRed}</p>
            </div>
            <div className={cn('rounded-xl border p-3', severityClass(data.timeline.hygiene.reopenHeat))}>
              <p className="text-[10px] uppercase opacity-80">Reopen heat</p>
              <p className="text-sm font-semibold">{QUALITY_SIGNAL_LABEL[data.timeline.hygiene.reopenHeat]}</p>
            </div>
          </div>

          {data.timeline.hygiene.topAlerts.length > 0 ? (
            <ul className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              {data.timeline.hygiene.topAlerts.map((a) => (
                <li key={a} className="text-xs text-amber-800 dark:text-amber-200">
                  · {a}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Операционная гигиена</h3>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Касаний до успеха</dt>
                  <dd className="font-medium">{data.timeline.behavior.medianTouchesBeforeSuccess ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Переходов / лид</dt>
                  <dd className="font-medium">{data.timeline.behavior.avgTransitionsPerLead}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Заметки %</dt>
                  <dd className="font-medium">{data.timeline.behavior.noteDisciplinePct}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Переадресация %</dt>
                  <dd className="font-medium">{data.timeline.behavior.assignmentChurnPct}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Без касаний %</dt>
                  <dd className="font-medium">{data.timeline.behavior.untouchedLeadPct}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Разрыв активности</dt>
                  <dd className="font-medium">
                    {data.timeline.behavior.medianInactivityGapHours != null
                      ? `${data.timeline.behavior.medianInactivityGapHours}ч`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Aging hotspots</h3>
              {data.timeline.agingHotspots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет критичных карманов</p>
              ) : (
                <ul className="space-y-2">
                  {data.timeline.agingHotspots.map((h) => (
                    <li
                      key={h.code}
                      className={cn('rounded-lg border px-3 py-2 text-xs', severityClass(h.severity))}
                    >
                      <p className="font-medium">{h.label}</p>
                      <p className="opacity-80">
                        {h.count} лид(ов)
                        {h.avgInactivityHours > 0 ? ` · ~${h.avgInactivityHours}ч` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-xl border bg-card p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold mb-2">Дисциплина менеджеров</h3>
            {data.timeline.managerPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            ) : (
              <table className="w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="text-muted-foreground text-left border-b">
                    <th className="py-1.5 pr-2">Менеджер</th>
                    <th className="py-1.5 px-1">Откр.</th>
                    <th className="py-1.5 px-1">1-й touch</th>
                    <th className="py-1.5 px-1">Зам.%</th>
                    <th className="py-1.5 px-1">Reassign%</th>
                    <th className="py-1.5 px-1">Брош.%</th>
                    <th className="py-1.5 px-1">Сигнал</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.timeline.managerPerformance.slice(0, 8).map((m) => (
                    <tr key={m.assigneeId}>
                      <td className="py-2 pr-2 font-medium truncate max-w-[100px]">{m.assigneeName}</td>
                      <td className="py-2 px-1">{m.assignedOpen}</td>
                      <td className="py-2 px-1">
                        {m.avgFirstTouchMinutes != null ? `${m.avgFirstTouchMinutes}м` : '—'}
                      </td>
                      <td className="py-2 px-1">{m.noteCoveragePct}%</td>
                      <td className={cn('py-2 px-1', m.reassignmentPct >= 25 && 'text-amber-700 font-medium')}>
                        {m.reassignmentPct}%
                      </td>
                      <td className={cn('py-2 px-1', m.abandonedPct >= 25 && 'text-red-600 font-medium')}>
                        {m.abandonedPct}%
                      </td>
                      <td className={cn('py-2 px-1 font-medium', severityClass(m.qualitySignal))}>
                        {QUALITY_SIGNAL_LABEL[m.qualitySignal]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}

      {data.attribution ? (
        <>
          <div className="flex items-center justify-between gap-2 pt-2">
            <h2 className="font-semibold text-sm">Business attribution</h2>
            <span className="text-[10px] text-muted-foreground">
              {data.attribution.periodDays}д · {data.attribution.scanned} лидов
              {data.attribution.managerScoped ? ' · ваши' : ''}
              {data.attribution.computeMs ? ` · ${data.attribution.computeMs}ms` : ''}
            </span>
          </div>

          {data.attribution.bottlenecks.length > 0 ? (
            <ul className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              {data.attribution.bottlenecks.map((w) => (
                <li key={w} className="text-xs text-amber-800 dark:text-amber-200">
                  · {w}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-xl border bg-card p-4 overflow-x-auto">
              <h3 className="text-sm font-semibold mb-2">Источники лидов</h3>
              <table className="w-full text-xs min-w-[420px]">
                <thead>
                  <tr className="text-muted-foreground text-left border-b">
                    <th className="py-1.5 pr-2">Источник</th>
                    <th className="py-1.5 px-1">Вход</th>
                    <th className="py-1.5 px-1">Откр.</th>
                    <th className="py-1.5 px-1">Проср.%</th>
                    <th className="py-1.5 px-1">Успех%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.attribution.bySource.slice(0, 8).map((s) => (
                    <tr key={s.sourceType}>
                      <td className="py-2 pr-2 font-medium">{s.label}</td>
                      <td className="py-2 px-1">{s.inflow}</td>
                      <td className="py-2 px-1">{s.open}</td>
                      <td className={cn('py-2 px-1', s.overduePct >= 30 && 'text-red-600 font-medium')}>
                        {s.overduePct}%
                      </td>
                      <td className="py-2 px-1">{s.successPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {data.attribution.objectPressure.length > 0 ? (
              <section className="rounded-xl border bg-card p-4 overflow-x-auto">
                <h3 className="text-sm font-semibold mb-2">Давление по объектам</h3>
                <table className="w-full text-xs min-w-[380px]">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b">
                      <th className="py-1.5 pr-2">Объект</th>
                      <th className="py-1.5 px-1">Лидов</th>
                      <th className="py-1.5 px-1">Откр.</th>
                      <th className="py-1.5 px-1">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.attribution.objectPressure.slice(0, 8).map((o) => (
                      <tr key={`${o.objectKind}-${o.objectId}`}>
                        <td className="py-2 pr-2 font-medium truncate max-w-[140px]">{o.objectName}</td>
                        <td className="py-2 px-1">{o.inflow}</td>
                        <td className="py-2 px-1">{o.open}</td>
                        <td className={cn('py-2 px-1', o.pressureScore >= 6 && 'text-red-600 font-medium')}>
                          {o.pressureScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}
          </div>

          {data.history?.sourceTrends && data.history.sourceTrends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.history.sourceTrends.map((s) => (
                <div key={s.metric} className="rounded-xl border bg-card p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="text-xs font-medium">{s.label}</p>
                    <TrendArrow direction={s.direction} />
                  </div>
                  <Sparkline
                    values={s.points.slice(-7).map((p) => p.value)}
                    tone={s.lowerIsBetter ? 'amber' : 'primary'}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {data.pipeline ? (
        <>
          <div className="flex items-center justify-between gap-2 pt-2">
            <h2 className="font-semibold text-sm">Pipeline lifecycle</h2>
            <span className="text-[10px] text-muted-foreground">
              {data.pipeline.sampleSize} лидов
              {data.pipeline.computeMs ? ` · ${data.pipeline.computeMs}ms` : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Успешных</p>
              <p className="text-xl font-bold">{data.pipeline.successPath.count}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Дней до SUCCESS</p>
              <p className="text-xl font-bold">{data.pipeline.successPath.medianLifecycleDays ?? '—'}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Lifecycle (мед.)</p>
              <p className="text-xl font-bold">
                {data.pipeline.avgLifecycleHours != null ? `${data.pipeline.avgLifecycleHours}ч` : '—'}
              </p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Friction</p>
              <p className="text-xl font-bold text-amber-700">{data.pipeline.friction.length}</p>
            </div>
          </div>

          {data.pipeline.friction.length > 0 ? (
            <ul className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-1">
              {data.pipeline.friction.map((f) => (
                <li key={f.code} className="text-xs text-red-800 dark:text-red-200">
                  · {f.label} ({f.count})
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Stage velocity</h3>
              <dl className="space-y-2 text-xs">
                {data.pipeline.transitionLatencies.slice(0, 6).map((t) => (
                  <div key={`${t.from}-${t.to}`} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground truncate">{t.label}</dt>
                    <dd className="font-medium shrink-0">
                      {t.medianHours != null ? `${t.medianHours}ч` : '—'}
                      <span className="text-muted-foreground font-normal"> n={t.sampleSize}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Stage aging (open)</h3>
              {data.pipeline.stageAging.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет открытых стадий</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {data.pipeline.stageAging.map((s) => (
                    <li key={s.stage} className="flex justify-between">
                      <span>{s.label}</span>
                      <span className={cn(s.medianHoursInStage >= 72 && 'text-red-600 font-medium')}>
                        {s.count} · ~{s.medianHoursInStage}ч
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {data.history?.lifecycleTrends && data.history.lifecycleTrends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.history.lifecycleTrends.slice(0, 4).map((s) => (
                <div key={s.metric} className="rounded-xl border bg-card p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="text-xs font-medium">{s.label}</p>
                    <TrendArrow direction={s.direction} />
                  </div>
                  <Sparkline
                    values={s.points.slice(-7).map((p) => p.value)}
                    tone={s.lowerIsBetter ? 'amber' : 'primary'}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {data.conversionQuality ? (
        <>
          <div className="flex items-center justify-between gap-2 pt-2">
            <h2 className="font-semibold text-sm">Conversion quality</h2>
            <span className="text-[10px] text-muted-foreground">
              {data.conversionQuality.sampleSize} лидов
              {data.conversionQuality.computeMs ? ` · ${data.conversionQuality.computeMs}ms` : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Healthy lifecycle</p>
              <p className="text-xl font-bold text-emerald-700">
                {data.conversionQuality.metrics.healthyLifecyclePct}%
              </p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Стабильность SUCCESS</p>
              <p className="text-xl font-bold">{data.conversionQuality.metrics.successStabilityPct}%</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Переговоры → SUCCESS</p>
              <p className="text-xl font-bold">{data.conversionQuality.metrics.negotiationCompletionPct}%</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Recovery SUCCESS</p>
              <p className="text-xl font-bold">{data.conversionQuality.metrics.recoverySuccessPct}%</p>
            </div>
          </div>

          {data.conversionQuality.warnings.length > 0 ? (
            <ul className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              {data.conversionQuality.warnings.map((w) => (
                <li
                  key={w.code}
                  className={cn(
                    'text-xs',
                    w.severity === 'red' && 'text-red-800 dark:text-red-200',
                    w.severity === 'yellow' && 'text-amber-800 dark:text-amber-200',
                  )}
                >
                  · {w.label}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.conversionQuality.managerRecovery.length > 0 ? (
              <section className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-2">Recovery leaders</h3>
                <ul className="space-y-2 text-xs">
                  {data.conversionQuality.managerRecovery.slice(0, 6).map((m) => (
                    <li key={m.assigneeId} className="flex justify-between gap-2">
                      <span className="truncate">{m.assigneeName}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {m.recovered} recovery · {m.strongSuccess} strong
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.conversionQuality.sourceQuality.length > 0 && !data.conversionQuality.managerScoped ? (
              <section className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-2">Source quality</h3>
                <ul className="space-y-2 text-xs">
                  {data.conversionQuality.sourceQuality.slice(0, 6).map((s) => (
                    <li key={s.sourceType} className="flex justify-between gap-2">
                      <span className="truncate">{s.label}</span>
                      <span
                        className={cn(
                          'shrink-0 font-medium',
                          s.qualityScore < 0 && 'text-red-600',
                          s.qualityScore >= 2 && 'text-emerald-700',
                        )}
                      >
                        score {s.qualityScore}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {data.history?.qualityTrends && data.history.qualityTrends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.history.qualityTrends.slice(0, 4).map((s) => (
                <div key={s.metric} className="rounded-xl border bg-card p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="text-xs font-medium">{s.label}</p>
                    <TrendArrow direction={s.direction} />
                  </div>
                  <Sparkline
                    values={s.points.slice(-7).map((p) => p.value)}
                    tone={s.lowerIsBetter ? 'amber' : 'primary'}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {data.operationalForecast ? (
        <>
          <div className="flex items-center justify-between gap-2 pt-2">
            <h2 className="font-semibold text-sm">Operational forecast</h2>
            <span className="text-[10px] text-muted-foreground">
              confidence {data.operationalForecast.confidence}
              {data.operationalForecast.computeMs ? ` · ${data.operationalForecast.computeMs}ms` : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Просрочка +24ч</p>
              <p className="text-xl font-bold">
                ~{data.operationalForecast.slaForecast.overdueProjected24h}
              </p>
              <p className="text-[10px] text-muted-foreground">
                сейчас {data.operationalForecast.slaForecast.overdueNow}
              </p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Застой +48ч</p>
              <p className="text-xl font-bold">
                ~{data.operationalForecast.slaForecast.staleProjected48h}
              </p>
              <p className="text-[10px] text-muted-foreground">
                сейчас {data.operationalForecast.slaForecast.staleNow}
              </p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Readiness</p>
              <p className="text-xl font-bold">{data.operationalForecast.readinessScore}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Risk signals</p>
              <p className={cn(
                'text-xl font-bold',
                data.operationalForecast.riskSignals.some((r) => r.severity === 'red') && 'text-red-600',
              )}>
                {data.operationalForecast.riskSignals.length}
              </p>
            </div>
          </div>

          {data.operationalForecast.riskSignals.length > 0 ? (
            <ul className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              {data.operationalForecast.riskSignals.map((r) => (
                <li
                  key={r.code}
                  className={cn(
                    'text-xs flex justify-between gap-2',
                    r.severity === 'red' && 'text-red-800 dark:text-red-200',
                    r.severity === 'yellow' && 'text-amber-800 dark:text-amber-200',
                  )}
                >
                  <span>· {r.label}</span>
                  <span className="shrink-0 text-muted-foreground">{r.horizon} · {r.confidence}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.operationalForecast.capacityPressure.length > 0 ? (
              <section className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-2">Capacity pressure</h3>
                <ul className="space-y-2 text-xs">
                  {data.operationalForecast.capacityPressure.slice(0, 6).map((m) => (
                    <li key={m.assigneeId} className="flex justify-between gap-2">
                      <span className="truncate">{m.assigneeName}</span>
                      <span className={cn(
                        'shrink-0 font-medium',
                        m.risk === 'red' && 'text-red-600',
                        m.risk === 'yellow' && 'text-amber-700',
                      )}>
                        {m.assignedOpen} open · {m.overduePct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.operationalForecast.pipelineDecay.length > 0 ? (
              <section className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-2">Pipeline decay</h3>
                <ul className="space-y-2 text-xs">
                  {data.operationalForecast.pipelineDecay.map((p) => (
                    <li
                      key={p.code}
                      className={cn(
                        p.severity === 'red' && 'text-red-700',
                        p.severity === 'yellow' && 'text-amber-800',
                      )}
                    >
                      · {p.label}
                      {p.accelerationPct != null ? ` (${p.accelerationPct > 0 ? '+' : ''}${p.accelerationPct}%)` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {data.history?.forecastTrends && data.history.forecastTrends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.history.forecastTrends.slice(0, 4).map((s) => (
                <div key={s.metric} className="rounded-xl border bg-card p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="text-xs font-medium">{s.label}</p>
                    <TrendArrow direction={s.direction} />
                  </div>
                  <Sparkline
                    values={s.points.slice(-7).map((p) => p.value)}
                    tone={s.lowerIsBetter ? 'amber' : 'primary'}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {data.sla.scannedCap ? (
        <p className="text-[10px] text-amber-700">SLA: показаны первые {data.sla.openCount} открытых заявок (лимит сканирования)</p>
      ) : null}
    </div>
  );
}

export default memo(CrmAnalyticsPanel);
