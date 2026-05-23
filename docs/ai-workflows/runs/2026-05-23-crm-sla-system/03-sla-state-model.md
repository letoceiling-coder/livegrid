# Iter 32 — SLA State Model

## Principles

- **Derived only** — never stored, never manually editable
- **Separate from CRM status** — `NEW` / `IN_PROGRESS` etc. remain manual
- Computed at read time from: `status`, `assignedTo`, `lastActivityAt`, `createdAt`, `now`

---

## States

| State | RU Label | Meaning |
|---|---|---|
| `FRESH` | Свежая | Recent activity or new unassigned within thresholds |
| `ACTIVE` | Активная | In pipeline, within SLA windows |
| `STALE` | Застой | Warning — needs manager attention |
| `OVERDUE` | Просрочена | Critical — exceeded hard threshold |
| `ARCHIVED` | Архив | Terminal CRM statuses |

Terminal statuses: `SUCCESS`, `CLOSED`, `SPAM`, `COMPLETED`, `CANCELLED`

---

## Thresholds (real-estate tuned)

| Context | Stale | Overdue | Anchor |
|---|---|---|---|
| NEW, unassigned | 15 min | 1 hour | `createdAt` |
| IN_PROGRESS | 24 h | 48 h | `lastActivityAt` |
| CONTACTED | 72 h | 7 days | `lastActivityAt` |
| VIEWING_SCHEDULED | 48 h | 5 days | `lastActivityAt` |
| NEGOTIATION | 7 days | 14 days | `lastActivityAt` |
| FRESH window (assigned) | — | — | activity < 30 min → FRESH |

Source: `packages/shared/src/crm/request-sla.ts` → `SLA_THRESHOLDS_MS`

---

## Priority sort key

```
OVERDUE (0) → STALE (1) → NEW as FRESH (2) → ACTIVE (3) → FRESH (4) → ARCHIVED (5)
```

Tie-break: oldest `lastActivityAt` first (most urgent at top).

---

## Transition semantics

SLA states **auto-transition** on time passage — no events logged for SLA changes.

Recovery: any activity bumping `lastActivityAt` recalculates state on next read (e.g. OVERDUE → FRESH).

---

## Tests

`packages/shared/src/crm/request-sla.test.ts` — unassigned NEW stale, IN_PROGRESS overdue, FRESH window.
