# 04 — Return User UX

**Iteration:** 79 · **Date:** 2026-05-25

## Session snapshot (`lg_session_v1`)

Stored in localStorage, 7-day TTL, no PII:

| Field | When patched |
|-------|--------------|
| `catalogHref` | Catalog filter URL on navigation |
| `mapHref` | Map query string on filter/viewport change |
| `lastListingHref` | Listing/apartment/complex view |
| `lastListingTitle` | Human label for resume banner |

## Resume UX

- `SessionResumeBanner` — up to 3 quick links; dismiss per session (`sessionStorage`)
- `resetSessionResumeDismiss()` available for future “new session” hooks

## Browse history continuity

- **Auth:** server `userBrowseHistory` + local mirror
- **Guest:** local only (`lg_browse_history_v1`, max 20)
- `useBrowseHistory` merges both for carousel and discovery

## Compare / favorites context

- Compare IDs persist in `lg_compare` (max 3)
- Favorites page surfaces compare bar and per-card “Сравнить” for listings

## Files

- `session-continuity.ts`
- `browse-history-local.ts`, `useBrowseHistory.ts`
- `SessionResumeBanner.tsx`
- `RedesignCatalog.tsx`, `RedesignMap.tsx`, `AccountHistory.tsx`
