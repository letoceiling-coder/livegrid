# 05 — Revision Safety

## Rule

**Published listings (PUBLIC/HIDDEN) are not mutated on autosave.**

## Mechanism

When `isLiveListingVisibility(visibility)`:

- Autosave writes **only** to `listing_wizard_snapshots`
- Sets `is_pending_revision = true`
- Public catalog continues serving live listing row

## Publish / approve

On submit or `PATCH .../moderation { approve }`:

1. `applyPayloadToListing()` merges snapshot → listing + kind tables
2. Clears `is_pending_revision`
3. Lifecycle transition (publish / approve)

## UX

Banner in wizard: «Есть неопубликованные правки…»
