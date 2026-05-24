/** Critical admin API routes — must match app.module imports (Iter 82 contract). */

export type AdminRouteManifestEntry = {
  id: string;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  module: string;
  optional?: boolean;
};

export const ADMIN_ROUTE_MANIFEST: AdminRouteManifestEntry[] = [
  { id: 'tasks_summary', method: 'GET', path: '/admin/tasks/summary', module: 'CrmAutomationModule' },
  { id: 'tasks_list', method: 'GET', path: '/admin/tasks', module: 'CrmAutomationModule' },
  { id: 'automation_metrics', method: 'GET', path: '/admin/automation/metrics', module: 'CrmAutomationModule' },
  { id: 'moderation_listings', method: 'GET', path: '/admin/moderation/listings', module: 'ListingsModule' },
  { id: 'moderation_stats', method: 'GET', path: '/admin/moderation/stats', module: 'ListingsModule', optional: true },
  { id: 'trust_metrics', method: 'GET', path: '/admin/trust/metrics', module: 'TrustModule' },
  { id: 'trust_summary', method: 'GET', path: '/admin/trust/summary', module: 'TrustModule' },
  { id: 'billing_metrics', method: 'GET', path: '/admin/billing/metrics', module: 'BillingModule' },
  { id: 'ecosystem_metrics', method: 'GET', path: '/admin/ecosystem/metrics', module: 'EcosystemModule', optional: true },
  { id: 'ops_summary', method: 'GET', path: '/admin/ops/summary', module: 'RequestsModule' },
  { id: 'crm_comm_metrics', method: 'GET', path: '/admin/crm/communication/metrics', module: 'RequestsModule', optional: true },
  { id: 'system_diagnostics', method: 'GET', path: '/admin/system/diagnostics', module: 'SystemDiagnosticsGovernanceModule' },
  { id: 'discovery_metrics', method: 'GET', path: '/admin/discovery/metrics', module: 'DiscoveryModule', optional: true },
];

export const REQUIRED_APP_MODULES = [
  'ListingsModule',
  'RequestsModule',
  'CrmAutomationModule',
  'TrustModule',
  'BillingModule',
  'EcosystemModule',
  'SystemDiagnosticsGovernanceModule',
  'DiscoveryModule',
  'RetentionModule',
  'FeedImportModule',
  'StatsModule',
] as const;
