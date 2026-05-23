# Iter 31 — Manager Assignment

## Mode

Phase 5 — safe assignment UX

---

## Data Model

`requests.assigned_to` → UUID FK to `users.id`  
Relation: `assignedUser` on Request.

Eligible assignees (`GET /admin/requests/assignees`):

- Roles: `manager`, `agent`, `editor`, `admin`
- `isActive: true`

---

## Admin UX

### List filter

`assigned_to=none` → unassigned queue  
`assigned_to=<uuid>` → specific manager's leads

### Detail page

Manager dropdown:

- "Не назначен" → `assignedTo: null`
- User list from assignees endpoint

On change: `PUT /admin/requests/:id` with current status + new `assignedTo`.

### Event log

Assignment change logs `RequestEventType.ASSIGNED` with assignee UUID in `note` field.

---

## Telegram Claim Parity

**File:** `telegram-notify.service.ts` → `claimRequestFromTelegram()`

Flow:

1. Verify Telegram user linked to active staff user (manager/agent/editor/admin)
2. If already assigned to someone else → reject callback
3. Update: `assignedTo = user.id`, `status = IN_PROGRESS`
4. Append `ASSIGNED` (note: "Принято через Telegram")
5. Append `STATUS_CHANGED` if status was not already IN_PROGRESS
6. Update TG message UI via `markRequestMessageClaimed`

Admin detail derives claim time from `ASSIGNED` event — **no dedicated `claimedAt` column**.

---

## Reassignment

Allowed via admin dropdown:

- Admin/editor can reassign any lead
- Manager can reassign (same API role gate — no per-row ownership restriction)

**Gap:** no "only assignee can edit" scoping — all CRM roles see all requests. Acceptable for small teams; add row-level scope if multi-tenant managers needed.

---

## Unassignment

Setting dropdown to "Не назначен" clears `assignedTo`.  
No `UNASSIGNED` event type — consider NOTE or future `UNASSIGNED` event if audit requires it.

---

## What We Did NOT Build

- Fake realtime assignment broadcasts
- Push notifications on assign
- Round-robin auto-assign
- Manager workload balancing
