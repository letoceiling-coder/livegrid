import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGetOrNull } from '@/lib/api';
import { adminAuthQueryOptions } from '@/shared/lib/admin-auth-query';
import { isCrmDebugEnabled, crmObsAutomationMetrics } from '@/admin/lib/crm-observability';

type AutomationMetrics = {
  staleRescueRate: number;
  overdueCallbacks: number;
  followUpCompletionRate: number;
  taskPressure: number;
  automationEffectiveness: number;
  cooldownSkips: number;
  tasksCreated24h: number;
  tasksCompleted24h: number;
};

export default function CrmAutomationMetricsProbe() {
  const enabled = isCrmDebugEnabled();

  const query = useQuery({
    queryKey: ['admin', 'automation', 'debug-metrics'],
    queryFn: () => apiGetOrNull<AutomationMetrics>('/admin/automation/metrics'),
    ...adminAuthQueryOptions({
      enabled,
      staleTime: 30_000,
      refetchInterval: enabled ? 60_000 : false,
    }),
  });

  useEffect(() => {
    if (!enabled || !query.data) return;
    crmObsAutomationMetrics(query.data);
  }, [enabled, query.data]);

  return null;
}
