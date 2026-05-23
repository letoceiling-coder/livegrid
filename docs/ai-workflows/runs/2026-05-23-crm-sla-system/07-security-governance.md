# Iter 32 — Security + SLA Governance

## Strict separation

| Layer | Mutable by manager? | API exposure |
|---|---|---|
| CRM status (`NEW`…`SPAM`) | ✓ Yes | `PUT /admin/requests/:id` |
| Assignment | ✓ Yes | Same |
| Notes / events | ✓ Append only | `POST …/notes` |
| **`lastActivityAt`** | ✗ System only | Read-only in responses |
| **`slaState`** | ✗ Derived only | Read-only in responses |

Managers **cannot** fake SLA state — no endpoint accepts `slaState` or `lastActivityAt`.

---

## Role matrix (unchanged from Iter 31)

| Action | ADMIN | EDITOR | MANAGER | AGENT |
|---|---|---|---|---|
| View SLA queue | ✓ | ✓ | ✓ | ✗ |
| View workload | ✓ | ✓ | ✓ | ✗ |
| Actions that bump activity | ✓ | ✓ | ✓ | ✗ |

---

## Automation governance (Phase 7)

**Explicitly NOT enabled:**

- Auto Telegram reminders
- Auto email escalation
- Auto status changes (e.g. auto-close stale)
- Auto-spam marking

**Enabled:**

- `RequestSlaService.scanOpenRequests()` — read-only diagnostic stub for future BullMQ

Any future job MUST:

1. Recalculate derived SLA only, OR
2. Create optional notification drafts requiring human send — not auto-send

---

## Data exposure

Workload endpoint exposes aggregate counts only — no client PII beyond assignee names already visible in CRM.

---

## Threat notes

- Gaming SLA by adding empty notes: mitigated by non-empty note validation; note = legitimate activity
- Priority sort DoS: large unfiltered fetch — mitigate with status filters in ops practice; document scale limit ~2k open leads
