/**
 * Central CRM React Query keys — single source for cache coordination (Iter 43).
 */

export const CRM_QUERY_KEYS = {
  notifications: {
    root: ['admin', 'crm-notifications'] as const,
    unreadCount: ['admin', 'crm-notifications', 'unread-count'] as const,
    list: ['admin', 'crm-notifications', 'list'] as const,
  },
  ops: {
    root: ['admin', 'ops'] as const,
    summary: ['admin', 'ops', 'summary'] as const,
    analytics: ['admin', 'ops', 'analytics'] as const,
  },
  requests: {
    root: ['admin', 'requests'] as const,
    workload: ['admin', 'requests', 'workload'] as const,
    assignees: ['admin', 'requests', 'assignees'] as const,
    recent: ['admin', 'requests', 'recent'] as const,
    detail: (id: number) => ['admin', 'requests', 'detail', id] as const,
    listPrefix: ['admin', 'requests'] as const,
  },
  communication: {
    root: ['admin', 'crm-communication'] as const,
    inbox: (filter: string) => ['admin', 'crm-communication', 'inbox', filter] as const,
    request: (id: number) => ['admin', 'crm-communication', 'request', id] as const,
    metrics: ['admin', 'crm-communication', 'metrics'] as const,
  },
  automation: {
    root: ['admin', 'automation'] as const,
    summary: ['admin', 'tasks', 'summary'] as const,
    list: (filter: string, page: number) => ['admin', 'tasks', 'list', filter, page] as const,
    request: (id: number) => ['admin', 'automation', 'request', id] as const,
    metrics: ['admin', 'automation', 'metrics'] as const,
  },
  stats: {
    dashboard: ['admin', 'stats', 'dashboard'] as const,
    counters: ['admin', 'stats', 'counters'] as const,
  },
} as const;

/** Focus-refresh scopes — targeted invalidation groups */
export const CRM_FOCUS_SCOPES = {
  opsCenter: [
    CRM_QUERY_KEYS.ops.root,
    CRM_QUERY_KEYS.requests.listPrefix,
    CRM_QUERY_KEYS.notifications.root,
  ],
  requestsList: [
    CRM_QUERY_KEYS.requests.listPrefix,
    CRM_QUERY_KEYS.requests.workload,
  ],
  requestDetail: [
    CRM_QUERY_KEYS.ops.summary,
    CRM_QUERY_KEYS.notifications.unreadCount,
  ],
  dashboard: [
    CRM_QUERY_KEYS.requests.recent,
    CRM_QUERY_KEYS.requests.workload,
    CRM_QUERY_KEYS.stats.dashboard,
    CRM_QUERY_KEYS.notifications.unreadCount,
  ],
} as const;
