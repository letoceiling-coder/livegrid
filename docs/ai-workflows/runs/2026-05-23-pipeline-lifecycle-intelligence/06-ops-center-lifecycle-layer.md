# Iter 39 — Ops Center Lifecycle Layer

## UI Sections (`CrmAnalyticsPanel`)

1. **Pipeline lifecycle** KPI grid
2. **Friction warnings** (red list)
3. **Stage velocity** table
4. **Stage aging** (open pipeline)
5. **Lifecycle trend sparklines** from `history.lifecycleTrends`

---

## Historical Trends

| Series | Source snapshot |
|---|---|
| NEW→CONTACTED (ч) | PIPELINE_VELOCITY |
| NEGOTIATION→SUCCESS (ч) | PIPELINE_VELOCITY |
| Friction signals | LIFECYCLE_FRICTION |
| Успех: дней до SUCCESS | PIPELINE_VELOCITY.successPath |

---

## Polling

Bundled in analytics — no extra poll. Manager scoped to assigned leads.

---

## Mobile

2×2 KPI grid, stacked velocity/aging, 2-col lifecycle trends on sm+.
