# Iter 38 — Ops Center Business Layer

## New Sections (`CrmAnalyticsPanel`)

1. **Business attribution** header + timing
2. **Bottleneck warnings** list
3. **Источники лидов** table — inflow, open, overdue%, success%
4. **Давление по объектам** table (admin/editor)
5. **Source trend sparklines** from `history.sourceTrends` (when snapshots exist)

---

## Historical Source Trends

From Iter 37 snapshots extended with:

| Series | Source |
|---|---|
| Лиды с карты | MAP_POPUP inflow |
| Просрочка: карта % | MAP_POPUP overduePct |
| Давление топ-объекта | max object pressureScore |

---

## Polling

Unchanged — attribution bundled in analytics query (2× ops interval).

---

## Mobile

- Source table: horizontal scroll `min-w-[420px]`
- Object table: `min-w-[380px]`
- Source trends: 1 col mobile, 3 col sm+

---

## Manager View

Shows **ваши** scoped source metrics only; no cross-team object pressure.
