# Iter 39 — Pipeline Domain Model

## Source

`packages/shared/src/crm/pipeline-lifecycle.ts`

---

## Derived Concepts

| Concept | Definition |
|---|---|
| `stage enteredAt` | First event placing lead in stage |
| `stage duration` | now − enteredAt for open leads |
| `transition latency` | Median hours between stage A → B |
| `reopen cycle` | STATUS_CHANGED from SUCCESS/CLOSED/CANCELLED |
| `stalled stage` | Open lead exceeding stage thresholds |
| `success path` | SUCCESS with lifecycle duration + touches |
| `failed path` | SPAM/CLOSED without negotiation (friction rules) |

---

## Stage Order

NEW → IN_PROGRESS → CONTACTED → VIEWING_SCHEDULED → NEGOTIATION → SUCCESS/CLOSED/SPAM

---

## No Persistence

All metrics derived at read time from bounded event sample — no lifecycle warehouse table.
