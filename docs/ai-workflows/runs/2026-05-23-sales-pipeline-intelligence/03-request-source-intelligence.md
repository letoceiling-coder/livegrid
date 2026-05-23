# Iter 38 — Request Source Intelligence

## Service

`CrmAttributionService` — `apps/api/src/modules/requests/crm-attribution.service.ts`

Bundled in `GET /admin/ops/analytics` → `response.attribution`

---

## Metrics Per Source

| Field | Definition |
|---|---|
| `inflow` | Leads in period (merged period + open scan) |
| `open` | Non-terminal count |
| `overdue` / `stale` | SLA-derived |
| `overduePct` | overdue / open × 100 |
| `successPct` | SUCCESS+COMPLETED / inflow × 100 |
| `reopenCount` | STATUS_CHANGED from terminal in period |
| `spam` | SPAM status count |

---

## Operational Interpretation

| Pattern | Meaning |
|---|---|
| High inflow + high overdue% | Source creates SLA pressure |
| High spam | Low-quality traffic channel |
| High reopen | Closure quality issue for channel |
| Map vs apartment overdue delta | Processing speed gap by channel |

---

## Role Safety

- **admin/editor:** full attribution + object pressure
- **manager:** scoped to `assignedTo = self`; object pressure + bottlenecks hidden

---

## Bounds

| Constant | Value |
|---|---|
| MAX_ATTRIBUTION_SCAN | 3,000 |
| MAX_REOPEN_EVENTS | 2,000 |
| CACHE_MS | 60,000 |
