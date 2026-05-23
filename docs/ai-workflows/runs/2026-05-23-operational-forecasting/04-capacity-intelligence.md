# Iter 41 — Capacity Intelligence

## Manager Saturation Score

```
saturationScore = assignedOpen × 2 + overdue × 3 + overduePct × 0.5
```

| Risk | Threshold |
|---|---|
| yellow | score ≥ 15 OR overduePct ≥ 25% |
| red | score ≥ 25 OR overduePct ≥ 40% |

---

## Team Signals

| Signal | Condition |
|---|---|
| `manager_saturation` | ≥2 managers with yellow/red risk |

Not employee surveillance — operational queue visibility only.

---

## Capacity Snapshot

`CAPACITY_PRESSURE` nightly payload:

- `capacityPressure[]` — top 12 managers by saturation
- `teamSaturationScore` — average saturation

---

## Manager Scoping

Managers see only their own `capacityPressure` row in Ops Center (`managerScoped: true`).
