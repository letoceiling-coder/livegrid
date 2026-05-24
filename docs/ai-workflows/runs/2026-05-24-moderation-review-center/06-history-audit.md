# 06 — History + Audit

## Source

`listing_edit_history` via `ListingsWizardService.getEditHistoryPublic`

## Review center UI

`ModerationTimeline.tsx` — human-readable labels:

- draft_create, draft_save, submit_*
- moderation_approve, moderation_reject, moderation_request_changes
- moderation_archive, moderation_restore

Each row: actor name, timestamp, optional note (reject reason).

## Agent list enrichment

`GET /admin/listings?admin_view&scope=owned` now includes:

- `lastModeratorAction` — latest moderation_* history row per listing
- `isPendingRevision` — from wizard snapshot
- `moderationNote` — scalar on listing (already present)

Shown in **My Listings** cards.
