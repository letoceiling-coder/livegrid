# Iter 36 — Manager Performance Layer

## Intent

Operational behavior visibility for admins — **not** a sales leaderboard.

---

## Metrics Per Manager

Computed by `computeManagerPerformance()` over open assigned leads in timeline sample.

| Field | Definition |
|---|---|
| `assignedOpen` | Current open pipeline count |
| `avgFirstTouchMinutes` | Median CREATED → first NOTE/CONTACT/ASSIGN |
| `avgInactivityGapHours` | Median gap between consecutive events |
| `noteCoveragePct` | Open leads with notes / assigned × 100 |
| `reassignmentPct` | Leads with >1 ASSIGNED / assigned × 100 |
| `reopenAfterContactPct` | Contacted leads with reopen / contacted × 100 |
| `abandonedPct` | Open leads in STALE or OVERDUE SLA / assigned × 100 |
| `touchesPerLead` | Total touches / assigned |
| `qualitySignal` | Worst hint severity across their open leads |

Sorted by `abandonedPct DESC`, then `reassignmentPct DESC`.

---

## Safe Interpretation Guide

| Signal | Likely meaning | Action |
|---|---|---|
| High abandoned % | SLA neglect on assigned queue | Review overdue list |
| High reassignment % | Routing churn or handoffs | Check assignment policy |
| Low note coverage | Weak documentation | Coaching, not punishment |
| High reopen-after-contact | Premature closure or client churn | Review closure criteria |
| GREEN quality | Healthy cadence on sample | No action needed |

---

## UI Surfaces

1. **Ops Center → Analytics → Дисциплина менеджеров** — timeline performance table (Iter 36)
2. **Ops Center → Нагрузка менеджеров** — live workload strip (Iter 34, unchanged)

Overlap is intentional: workload = now; discipline = behavior over timeline sample.

---

## Role Safety

Same as analytics: `@Roles('admin', 'editor', 'manager')`.

Future hold: scope `manager` role to own row only.

---

## Out of Scope

- Gamification / ranks / badges
- Quota targets
- Individual revenue attribution
