# Iter 39 — Performance & Governance

## Bounds

| Guard | Value |
|---|---|
| Lifecycle sample | 400 requests |
| Events cap | 400 × 40 |
| Cache | 60s (global) |
| Snapshot kinds | +2 (9/day total) |

---

## DEV Observability

`lifecycleComputeMs` in `crm_debug` overlay.

---

## Role Safety

Managers: lifecycle scoped to `assignedTo = self` (same as attribution).

---

## Storm Prevention

- Single parallel fetch in analytics bundle
- No full-table event replay
- Bounded event take per request

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/shared build` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| Migration `20260523200000` | ✓ DEPLOYED |

---

## Manual QA

- [ ] Stage velocity shows n>0 for active pipeline
- [ ] NEGOTIATION stagnation on old leads
- [ ] Detail lifecycle hints on reopened lead
- [ ] Lifecycle trends after 2+ snapshots with new kinds
- [ ] Manager scoped pipeline
- [ ] No analytics lag / poll storm
