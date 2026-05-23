# Iter 39 — Lifecycle Capability Audit

## Pre-Iter 39 Baseline

| Capability | State | Gap |
|---|---|---|
| Funnel counts | ✓ Snapshot | No stage duration |
| Timeline hints | ✓ Iter 36 | No lifecycle-specific |
| Status transitions | ✓ Events | Not aggregated |
| Reopen detection | ◐ Partial | No lifecycle friction |
| Stage velocity | ✗ | No NEW→CONTACTED timing |
| Success path | ◐ Touches only | No lifecycle duration |

---

## Transition Matrix (from RequestEvent)

| Event | Lifecycle use |
|---|---|
| CREATED | Stage NEW anchor |
| STATUS_CHANGED | Stage transitions + reopen |
| CONTACTED | CONTACTED entry |
| VIEWING_SCHEDULED | Viewing entry |
| ASSIGNED | Reassign-before-contact friction |

---

## Post-Iter 39 Matrix

| Requirement | Status |
|---|---|
| Stage enteredAt derivation | ✓ |
| Transition latency medians | ✓ |
| Stage aging (open) | ✓ |
| Friction warnings | ✓ |
| Success path metrics | ✓ |
| Per-lead lifecycle hints | ✓ |
| Snapshot PIPELINE_VELOCITY | ✓ |
| Snapshot LIFECYCLE_FRICTION | ✓ |
| Historical lifecycle trends | ✓ |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/shared build` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
