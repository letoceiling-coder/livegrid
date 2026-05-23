# Iter 36 — Ops Center Integration

## Changes

Extended `CrmAnalyticsPanel` with **Timeline intelligence** section below Iter 35 analytics.

No new API endpoint — data arrives via existing `GET /admin/ops/analytics?days=14` → `response.timeline`.

---

## New Sections

| Section | Content |
|---|---|
| Hygiene KPI grid | GREEN / YELLOW / RED counts + reopen heat |
| Top alerts | Red hint messages from sample |
| Operational hygiene | Behavior metrics (touches, churn, notes, gaps) |
| Aging hotspots | Stagnation / viewing / reopen cards |
| Manager discipline | Performance table (8 rows) |

---

## Polling

Unchanged from Iter 35:
- Summary: ops profile interval
- Analytics (+ timeline): 2× interval, 60s staleTime
- Server cache: 60s includes timeline compute

Timeline adds one batched event query per analytics refresh — no extra client poll.

---

## Page Flow (scan in <60s)

1. Summary KPIs + queues (action now)
2. Manager load strip (coordination)
3. Iter 35 funnel / SLA / manager KPI
4. **Iter 36 hygiene + hotspots + discipline** (behavior)
5. Footer timestamp

---

## Mobile (360px)

- Hygiene grid: 2×2
- Manager discipline table: horizontal scroll (`min-w-[520px]`)
- Hotspot cards: full width stack
- Touch-friendly refresh unchanged

---

## Files

| File | Role |
|---|---|
| `CrmAnalyticsPanel.tsx` | Timeline UI sections |
| `crm-analytics.ts` | Extended types |
| `AdminOpsCenter.tsx` | Passes `timeline.computeMs` to observability |
