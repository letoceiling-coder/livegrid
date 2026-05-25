import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmApiGetOptionalAuth } from '@/admin/lib/crm-api';
import { adminAuthQueryOptions } from '@/shared/lib/admin-auth-query';
import { isCrmDebugEnabled, crmObsCommunicationMetrics } from '@/admin/lib/crm-observability';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';

/** DEV-only — loads communication metrics when ?crm_debug=1 */
export default function CrmCommunicationMetricsProbe() {
  const enabled = isCrmDebugEnabled();

  const query = useQuery({
    queryKey: CRM_QUERY_KEYS.communication.metrics,
    queryFn: () =>
      crmApiGetOptionalAuth<{
        activeThreads: number;
        unreadConversations: number;
        avgReplyLatencyMs: number | null;
        staleConversations: number;
        callbackOverdueCount: number;
      }>('/admin/crm/communication/metrics', 'communication_metrics'),
    ...adminAuthQueryOptions({
      enabled,
      staleTime: 30_000,
      refetchInterval: enabled ? 60_000 : false,
    }),
  });

  useEffect(() => {
    if (query.data) crmObsCommunicationMetrics(query.data);
  }, [query.data]);

  return null;
}
