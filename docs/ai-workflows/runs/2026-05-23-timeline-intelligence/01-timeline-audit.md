# Iter 36 — Timeline Capability Audit

## Mode

OPERATIONAL INTELLIGENCE EVOLUTION — Phase 1 audit  
**Scope:** RequestEvent timeline behavior only

---

## Pre-Iter 36 Baseline

| Capability | State | Gap |
|---|---|---|
| Event timeline | ✓ Append-only | No aggregate behavior analysis |
| Reopen markers | ◐ UI-only | Not counted in ops analytics |
| Inactivity gaps | ◐ UI markers (24h) | No distribution metrics |
| Manager touch latency | ◐ Team median only | No per-manager breakdown |
| Note discipline | ✗ | Not measured |
| Assignment churn | ✗ | Not measured |
| Lead aging hotspots | ◐ SLA snapshot | No stagnation pockets |
| Timeline quality signals | ✗ | No GREEN/YELLOW/RED |
| Per-lead hints | ✗ | No detail guidance |

---

## Event Inventory

### RequestEventType (schema)

| Type | Emitted when | Analytics use |
|---|---|---|
| `CREATED` | Lead created | Latency anchor, untouched detection |
| `ASSIGNED` | Manager assigned / TG claim | Churn, first-touch proxy |
| `STATUS_CHANGED` | Pipeline transition | Transitions, reopen detection |
| `NOTE_ADDED` | Manager note | Note discipline, touch count |
| `CONTACTED` | Status → CONTACTED | Follow-up gap, reopen-after-contact |
| `VIEWING_SCHEDULED` | Status → VIEWING | Viewing-without-follow-up hotspot |

### TG claim

No separate event type — TG claims emit `ASSIGNED` with note containing "Telegram". Detected in detail UI only.

### Ordering guarantees

- `request_events` indexed `(request_id, created_at)`
- `listForRequest` / `findOne` order `createdAt ASC`
- Append is transactional with `lastActivityAt` bump

---

## Event Quality Matrix (Post-Iter 36)

| Requirement | Status | Notes |
|---|---|---|
| Event density analysis | ✓ DONE | Sample up to 400 requests |
| Assignment sequences | ✓ DONE | Churn %, reassignment per manager |
| Status transition patterns | ✓ DONE | avg transitions/lead |
| Note frequency | ✓ DONE | noteDisciplinePct, noteCoveragePct |
| Reopen sequences | ✓ DONE | reopen loops, reopen heat |
| Inactivity gaps | ✓ DONE | median gap hours |
| TG claim usage | ◐ PARTIAL | Visible on detail, not in aggregates |
| Timeline ordering | ✓ VERIFIED | ASC guaranteed |
| Per-request hints | ✓ DONE | Server-derived on detail |
| AI / LLM analysis | ✗ OUT OF SCOPE | — |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
