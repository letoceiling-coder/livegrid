/**
 * DEV-only CRM + SLA + polling metrics — ?crm_debug=1
 */

import type { CrmPollingProfile } from '@/admin/lib/crm-polling-policy';

export type CrmSnapshot = {
  listFetchMs: number;
  detailFetchMs: number;
  statusUpdateMs: number;
  slaRecomputeMs: number;
  timelineRenderMs: number;
  notificationFetchMs: number;
  notificationRenderMs: number;
  unreadCountMs: number;
  opsFetchMs: number;
  analyticsFetchMs: number;
  analyticsComputeMs: number;
  timelineComputeMs: number;
  timelineHintsMs: number;
  historyQueryMs: number;
  attributionComputeMs: number;
  lifecycleComputeMs: number;
  outcomeComputeMs: number;
  forecastComputeMs: number;
  qualityAggregationMs: number;
  queryFailureCount: number;
  queryRetryCount: number;
  lastFailedEndpoint: string;
  lastFailedStatus: number;
  listCount: number;
  lastAction: string;
  pollingProfile: CrmPollingProfile;
  focusRefreshCount: number;
  skippedRefreshCount: number;
  visibilityTransitions: number;
  lastVisibility: string;
  invalidationCount: number;
  lastInvalidationScope: string;
  activeQueryCount: number;
  cacheEntryEstimate: number;
  observerCount: number;
  memoryEstimateMb: number;
  analyticsBoundaryErrors: number;
};

let snapshot: CrmSnapshot = {
  listFetchMs: 0,
  detailFetchMs: 0,
  statusUpdateMs: 0,
  slaRecomputeMs: 0,
  timelineRenderMs: 0,
  notificationFetchMs: 0,
  notificationRenderMs: 0,
  unreadCountMs: 0,
  opsFetchMs: 0,
  analyticsFetchMs: 0,
  analyticsComputeMs: 0,
  timelineComputeMs: 0,
  timelineHintsMs: 0,
  historyQueryMs: 0,
  attributionComputeMs: 0,
  lifecycleComputeMs: 0,
  outcomeComputeMs: 0,
  forecastComputeMs: 0,
  qualityAggregationMs: 0,
  queryFailureCount: 0,
  queryRetryCount: 0,
  lastFailedEndpoint: '',
  lastFailedStatus: 0,
  listCount: 0,
  lastAction: '',
  pollingProfile: 'FOCUSED_ACTIVE',
  focusRefreshCount: 0,
  skippedRefreshCount: 0,
  visibilityTransitions: 0,
  lastVisibility: 'visible',
  invalidationCount: 0,
  lastInvalidationScope: '',
  activeQueryCount: 0,
  cacheEntryEstimate: 0,
  observerCount: 0,
  memoryEstimateMb: 0,
  analyticsBoundaryErrors: 0,
};

const listeners = new Set<(s: CrmSnapshot) => void>();

function emit(): void {
  listeners.forEach((fn) => fn({ ...snapshot }));
}

export function isCrmDebugEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('crm_debug') === '1'
  );
}

export function subscribeCrmStats(fn: (s: CrmSnapshot) => void): () => void {
  if (!isCrmDebugEnabled()) return () => {};
  listeners.add(fn);
  fn({ ...snapshot });
  return () => listeners.delete(fn);
}

export function crmObsListFetch(ms: number, count: number, slaMs = 0): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    listFetchMs: ms,
    slaRecomputeMs: slaMs,
    listCount: count,
    lastAction: 'list_fetch',
  };
  emit();
}

export function crmObsDetailFetch(ms: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, detailFetchMs: ms, lastAction: 'detail_fetch' };
  emit();
}

export function crmObsStatusUpdate(ms: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, statusUpdateMs: ms, lastAction: 'status_update' };
  emit();
}

export function crmObsTimelineRender(ms: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, timelineRenderMs: ms, lastAction: 'timeline_render' };
  emit();
}

export function crmObsNotificationFetch(ms: number, count: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, notificationFetchMs: ms, listCount: count, lastAction: 'notification_fetch' };
  emit();
}

export function crmObsNotificationRender(ms: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, notificationRenderMs: ms, lastAction: 'notification_render' };
  emit();
}

