# Iter 35 — Manager Intelligence

## Scope

Operational manager metrics for admins — **no gamification**, no leaderboards, no public scoring.

---

## Metrics Per Manager

| Field | Definition |
|---|---|
| `assigneeName` | `fullName ?? email ?? id` |
| `assigned` | Open pipeline leads currently assigned |
| `overdue` | Subset in OVERDUE SLA state |
| `stale` | Subset in STALE SLA state (computed, not shown in table) |
| `overduePct` | `overdue / assigned × 100`, rounded |
| `completedInPeriod` | Terminal completions with `updatedAt` in analytics window |

Sort: highest overdue % first, then most assigned — surfaces risk, not "top performer".

---

## UI Surfaces

### Ops Center — coordination strip (Iter 34)

`data.managers` from `/admin/ops/summary` — live cards with assigned / overdue / stale counts and overload warning.

Purpose: **immediate action** — who to nudge now.

### Analytics panel — KPI table (Iter 35)

`CrmAnalyticsPanel` table — assigned, overdue %, completed in period.

Purpose: **period visibility** — workload balance and completion throughput.

**Intentional overlap:** summary = now; analytics = window + overdue % ranking.

---

## Visibility & Roles

Both endpoints protected:

```typescript
@Roles('admin', 'editor', 'manager')
```

Managers see aggregate team metrics (same as admins in current implementation).  
Future: scope manager rows to self-only for `manager` role — **not implemented** (document as hold item if needed).

---

## What We Do NOT Show

- Individual response time per manager (only team median latency)
- Reopen rate per manager (team reopen count only)
- Rank badges / points / streaks
- Comparison to targets or quotas

---

## Workload Balance Signals

| Signal | Where |
|---|---|
| `escalation.overloadManagers` | Ops summary — managers with high overdue+stale |
| `overduePct >= 25` | Analytics table — red text highlight |
| `m.overdue >= 2` | Summary cards — red border |

---

## Manual QA

- [ ] Manager with no assignments absent from table
- [ ] Overdue % matches manual count on assigned open leads
- [ ] Completed count increases after closing lead in window
- [ ] Table scrolls horizontally on narrow screens without breaking layout
- [ ] Truncated names at `max-w-[120px]` on mobile
