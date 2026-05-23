# Iter 31 — Lead Status System

## Mode

Phase 2 — production-grade request lifecycle

---

## Status Catalog

| Status | Label (RU) | Semantics | Terminal |
|---|---|---|---|
| `NEW` | Новая | Just created, unassigned or awaiting first action | No |
| `IN_PROGRESS` | В работе | Manager owns the lead | No |
| `CONTACTED` | Связались | First contact made | No |
| `VIEWING_SCHEDULED` | Просмотр | Viewing appointment set | No |
| `NEGOTIATION` | Переговоры | Active deal discussion | No |
| `SUCCESS` | Успех | Deal won / goal achieved | Yes |
| `CLOSED` | Закрыта | Closed without success (lost, duplicate) | Yes |
| `SPAM` | Спам | Invalid / junk lead | Yes |
| `COMPLETED` | Завершена | **Legacy** → maps to SUCCESS in UI normalization | Yes |
| `CANCELLED` | Отменена | **Legacy** → maps to CLOSED in UI normalization | Yes |

---

## Badge Colors (admin)

Defined in `apps/web/src/admin/lib/request-crm.ts`:

- NEW — blue
- IN_PROGRESS — amber
- CONTACTED — cyan
- VIEWING_SCHEDULED — violet
- NEGOTIATION — orange
- SUCCESS / COMPLETED — green
- CLOSED / CANCELLED — muted
- SPAM — red

Filter chips: `STATUS_FILTER_OPTIONS` (Все + 8 pipeline statuses).

---

## Transition Rules

**Source of truth:** `apps/api/src/modules/requests/request-status.ts`

Rules are **enforced on PUT** — invalid transitions return `400 Bad Request`.

### Allowed transitions (summary)

```
NEW → IN_PROGRESS | CONTACTED | SPAM | CLOSED | CANCELLED

IN_PROGRESS → CONTACTED | VIEWING_SCHEDULED | NEGOTIATION | SUCCESS | COMPLETED | CLOSED | CANCELLED | SPAM

CONTACTED → IN_PROGRESS | VIEWING_SCHEDULED | NEGOTIATION | SUCCESS | COMPLETED | CLOSED | CANCELLED | SPAM

VIEWING_SCHEDULED → CONTACTED | NEGOTIATION | SUCCESS | COMPLETED | CLOSED | CANCELLED | IN_PROGRESS

NEGOTIATION → SUCCESS | COMPLETED | CLOSED | CANCELLED | IN_PROGRESS | CONTACTED

SUCCESS → CLOSED | CANCELLED

COMPLETED → CLOSED | CANCELLED | SUCCESS

CLOSED | CANCELLED | SPAM → IN_PROGRESS  (reopen)
```

**Blocked example:** `NEW → SUCCESS` (must progress through pipeline).

Frontend mirrors allowed next statuses in detail page dropdown via `allowedNextStatuses()` — UX hint only; backend is authoritative.

---

## Side Effects on Status Change

When status changes via `RequestsService.updateStatus`:

1. `RequestEvent` `STATUS_CHANGED` with `fromStatus` / `toStatus`
2. If → `CONTACTED`: additional `CONTACTED` event
3. If → `VIEWING_SCHEDULED`: additional `VIEWING_SCHEDULED` event

TG claim auto-sets `IN_PROGRESS` + logs `ASSIGNED` + `STATUS_CHANGED`.

---

## Legacy Data

Existing rows with `COMPLETED` / `CANCELLED` remain valid enum values.

- `normalizeRequestStatus()` maps COMPLETED→SUCCESS, CANCELLED→CLOSED for display logic
- Transitions from legacy statuses follow COMPLETED/CANCELLED rules in transition table

---

## Tests

`apps/api/src/modules/requests/request-status.test.ts` — vitest unit tests (excluded from main `tsc`; run when vitest added to api package).

---

## Out of Scope

- Freeform custom statuses
- Per-tenant status configuration
- Automated status from external CRM webhooks
