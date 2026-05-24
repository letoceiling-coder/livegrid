# 06 — Observability Validation

**Iteration:** 73 · **Date:** 2026-05-24

## Production (livegrid.ru)

| Probe | Status |
|-------|--------|
| `crm_debug` overlay | ✅ In AdminLayout bundle |
| `listing_debug` overlay | ✅ In AdminLayout bundle |
| `ReliabilityMetricsProbe` | ✅ Loaded |
| Feed integrity panel | ✅ AdminFeedImport |
| Sitemap metrics | ✅ AdminFeedImport + System |
| `/admin/system/diagnostics` | ✅ 200 with feed + sitemap |
| Map debug | ⚠️ Map metrics null (MapViewport not on prod API) |

## DEV vs production

| Feature | DEV | Production |
|---------|-----|------------|
| Platform schema drift | Full module | null (governance slice) |
| Billing metrics | If module loaded | null |
| Trust metrics | If module loaded | null |
| Feed health | ✅ | ✅ |
| Sitemap metrics | ✅ | ✅ |

## Verdict

**Governance observability consistent** across environments for feed/sitemap/CRM counts.