export function crmObsUnreadCount(ms: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, unreadCountMs: ms, lastAction: 'unread_count' };
  emit();
}

export function crmObsOpsFetch(ms: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, opsFetchMs: ms, lastAction: 'ops_fetch' };
  emit();
}

export function crmObsAnalyticsFetch(
  ms: number,
  computeMs?: number,
  timelineMs?: number,
  historyMs?: number,
  attributionMs?: number,
  lifecycleMs?: number,
  outcomeMs?: number,
  forecastMs?: number,
): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    analyticsFetchMs: ms,
    analyticsComputeMs: computeMs ?? snapshot.analyticsComputeMs,
    timelineComputeMs: timelineMs ?? snapshot.timelineComputeMs,
    historyQueryMs: historyMs ?? snapshot.historyQueryMs,
    attributionComputeMs: attributionMs ?? snapshot.attributionComputeMs,
    lifecycleComputeMs: lifecycleMs ?? snapshot.lifecycleComputeMs,
    outcomeComputeMs: outcomeMs ?? snapshot.outcomeComputeMs,
    forecastComputeMs: forecastMs ?? snapshot.forecastComputeMs,
    qualityAggregationMs: outcomeMs ?? snapshot.qualityAggregationMs,
    lastAction: 'analytics_fetch',
  };
  emit();
}

export function crmObsTimelineHints(ms: number, count: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    timelineHintsMs: ms,
    listCount: count,
    lastAction: 'timeline_hints',
  };
  emit();
}

export function crmObsPollingProfile(profile: CrmPollingProfile): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, pollingProfile: profile, lastAction: 'profile_change' };
  emit();
}

export function crmObsVisibilityTransition(state: 'visible' | 'hidden'): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    visibilityTransitions: snapshot.visibilityTransitions + 1,
    lastVisibility: state,
    lastAction: `visibility_${state}`,
  };
  emit();
}

export function crmObsFocusRefresh(): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    focusRefreshCount: snapshot.focusRefreshCount + 1,
    lastAction: 'focus_refresh',
  };
  emit();
}

export function crmObsSkipRefresh(reason: string): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    skippedRefreshCount: snapshot.skippedRefreshCount + 1,
    lastAction: `skip_${reason}`,
  };
  emit();
}

export function crmObsQueryFailure(endpointId: string, path: string, status: number, ms: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    queryFailureCount: snapshot.queryFailureCount + 1,
    lastFailedEndpoint: `${endpointId} ${path} (${status}) ${ms.toFixed(0)}ms`,
    lastFailedStatus: status,
    lastAction: `query_fail_${endpointId}`,
  };
  emit();
}

export function crmObsQuerySuccess(_endpointId: string, _ms: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = { ...snapshot, lastAction: 'query_ok' };
  emit();
}

export function crmObsQueryRetry(endpointId: string): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    queryRetryCount: snapshot.queryRetryCount + 1,
    lastAction: `query_retry_${endpointId}`,
  };
  emit();
}

export function crmObsInvalidation(scope: string, keyCount: number): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    invalidationCount: snapshot.invalidationCount + 1,
    lastInvalidationScope: `${scope} (${keyCount})`,
    lastAction: `invalidate_${scope}`,
  };
  emit();
}

export type CrmRuntimeMetrics = {
  activeQueryCount: number;
  cacheEntryEstimate: number;
  observerCount: number;
  memoryEstimateMb?: number;
};

export function crmObsRuntimeMetrics(metrics: CrmRuntimeMetrics): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    activeQueryCount: metrics.activeQueryCount,
    cacheEntryEstimate: metrics.cacheEntryEstimate,
    observerCount: metrics.observerCount,
    memoryEstimateMb: metrics.memoryEstimateMb ?? snapshot.memoryEstimateMb,
    lastAction: 'runtime_sample',
  };
  emit();
}

export function crmObsAnalyticsBoundaryError(message: string, stackHint: string): void {
  if (!isCrmDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    analyticsBoundaryErrors: snapshot.analyticsBoundaryErrors + 1,
    lastAction: `analytics_boundary: ${message.slice(0, 40)}`,
    lastFailedEndpoint: stackHint.slice(0, 80),
  };
  emit();
}
