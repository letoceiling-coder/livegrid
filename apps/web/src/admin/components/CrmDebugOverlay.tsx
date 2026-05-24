import { useEffect, useState } from 'react';
import { subscribeCrmStats, type CrmSnapshot, isCrmDebugEnabled } from '@/admin/lib/crm-observability';
import { estimatePollingSavingsPct } from '@/admin/lib/crm-polling-policy';

export default function CrmDebugOverlay() {
  const [stats, setStats] = useState<CrmSnapshot | null>(null);
  const enabled = isCrmDebugEnabled();

  useEffect(() => {
    if (!enabled) return;
    return subscribeCrmStats(setStats);
  }, [enabled]);

  if (!enabled || !stats) return null;

  const savings = estimatePollingSavingsPct(stats.pollingProfile, 'opsCenter');

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-2 z-[100] max-w-[240px] rounded-lg border border-border/80 bg-background/95 px-2.5 py-2 font-mono text-[10px] shadow-md backdrop-blur-sm max-sm:bottom-20 max-sm:left-2 max-sm:right-auto max-sm:max-w-[200px]"
      aria-hidden="true"
    >
      <p className="font-semibold text-[11px] mb-1 text-primary">crm_debug</p>
      <p>profile: {stats.pollingProfile}</p>
      <p>poll savings: ~{savings}%</p>
      <p>focus refresh: {stats.focusRefreshCount}</p>
      <p>invalidations: {stats.invalidationCount} ({stats.lastInvalidationScope || '—'})</p>
      <p>queries: {stats.activeQueryCount} active / {stats.cacheEntryEstimate} cache</p>
      <p>observers: {stats.observerCount}{stats.memoryEstimateMb > 0 ? ` · ${stats.memoryEstimateMb.toFixed(1)}MB` : ''}</p>
      <p>skipped: {stats.skippedRefreshCount}</p>
      <p>vis: {stats.visibilityTransitions} ({stats.lastVisibility})</p>
      <p>ops: {stats.opsFetchMs.toFixed(0)}ms</p>
      <p>analytics: {stats.analyticsFetchMs.toFixed(0)}ms ({stats.analyticsComputeMs.toFixed(0)} srv)</p>
      <p>timeline: {stats.timelineComputeMs.toFixed(0)}ms · hints {stats.timelineHintsMs.toFixed(0)}ms</p>
      <p>history: {stats.historyQueryMs.toFixed(0)}ms</p>
      <p>attribution: {stats.attributionComputeMs.toFixed(0)}ms</p>
      <p>lifecycle: {stats.lifecycleComputeMs.toFixed(0)}ms</p>
      <p>outcome: {stats.outcomeComputeMs.toFixed(0)}ms · forecast {stats.forecastComputeMs.toFixed(0)}ms</p>
      <p>list: {stats.listFetchMs.toFixed(0)}ms</p>
      <p>unread: {stats.unreadCountMs.toFixed(0)}ms</p>
      <p>query fails: {stats.queryFailureCount} · retries: {stats.queryRetryCount}</p>
      {stats.analyticsBoundaryErrors > 0 ? (
        <p className="text-amber-700">analytics boundary: {stats.analyticsBoundaryErrors}</p>
      ) : null}
      {stats.lastFailedEndpoint ? (
        <p className="truncate text-red-600">fail: {stats.lastFailedEndpoint}</p>
      ) : null}
      <p>comm: {stats.communicationFetchMs.toFixed(0)}ms</p>
      <p>threads: {stats.activeThreads} · unread: {stats.unreadConversations}</p>
      <p>stale: {stats.staleConversations} · cb: {stats.callbackOverdueCount}</p>
      {stats.avgReplyLatencyMs != null ? (
        <p>reply lat: {(stats.avgReplyLatencyMs / 1000).toFixed(1)}s</p>
      ) : null}
      <p>auto: {stats.automationFetchMs.toFixed(0)}ms</p>
      <p>tasks: {stats.automationPendingTasks} · rec: {stats.automationRecommendations}</p>
      <p>pressure: {stats.automationTaskPressure} · eff: {stats.automationEffectiveness}%</p>
      <p>runs: {stats.automationRuns} · created: {stats.automationTasksCreated}</p>
      <p>cooldown skips: {stats.automationCooldownSkips}</p>
      <p>rel fails: {stats.reliabilityFailedRequests} · retries: {stats.reliabilityRetryCount}</p>
      <p>poll pressure: {stats.reliabilityPollingPressure}</p>
      <p className="truncate">last: {stats.lastAction}</p>
    </div>
  );
}
