# Iteration 4 — Risk Analysis

## Change class

**Frontend-only · display/media UX · no API contract changes**

---

## Risk matrix

| Area | Risk | Mitigation |
|---|---|---|
| Map popups | LOW | Same DOM structure; only media child replaced |
| Sidebar thumbs | LOW | Slightly taller 4:3 vs old h-11 — ~1px delta |
| ListingCard height | LOW-MED | 16:9 vs fixed 160px — grid row height may shift slightly |
| ComplexCard failed image | LOW | **Improvement** — was empty box, now branded fallback |
| Data layer imports | LOW | Constant rename only; same `/placeholder.svg` URL |
| TypeScript | LOW | `tsc --noEmit` exit 0 |
| Hero gallery | LOW | Only added `useEffect` reset on slide change |
| Performance | LOW | Skeleton is CSS-only; no extra requests |

---

## Regression vectors

| Vector | Likelihood | Notes |
|---|---|---|
| Popup height change | Medium | Intentional — 16:9 taller than 100px on mobile; stabilizes across states |
| Double fallback flash | Low | `shouldUseFallbackImage` skips load for empty URL |
| Infinite onError loop | Low | Guard in `handleImageError` + StableMediaFrame state |
| Visual mismatch blocks vs listings fallback | Low | By design — logo for listings, placeholder for blocks |

---

## Out-of-scope risks (unchanged)

- Broken images on admin panel
- Compare / Presentation pages
- Avatar upload on Profile
- API returning malformed URLs at scale — still handled client-side

---

## Rollback

Revert files:

```
redesign/lib/image-media.ts          (delete)
redesign/components/StableMediaFrame.tsx (delete)
MapSearch.tsx, ListingsMapSearch.tsx, RedesignMap.tsx
ComplexCard.tsx, ListingCard.tsx
LayoutGrid.tsx, CatalogSearchHintsDropdown.tsx
home-blocks-map.ts, blocks-from-api.ts
ComplexHero.tsx
```

No database migration or env vars.

---

## Deploy recommendation

**LOW risk** — bundle with R3 + Iteration 2 + Iteration 3 for single web deploy.

Pre-deploy manual pass on `/map` listings tab (highest prior defect).
