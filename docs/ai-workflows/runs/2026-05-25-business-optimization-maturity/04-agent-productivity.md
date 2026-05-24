# 04 — Agent Productivity

**Iteration:** 77 · **Date:** 2026-05-25

## Scope

My listings ergonomics, moderation feedback, promotion flow, edit speed, draft recovery, lifecycle clarity.

## Iter 77 deliverables

### Draft recovery banner (`AdminMyListings`)

- Reads `loadWizardDraft()` on mount
- Surfaces in-progress wizard when `serverListingId` or dirty multi-step draft
- One-click **Продолжить** → wizard edit route

### Moderation feedback clarity

- Fixed missing imports/types for `moderationNote`, `isPendingRevision`, `lastModeratorAction`
- Inline rejection reason + last moderator action label

### Promotion lifecycle

- Active tier + expiry date (existing)
- **Expiry nudge** when ≤7 days remain on active promotion

### Lifecycle actions (existing, validated)

- Hide / republish / archive / publish draft
- VIP promotion request one-click on public listings

## Agent UX score drivers

| Driver | Score impact |
|--------|-------------|
| Draft recovery visible | +high |
| Moderation note on card | +medium |
| Promotion expiry nudge | +medium |
| Stale listing hint (30d) | existing |

## Files

- `AdminMyListings.tsx`
- `listingWizardDraft.ts` (read-only consumer)
