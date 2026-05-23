# Iter 37 — Manager History

## Storage

Daily `MANAGERS` snapshot payload:

```json
{
  "workload": [{ "assigneeId", "assigneeName", "overduePct", ... }],
  "performance": [{ "assigneeId", "abandonedPct", "noteCoveragePct", ... }]
}
```

---

## Historical Reconstruction

`CrmTrendService.buildManagerHistoryFromSnapshots()`:

- Walk each snapshot date
- Merge performance + workload by `assigneeId`
- Build time series per manager

---

## Trend Directions

| Field | lowerIsBetter |
|---|---|
| `overdueDirection` | ✓ |
| `abandonmentDirection` | ✓ |

Computed via `buildManagerHistory()` in shared package.

---

## UI

Ops Center analytics → **История менеджеров** table:

- Manager name
- Overdue trend arrow
- Abandonment trend arrow
- Data point count

Not a leaderboard — operational drift detection only.

---

## Hold

- Manager role still sees all managers (same as Iter 35–36)
- No per-manager export endpoint
