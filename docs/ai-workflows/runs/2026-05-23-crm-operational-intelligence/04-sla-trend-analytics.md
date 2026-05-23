# Iter 35 — SLA Trend Analytics

## Scope

Lightweight trend visibility without a historical SLA warehouse.

---

## What Ships

### Snapshot cards (Ops Center analytics panel)

| Card | Field | Meaning |
|---|---|---|
| Просрочено | `slaTrend.overdueNow` | Current OVERDUE count (open scan) |
| Застой | `slaTrend.staleNow` | Current STALE count |
| Ср. без активности | `sla.avgInactivityHours` | Mean hours since last activity |
| Состояние | `health.hotspot` | Rule-based operational alert |

### Trend proxies

| Proxy | Field | Meaning |
|---|---|---|
| Inflow week delta | `slaTrend.inflowDeltaPct` | Incoming lead pressure change |
| Recovery proxy | `slaTrend.recoveryProxy` | Total outcome events in window |
| Inflow chart | `inflow.byDay` | 14-day mini bar chart |
| Outcome chart | `outcomes.byDay` | 14-day closures mini bar chart |

---

## What Does NOT Ship (Gap)

| Desired metric | Why missing | Future path |
|---|---|---|
| Overdue today vs yesterday | No persisted daily SLA counts | Nightly snapshot job |
| Stale growth rate | Same | Same |
| SLA recovery rate | Needs paired overdue→OK transitions | Event replay or snapshot diff |
| Historical queue pressure | Same | `crm_analytics_snapshots` table |

**Honest label in API:** `slaTrend` comment documents "current snapshot + inflow/outcome proxies — no historical SLA warehouse".

---

## Chart Implementation

CSS-only `MiniBarChart` — no chart library, no canvas, no recharts.

- Height: 48px (`h-12`)
- Bars: `motion-safe:transition-all` — respects reduced motion (no forced animation on bar height)
- `role="img"` + `title` tooltip per bar for accessibility
- Last 14 days displayed from full window

---

## SLA Compute Path

Same shared logic as list/detail:

```
packages/shared/src/crm/request-sla.ts → computeSlaState(request)
```

Applied in `CrmAnalyticsService.compute()` over open rows only — O(n) where n ≤ 2000.

---

## Scan Cap Warning

When `sla.scannedCap === true`, UI shows:

> SLA: показаны первые N открытых заявок (лимит сканирования)

Admin should treat overdue/stale totals as **lower bound** if queue exceeds cap.

---

## Manual QA

- [ ] Overdue count matches `/admin/requests?sla=overdue` (within scan cap)
- [ ] Avg inactivity updates after activity on a lead
- [ ] Hotspot switches to `overdue_elevated` when overdue > 5
- [ ] Inflow chart reflects new leads created today
- [ ] reduced-motion: no bar animation required for readability
