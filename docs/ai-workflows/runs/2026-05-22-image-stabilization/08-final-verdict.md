# Iteration 4 — Final Verdict

## IMAGE FALLBACK + MEDIA LOADING STABILIZATION

**Date:** 2026-05-22  
**Workspace:** `~/livegrid/apps/web/src`  
**Mode:** Safe frontend iteration

---

## Delivered

| ID | Requirement | Status |
|---|---|---|
| 4.1 | Shared image fallback layer | ✓ `image-media.ts` |
| 4.2 | Stable placeholders | ✓ `StableMediaFrame` + skeleton |
| 4.3 | Aspect ratio normalization | ✓ cards 16:9, sidebar 4:3, popup 16:9 |
| 4.4 | Map popup stabilization | ✓ no collapse on error/empty |
| 4.5 | Mobile CLS | ✓ reserved frames, object-cover |
| 4.6 | Accessibility | ✓ altContext, decorative default, aria-busy |

---

## Single Source of Truth

```
apps/web/src/redesign/lib/image-media.ts
apps/web/src/redesign/components/StableMediaFrame.tsx
```

Helpers: `getSafeImageUrl()`, `handleImageError()`, `shouldUseFallbackImage()`

---

## Defects Fixed

| Defect | Before | After |
|---|---|---|
| Listings popup empty on error | `display:none` | Logo fallback in 16:9 frame |
| Listings popup no photo | No media block | Logo fallback always |
| ComplexCard broken URL | Empty inside aspect box | Branded MissingPhotoPlaceholder |
| Duplicate PLACEHOLDER consts | ≥6 files | `IMAGE_PLACEHOLDER` import |
| Inconsistent sidebar fallback | placeholder vs logo ad-hoc | StableMediaFrame modes |
| No load skeleton | Flash / empty gray | Pulse skeleton |

---

## Quality Gates

| Gate | Result |
|---|---|
| TypeScript | ✓ `pnpm --filter web exec tsc --noEmit` exit 0 |
| No backend changes | ✓ |
| No API / Prisma / Redis | ✓ |
| No next/image | ✓ |
| No map architecture rewrite | ✓ |
| Hero height preserved | ✓ |

---

## Files Summary

**New:**
- `redesign/lib/image-media.ts`
- `redesign/components/StableMediaFrame.tsx`

**Updated:**
- `MapSearch.tsx`, `ListingsMapSearch.tsx`, `RedesignMap.tsx`
- `ComplexCard.tsx`, `ListingCard.tsx`
- `LayoutGrid.tsx`, `CatalogSearchHintsDropdown.tsx`
- `home-blocks-map.ts`, `blocks-from-api.ts`
- `ComplexHero.tsx` (imgIdx reset)

---

## Risk

**LOW** — UI-only, production-safe. Highest-impact fix is listings map popup stability.

---

## Recommendation

**APPROVE** for web deploy with R3 + Iterations 2–3 bundle.

Manual smoke:

1. `/map` listings — popup with missing/broken photo → stable frame + logo
2. `/map` blocks — popup 16:9 + placeholder fallback
3. `/catalog` — listing cards skeleton then image
4. `/complex/:slug` — card grid on complex page
5. Home — promoted blocks with images
6. DevTools Slow 3G — no layout jump on card load

---

## Document Index

| File | Contents |
|---|---|
| [01-media-audit.md](./01-media-audit.md) | Pre-change inventory |
| [02-loading-plan.md](./02-loading-plan.md) | Architecture & verification |
| [03-shared-image-layer.md](./03-shared-image-layer.md) | API reference |
| [04-card-alignment.md](./04-card-alignment.md) | Card surfaces |
| [05-map-popup-stabilization.md](./05-map-popup-stabilization.md) | Map popup + sidebar |
| [06-mobile-media-check.md](./06-mobile-media-check.md) | Mobile / CLS |
| [07-risk-analysis.md](./07-risk-analysis.md) | Risk |

---

## Not Started

Legacy pages (Compare, Presentation), PropertyCard, detail gallery rewrite, CDN/SSR — per instructions.
