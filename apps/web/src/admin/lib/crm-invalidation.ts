/**
 * CRM query invalidation orchestrator — deduped, scoped bursts (Iter 43).
 */

import type { QueryClient } from '@tanstack/react-query';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { crmObsInvalidation } from '@/admin/lib/crm-observability';

export type CrmInvalidationScope =
  | 'request_mutation'
  | 'notification_read'
  | 'ops_manual'
  | 'requests_manual'
  | 'focus_ops'
  | 'focus_requests'
  | 'focus_detail'
  | 'focus_dashboard';

const SCOPE_KEYS: Record<CrmInvalidationScope, readonly (readonly string[])[]> = {
  /** Status/assignment/note change — refresh lists + ops summary, not full analytics */
  request_mutation: [
    CRM_QUERY_KEYS.requests.listPrefix,
    CRM_QUERY_KEYS.requests.workload,
    CRM_QUERY_KEYS.ops.summary,
    CRM_QUERY_KEYS.notifications.unreadCount,
  ],
  notification_read: [CRM_QUERY_KEYS.notifications.root],
  ops_manual: [CRM_QUERY_KEYS.ops.root],
  requests_manual: [
    CRM_QUERY_KEYS.requests.listPrefix,
    CRM_QUERY_KEYS.requests.workload,
  ],
  focus_ops: [
    CRM_QUERY_KEYS.ops.root,
    CRM_QUERY_KEYS.requests.listPrefix,
    CRM_QUERY_KEYS.notifications.root,
  ],
  focus_requests: [
    CRM_QUERY_KEYS.requests.listPrefix,
    CRM_QUERY_KEYS.requests.workload,
  ],
  focus_detail: [
    CRM_QUERY_KEYS.ops.summary,
    CRM_QUERY_KEYS.notifications.unreadCount,
  ],
  focus_dashboard: [
    CRM_QUERY_KEYS.requests.recent,
    CRM_QUERY_KEYS.requests.workload,
    CRM_QUERY_KEYS.stats.dashboard,
    CRM_QUERY_KEYS.notifications.unreadCount,
  ],
};

let lastInvalidationAt = 0;
const MIN_INVALIDATION_GAP_MS = 800;

async function invalidateKeys(
  qc: QueryClient,
  keys: readonly (readonly string[])[],
  label: string,
): Promise<void> {
  crmObsInvalidation(label, keys.length);
  await Promise.all(
    keys.map((queryKey) =>
      qc.invalidateQueries({
        queryKey: [...queryKey],
        refetchType: 'active',
      }),
    ),
  );
}

/** Invalidate scoped keys with dedupe guard against concurrent bursts */
export async function crmInvalidate(
  qc: QueryClient,
  scope: CrmInvalidationScope,
  opts?: { force?: boolean },
): Promise<void> {
  const now = Date.now();
  if (!opts?.force && now - lastInvalidationAt < MIN_INVALIDATION_GAP_MS) {
    return;
  }
  lastInvalidationAt = now;
  await invalidateKeys(qc, SCOPE_KEYS[scope], scope);
}

/** Focus refresh — invalidate explicit prefixes passed by page hooks */
export async function crmInvalidateFocus(
  qc: QueryClient,
  prefixes: readonly (readonly string[])[],
): Promise<void> {
  const now = Date.now();
  if (now - lastInvalidationAt < MIN_INVALIDATION_GAP_MS) {
    return;
  }
  lastInvalidationAt = now;
  await invalidateKeys(qc, prefixes, 'focus_explicit');
}
