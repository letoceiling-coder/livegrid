# 01 — Domain Audit (Iter 50)

**Date:** 2026-05-24  
**Scope:** Server drafts, edit wizard, moderation foundation

## Pre-Iter 50 state

| Capability | Status |
|------------|--------|
| Wizard create (5 steps) | ✓ Iter 49 |
| localStorage draft v2 | ✓ Client only |
| Lifecycle API | ✓ DRAFT/PUBLIC/HIDDEN/ARCHIVED |
| Ownership / assign | ✓ |
| Edit route shell | `/wizard/:id/edit` without hydration |
| Moderation | ✗ |
| Server autosave | ✗ |
| Revision safety | ✗ |
| Edit history | ✗ |

## Gaps addressed

1. **Persistence** — `listing_wizard_snapshots` JSON payload per listing
2. **Hydration** — GET `/admin/listings/wizard/:id/draft`
3. **Autosave** — PUT with `expectedVersion` + debounced client
4. **Moderation** — `REVIEW` / `REJECTED` visibility + site setting flag
5. **Revision safety** — `isPendingRevision` for live listings
6. **History** — `listing_edit_history` append-only log
7. **Concurrency** — optimistic version on `listings.draft_version`

## Unchanged (safe)

- Feed listings, CRM, geo pipeline, media storage model
- Existing `AdminManual*` edit pages for published objects
- No destructive migrations
