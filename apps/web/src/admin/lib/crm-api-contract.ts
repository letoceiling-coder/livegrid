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
  { id: 'tasks_summary', method: 'GET', path: '/admin/tasks/summary', roles: ['admin', 'editor', 'manager'], responseShape: 'TaskSummary' },
  { id: 'tasks_list', method: 'GET', path: '/admin/tasks', roles: ['admin', 'editor', 'manager'], responseShape: 'PaginatedTasks' },
  { id: 'tasks_complete', method: 'POST', path: '/admin/tasks/:id/complete', roles: ['admin', 'editor', 'manager'], responseShape: 'TaskRow' },
  { id: 'automation_metrics', method: 'GET', path: '/admin/automation/metrics', roles: ['admin', 'editor', 'manager'], responseShape: 'AutomationMetrics' },
  { id: 'trust_metrics', method: 'GET', path: '/admin/trust/metrics', roles: ['admin', 'editor', 'manager'], responseShape: 'TrustMetrics' },
  { id: 'trust_summary', method: 'GET', path: '/admin/trust/summary', roles: ['admin', 'editor', 'manager'], responseShape: 'TrustSummary' },
  { id: 'billing_metrics', method: 'GET', path: '/admin/billing/metrics', roles: ['admin', 'editor', 'manager'], responseShape: 'BillingMetrics' },
  { id: 'moderation_listings', method: 'GET', path: '/admin/moderation/listings', roles: ['admin', 'editor', 'manager'], responseShape: 'ModerationQueue' },
  { id: 'ecosystem_profiles', method: 'GET', path: '/admin/ecosystem/profiles', roles: ['admin', 'editor', 'manager'], responseShape: 'EcosystemProfiles' },
  { id: 'request_automation', method: 'GET', path: '/admin/requests/:id/automation', roles: ['admin', 'editor', 'manager'], responseShape: 'RequestAutomation' },
  { id: 'tasks_dismiss', method: 'POST', path: '/admin/tasks/:id/dismiss', roles: ['admin', 'editor', 'manager'], responseShape: 'TaskRow' },
];

export const CRM_POLLING_QUERY_KEYS = [
  ['admin', 'crm-notifications'],
  ['admin', 'crm-notifications', 'unread-count'],
  ['admin', 'requests', 'workload'],
  ['admin', 'ops', 'summary'],
  ['admin', 'ops', 'analytics'],
] as const;
