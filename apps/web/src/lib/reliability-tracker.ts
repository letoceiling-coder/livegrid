/**
 * DEV-only API reliability tracking — ?crm_debug=1 / ?listing_debug=1
 */

type ReliabilitySnapshot = {
  failedRequests: number;
  retryCount: number;
  lastFailedPath: string;
  lastFailedStatus: number;
  listenerCountEstimate: number;
  pollingPressure: number;
};

let snapshot: ReliabilitySnapshot = {
  failedRequests: 0,
  retryCount: 0,
  lastFailedPath: '',
  lastFailedStatus: 0,
  listenerCountEstimate: 0,
  pollingPressure: 0,
};

const listeners = new Set<(s: ReliabilitySnapshot) => void>();

function emit(): void {
  listeners.forEach((fn) => fn({ ...snapshot }));
}

export function isReliabilityDebugEnabled(): boolean {
  if (import.meta.env.PROD) return false;
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('crm_debug') === '1' || q.get('listing_debug') === '1';
  } catch {
    return false;
  }
}

export function trackApiFailure(path: string, status: number): void {
  if (!isReliabilityDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    failedRequests: snapshot.failedRequests + 1,
    lastFailedPath: path,
    lastFailedStatus: status,
  };
  emit();
}

export function trackApiRetry(path: string): void {
  if (!isReliabilityDebugEnabled()) return;
  snapshot = {
    ...snapshot,
    retryCount: snapshot.retryCount + 1,
    lastFailedPath: path,
  };
  emit();
}

export function trackPollingPressure(count: number): void {
  if (!isReliabilityDebugEnabled()) return;
  snapshot = { ...snapshot, pollingPressure: count };
  emit();
}

export function trackListenerEstimate(count: number): void {
  if (!isReliabilityDebugEnabled()) return;
  snapshot = { ...snapshot, listenerCountEstimate: count };
  emit();
}

export function getReliabilitySnapshot(): ReliabilitySnapshot {
  return { ...snapshot };
}

export function subscribeReliability(fn: (s: ReliabilitySnapshot) => void): () => void {
  if (!isReliabilityDebugEnabled()) return () => {};
  listeners.add(fn);
  fn({ ...snapshot });
  return () => listeners.delete(fn);
}
