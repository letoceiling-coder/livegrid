# Iter 32 — Last Activity System

## Canonical field

**`requests.last_activity_at`** — single source of truth for operational inactivity calculations.

---

## Update rules

`lastActivityAt` bumps on every meaningful CRM action via `RequestEventsService.append()` (transactional with event insert):

| Action | Event type |
|---|---|
| Lead created | `CREATED` |
| Note added | `NOTE_ADDED` |
| Assignment | `ASSIGNED` |
| Status change | `STATUS_CHANGED` |
| Contact logged | `CONTACTED` |
| Viewing set | `VIEWING_SCHEDULED` |
| TG claim | `ASSIGNED` + `STATUS_CHANGED` |

**Does NOT bump on:**

- `telegramSent` flag update (notification delivery ≠ manager activity)
- Unassign (`assignedTo → null`) — no event appended

---

## Implementation

```typescript
// request-events.service.ts — append() uses $transaction:
// 1. create RequestEvent
// 2. update request.lastActivityAt = now
```

Create path sets `lastActivityAt: now` on insert; first `CREATED` event confirms same timestamp.

---

## Backfill (migration)

```sql
UPDATE requests r SET last_activity_at = COALESCE(
  (SELECT MAX(created_at) FROM request_events e WHERE e.request_id = r.id),
  r.updated_at,
  r.created_at
);
```

---

## Derivation vs persistence

- **Persisted:** `lastActivityAt` (write path)
- **Derived:** `inactiveMs`, `slaState` (read path via `computeSlaState()`)

Managers cannot edit `lastActivityAt` directly — no API field exposed.

---

## Gaps

- Phone call without note/status does not bump activity (no telephony integration)
- Future: optional `CONTACTED` quick-action button if call tracking added
