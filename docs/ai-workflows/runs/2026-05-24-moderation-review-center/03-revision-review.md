# 03 — Revision Review Center

**Route:** `/admin/moderation/listings/:listingId`

## Data bundle

`GET /admin/moderation/listings/:id/review` returns:

- `listing` — meta, visibility, draftVersion, invariants flags
- `live` — `WizardServerPayload` from published DB state
- `pending` — snapshot payload (or live if no snapshot)
- `diff` — `RevisionDiffResult` from `@lg/shared`
- `history` — last 50 edit history rows
- `invariants` — safety flags for UI banner

## Diff engine

`packages/shared/src/listings/listing-revision-diff.ts` — **real diff**, not fake:

- Core: kind, price, seller
- Geo: address, lat/lng, region, block
- Characteristics: kind-specific group fields
- Ownership: ownerUserId, ownerMode
- Visibility: publishAction

Only **changed** fields highlighted in `RevisionDiffPanel` (stacked 1-col on mobile, 3-col on desktop).

## Side-by-side summary

Top cards: live vs pending price/address + agent info.  
Public listing banner when `invariants.publicListingProtected`.
