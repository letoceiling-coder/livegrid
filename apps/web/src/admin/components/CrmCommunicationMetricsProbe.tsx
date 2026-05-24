import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { isCrmDebugEnabled, crmObsCommunicationMetrics } from '@/admin/lib/crm-observability';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';

/** DEV-only — loads communication metrics when ?crm_debug=1 */
export default function CrmCommunicationMetricsProbe() {
  const enabled = isCrmDebugEnabled();

  const query = useQuery({
    queryKey: CRM_QUERY_KEYS.communication.metrics,
    queryFn: () =>
      apiGet<{
        activeThreads: number;
        unreadConversations: number;
        avgReplyLatencyMs: number | null;
        staleConversations: number;
        callbackOverdueCount: number;
      }>('/admin/crm/communication/metrics'),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  });

  useEffect(() => {
    if (query.data) crmObsCommunicationMetrics(query.data);
  }, [query.data]);

  return null;
}
