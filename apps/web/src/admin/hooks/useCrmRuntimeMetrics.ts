import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { crmObsRuntimeMetrics, isCrmDebugEnabled } from '@/admin/lib/crm-observability';

/** Sample React Query cache graph for ?crm_debug=1 (Iter 43) */
export function useCrmRuntimeMetrics(intervalMs = 5_000): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isCrmDebugEnabled()) return;

    const sample = () => {
      const cache = qc.getQueryCache();
      const queries = cache.getAll();
      const active = queries.filter((q) => q.getObserversCount() > 0);
      const observers = queries.reduce((n, q) => n + q.getObserversCount(), 0);
      const mem =
        typeof performance !== 'undefined' &&
        'memory' in performance &&
        (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
          ? (performance as Performance & { memory: { usedJSHeapSize: number } }).memory
              .usedJSHeapSize /
            (1024 * 1024)
          : undefined;

      crmObsRuntimeMetrics({
        activeQueryCount: active.length,
        cacheEntryEstimate: queries.length,
        observerCount: observers,
        memoryEstimateMb: mem,
      });
    };

    sample();
    const id = setInterval(sample, intervalMs);
    return () => clearInterval(id);
  }, [qc, intervalMs]);
}
