# 01 — Session Depth Audit

**Iteration:** 79 · **Date:** 2026-05-25

## Bottleneck

Platform maturity is high (65k+ listings, CRM, SEO, discovery graph). **Primary gap:** session depth and return rate — users browse shallowly and rarely resume prior context.

## Audit findings

| Flow | Before | Risk | Iter 79 mitigation |
|------|--------|------|-------------------|
| Listing → listing | Related carousel only on apartment; listing detail had graph | Low cross-listing depth | `SessionDiscoverySection` on listing + apartment pages |
| Catalog → detail bounce | No “continue” surface on catalog | Exit after 1–2 cards | `ContinueBrowsingSection`, `SessionResumeBanner` |
| Map → listing → return | Map viewport lost on return | Friction re-filtering | `patchSessionSnapshot({ mapHref })` |
| Favorites activation | Empty state passive; no compare CTA | Low workflow adoption | Rich empty state, compare-from-favorites bar |
| Compare usage | Hidden in header only | Underused | `CompareSessionChip` + toasts on add |
| CTA fatigue | Sticky bars on every page | Mobile scroll abandonment | Compare chip above bottom nav (`bottom-[4.5rem]`), resume banner dismissible |
| Guest browse history | Auth-only server history | Lost depth for guests | `browse-history-local.ts` (max 20 rows) |

## Behavioral session optimization targets

- **Avg browse depth 7d:** ≥ 2.0 listings/user (tracked via `EngagementMetricsService`)
- **Favorites activation:** ≥ 15% of browsing users with ≥1 favorite
- **Compare:** client-side; chip visibility when count > 0

## Key files

- `session-continuity.ts`, `browse-history-local.ts`, `useBrowseHistory.ts`
- `ContinueBrowsingSection.tsx`, `SessionResumeBanner.tsx`
- `AccountHistory.tsx` — dual local + server history write

## Not in scope

AI recommendations, websocket live updates, new analytics pipeline.
