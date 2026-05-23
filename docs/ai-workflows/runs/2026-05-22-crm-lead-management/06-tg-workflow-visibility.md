# Iter 31 — TG Workflow Visibility

## Mode

Phase 6 — frontend visibility for Telegram pipeline (real fields only)

---

## Principle

**NO fake TG states.** Display only what exists in DB or derivable from timeline.

---

## Available Backend Fields

| Field | Model | Meaning |
|---|---|---|
| `telegramSent` | `requests` | Outbound TG notification succeeded |
| `assignedTo` | `requests` | Claim / manual assignee UUID |
| `assignedUser` | relation | Claimant profile |
| `ASSIGNED` events | `request_events` | Claim timestamp + "Принято через Telegram" note |
| `STATUS_CHANGED` events | `request_events` | Auto IN_PROGRESS on TG claim |

---

## Missing Fields (documented gaps)

| Desired | Status | Workaround |
|---|---|---|
| `claimedAt` | ✗ No column | Use `ASSIGNED` event `createdAt` |
| `claimedBy` (TG user id) | ✗ No column | Use `assignedUser` + event actor |
| `tgDeliveryStatus` | ✗ No column | Binary: `telegramSent` true/false only |
| `notifiedAt` | ✗ No column | Not shown |
| Per-recipient delivery ack | ✗ Not tracked | N/A |

---

## Admin UI Mapping

**List:** TG column = `telegramSent ? '✓' : '—'`

**Detail TG section** (`AdminRequestDetail.tsx`):

```
notified     ← telegramSent
claimed      ← assignedTo != null
claimedBy    ← assignedUser display name
claimedAt    ← latest ASSIGNED event createdAt
via TG       ← ASSIGNED event note includes "Telegram"
```

---

## TG Claim Backend Flow

1. New request → optional async TG notify → `telegramSent = true` on success
2. Inline button in TG message → webhook callback
3. `claimRequestFromTelegram` assigns + events
4. Message edited to show claimant name

---

## Future (out of scope)

If ops need delivery granularity:

- Add `telegram_notified_at`, `telegram_claimed_at` columns
- Or extend `RequestEvent` with `TELEGRAM_NOTIFIED` / `TELEGRAM_CLAIMED` types

Do not add until product confirms need — current timeline covers claim audit.

---

## Open TG Action

**Gap:** No "Open TG chat" deep link from admin — managers use Telegram app directly. Acceptable for v1.
