/** CRM API contract — single source of truth (Iter 42). */

export type CrmApiEndpoint = {
  id: string;
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  roles: string[];
  responseShape: string;
};

export const CRM_API_CONTRACT: CrmApiEndpoint[] = [
  { id: 'notifications_unread', method: 'GET', path: '/admin/crm-notifications/unread-count', roles: ['admin', 'editor', 'manager'], responseShape: '{ count: number }' },
  { id: 'notifications_list', method: 'GET', path: '/admin/crm-notifications', roles: ['admin', 'editor', 'manager'], responseShape: '{ data, unreadCount, meta }' },
  { id: 'notifications_read', method: 'POST', path: '/admin/crm-notifications/:id/read', roles: ['admin', 'editor', 'manager'], responseShape: '{ ok }' },
  { id: 'notifications_read_all', method: 'POST', path: '/admin/crm-notifications/read-all', roles: ['admin', 'editor', 'manager'], responseShape: '{ count }' },
  { id: 'requests_workload', method: 'GET', path: '/admin/requests/workload', roles: ['admin', 'editor', 'manager'], responseShape: '{ totals, unassigned, managers }' },
  { id: 'requests_assignees', method: 'GET', path: '/admin/requests/assignees', roles: ['admin', 'editor', 'manager'], responseShape: 'AssigneeRow[]' },
  { id: 'requests_list', method: 'GET', path: '/admin/requests', roles: ['admin', 'editor', 'manager'], responseShape: 'PaginatedResult' },
  { id: 'requests_detail', method: 'GET', path: '/admin/requests/:id', roles: ['admin', 'editor', 'manager'], responseShape: 'RequestDetail' },
  { id: 'ops_summary', method: 'GET', path: '/admin/ops/summary', roles: ['admin', 'editor', 'manager'], responseShape: 'OpsSummary' },
  { id: 'ops_analytics', method: 'GET', path: '/admin/ops/analytics', roles: ['admin', 'editor', 'manager'], responseShape: 'CrmAnalyticsResponse' },
  { id: 'ops_snapshots_status', method: 'GET', path: '/admin/ops/snapshots/status', roles: ['admin', 'editor'], responseShape: 'SnapshotStatus' },
];

export const CRM_POLLING_QUERY_KEYS = [
  ['admin', 'crm-notifications'],
  ['admin', 'crm-notifications', 'unread-count'],
  ['admin', 'requests', 'workload'],
  ['admin', 'ops', 'summary'],
  ['admin', 'ops', 'analytics'],
] as const;
