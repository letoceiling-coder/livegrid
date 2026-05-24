# 05 — Approve / Reject Flow

**API:** `PATCH /admin/moderation/listings/:id`

## Actions

| Action | Behavior |
|--------|----------|
| `approve` | Delegates to `ListingsWizardService.applyModeration('approve')` — publishes pending to live |
| `reject` | Live+pending: reset snapshot, keep visibility, set note. REVIEW draft: full reject |
| `request_changes` | Same as reject path with `moderation_request_changes` history |
| `archive` | Lifecycle archive + history row |
| `restore` | REJECTED/ARCHIVED → DRAFT, clear moderationNote |

## UX safeguards

- **Mandatory note** for reject / request_changes (API 400 without)
- **confirm()** dialogs on approve, reject, archive, restore
- **expectedVersion** — optimistic concurrency; 409 on conflict
- Sticky action bar (`ModerationActionBar`) — 44px touch targets, mobile bottom bar

## Post-approve

Navigates back to queue on successful approve.
