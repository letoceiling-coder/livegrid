# Iter 40 — Manager Recovery Intelligence

## Purpose

Operational visibility into **who recovers weak/problematic leads** — not a gamified leaderboard.

---

## Recovery Signals

| Signal | Detection |
|---|---|
| Stale → success | 3d+ inactivity gap before SUCCESS |
| Reopen recovery | recovered_success + reopenCount > 0 |
| Negotiation recovery | recovered_success + had NEGOTIATION |
| Strong success | strong_success or healthy_lifecycle credited to assignee |

---

## Manager Row Shape

```typescript
{
  assigneeId, assigneeName,
  recovered, staleRecoveries, reopenRecoveries,
  negotiationRecoveries, strongSuccess
}
```

Sorted by `recovered` then `strongSuccess`, capped at 12 (UI shows 6).

---

## Scoping

| Role | View |
|---|---|
| admin / editor | Full recovery table |
| manager | Own row only (`managerScoped: true`) |

---

## Snapshot

`RECOVERY_INTELLIGENCE` — nightly warehouse row for historical recovery rate trends.
