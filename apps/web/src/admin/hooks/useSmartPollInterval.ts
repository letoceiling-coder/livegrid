import { useMemo } from 'react';
import { getPollInterval, type CrmPollPolicyKey } from '@/admin/lib/crm-polling-policy';
import { useCrmRefreshOptional } from '@/admin/context/CrmRefreshContext';

/** Dynamic refetchInterval for React Query — falls back to 30s if no provider. */
export function useSmartPollInterval(key: CrmPollPolicyKey): number | false {
  const ctx = useCrmRefreshOptional();
  return useMemo(() => {
    if (!ctx) return 30_000;
    return getPollInterval(ctx.profile, key);
  }, [ctx, ctx?.profile, key]);
}

export function useCrmPollMeta() {
  const ctx = useCrmRefreshOptional();
  return {
    profile: ctx?.profile ?? 'FOCUSED_ACTIVE',
    online: ctx?.online ?? true,
    visible: ctx?.visible ?? true,
  };
}
