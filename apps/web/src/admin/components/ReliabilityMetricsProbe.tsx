import { useEffect } from 'react';
import { getReliabilitySnapshot, isReliabilityDebugEnabled, subscribeReliability } from '@/lib/reliability-tracker';
import { crmObsReliabilityMetrics, isCrmDebugEnabled } from '@/admin/lib/crm-observability';

/** Bridge reliability tracker → crm_debug overlay */
export default function ReliabilityMetricsProbe() {
  useEffect(() => {
    if (!isReliabilityDebugEnabled() && !isCrmDebugEnabled()) return;
    const push = () => {
      const s = getReliabilitySnapshot();
      crmObsReliabilityMetrics({
        failedRequests: s.failedRequests,
        retryCount: s.retryCount,
        pollingPressure: s.pollingPressure,
      });
    };
    push();
    return subscribeReliability(push);
  }, []);
  return null;
}
