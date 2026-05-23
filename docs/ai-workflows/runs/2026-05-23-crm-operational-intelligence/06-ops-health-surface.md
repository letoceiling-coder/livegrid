# Iter 35 — Ops Health Surface

## Scope

Extend Ops Center (`/admin/ops`) with operational intelligence layer below coordination queues.

---

## Page Structure (Top → Bottom)

1. **Header** — profile, poll interval, manual refresh
2. **Summary KPIs** — open, overdue, stale, unread notifications
3. **Queue sections** — overdue, stale, unassigned (actionable links)
4. **Manager load strip** — coordination cards + overload warning
5. **Analytics panel** (`CrmAnalyticsPanel`) — NEW in Iter 35
6. **Footer timestamp** — server + client refresh times
7. **DEV overlay** — `CrmDebugOverlay`

---

## Analytics Panel Sections

| Section | Content |
|---|---|
| Health + SLA cards | overdue, stale, avg inactivity, hotspot |
| Funnel | 8-stage bars + bottleneck hint |
| Inflow / outcomes | dual mini charts + week delta |
| Reaction speed | assignment latency, contact latency, reopens, unassigned % |
| Manager KPI table | top 8 by overdue risk |

---

## Hotspot Indicators

| Key | Label (RU) | Trigger |
|---|---|---|
| `stable` | Стабильно | Default |
| `overdue_elevated` | Рост просрочек | overdue > 5 |
| `unassigned_pressure` | Давление очереди без менеджера | unassignedPct > 30 |
| `inflow_spike` | Скачок входящих | inflowDeltaPct > 25 |

Hotspot card uses amber border when not stable.

---

## Polling Strategy

| Query | Key | Interval |
|---|---|---|
| Summary | `['admin', 'ops', 'summary']` | `opsCenter` profile interval |
| Analytics | `['admin', 'ops', 'analytics']` | **2×** summary interval |

Rationale: analytics is heavier (multi-query aggregate + 60s server cache); slower poll avoids aggregate storms.

Focus refresh keys: `admin/ops`, `admin/requests`, `admin/crm-notifications`.

---

## Fast Operational Scanning

Designed for manager/admin to answer in <30 seconds:

- Are queues growing? → inflow chart + delta %
- Who is underwater? → manager table overdue %
- Where do leads stall? → funnel bottleneck + aging (API field, expandable later)
- Is SLA degrading? → overdue/stale cards + hotspot
- What needs action now? → queue sections above analytics

---

## Mobile UX (360px)

- KPI grid: `grid-cols-2` on mobile, 4 on sm+
- Funnel + charts: single column until `lg`
- Manager table: `overflow-x-auto`
- Touch targets: refresh button `h-10`, queue rows full-width links
- Bottom padding `pb-24` for mobile nav clearance

---

## Manual QA

- [ ] Analytics loads after summary (non-blocking)
- [ ] Refresh button refetches both queries
- [ ] Hotspot card visible without horizontal scroll at 360px
- [ ] Queue links preserve filters (`sla=overdue`, etc.)
- [ ] Analytics hidden while loading summary spinner only on first load
