# Iteration 4 — Media Rendering Audit

## Mode

READ-ONLY audit before stabilization · `@gstack/cso` · `@gstack-ui-product-audit`

**Date:** 2026-05-22 · **Workspace:** `~/livegrid/apps/web/src`

---

## Inventory Summary (pre-Iteration 4)

| Pattern | Locations | Issue |
|---|---|---|
| `/placeholder.svg` local constant | MapSearch, blocks-from-api, home-blocks-map, LayoutGrid, CatalogSearchHintsDropdown, listing-page-from-api | Duplicate SSOT |
| `LIVEGRID_LOGO_SRC` inline fallback | RedesignMap listings sidebar | Different fallback than blocks sidebar |
| `MissingPhotoPlaceholder` | ListingCard, ComplexHero, RedesignApartment, RedesignComplex, ApartmentTable | Good branded UI but ad-hoc wiring |
| Inline `onError` → swap src | MapSearch, RedesignMap blocks, LayoutGrid, CatalogSearchHintsDropdown | One-shot swap, no skeleton |
| Inline `onError` → `display:none` | **ListingsMapSearch popup** | **Collapsed image area — CLS + empty popup** |
| `onError` → `setImgFailed` hide img | ComplexCard `CardCoverImage`, ListingCard, ComplexHero | Container kept but image area empty inside aspect box |
| Fixed height popup img | MapSearch `h-[120px]`, ListingsMapSearch `h-[100px]` | Inconsistent ratio vs cards (16:9) |
| Sidebar thumb `w-14 h-11` | RedesignMap blocks | ~1.27:1, not 4:3 |
| `loading="lazy"` | RedesignMap sidebar (R3), ListingCard | Missing on hints dropdown, inconsistent elsewhere |
| No skeleton | All surfaces | Flash of empty/gray during slow network |

---

## Surface-by-Surface Findings

### Map popup — blocks (`MapSearch.tsx`)

- Raw `<img>` with `PLACEHOLDER` fallback via `onError`
- Fixed `h-[120px]` — not 16:9; height jumps if image fails late
- No loading skeleton; `alt=""` always

### Map popup — listings (`ListingsMapSearch.tsx`)

- **Critical:** photo block omitted when `photoUrl` empty; on error `display:none` — popup body jumps
- No reserved media frame

### Map sidebar (`RedesignMap.tsx`)

- Blocks: swap to `/placeholder.svg` on error
- Listings: logo fallback with manual `data-lg-fallback` guard — duplicate logic
- Mixed fallback strategies on same page

### Cards

| Component | Ratio | Fallback | Failure behavior |
|---|---|---|---|
| ComplexCard | `aspect-video` / `aspect-[4/3]` | none in DOM | `CardCoverImage` returns **null** → empty gray box inside aspect container |
| ListingCard | fixed `h-[160px]` | MissingPhotoPlaceholder | OK container, manual state |
| PropertyCard (legacy) | varies | none | broken icon risk — out of redesign scope this pass |

### Home blocks (`home-blocks-map.ts`, `blocks-from-api.ts`)

- `blockMainImage()` and image arrays use local `PLACEHOLDER` constant
- Data layer pre-fills placeholder URL — consumers still need runtime error handling

### Complex hero (`ComplexHero.tsx`)

- Fixed `h-72 sm:h-96` — **preserved by design**
- `imgFailed` state; gallery nav resets manually — missing reset on `imgIdx` change (fixed in Iter 4)

### Layout plans (`LayoutGrid.tsx`)

- `object-contain` in square box — correct for plans
- Inline `onError` only

---

## CLS / Trust Risks

1. Listings map popup hiding image on error — highest severity
2. ComplexCard failed load → invisible image inside reserved aspect box
3. Popup fixed heights (100px vs 120px) inconsistent across map modes
4. No skeleton → perceived slowness on 3G
5. Broken URL may flash before fallback on slow error path

---

## Duplicate Fallback Logic (count)

| Mechanism | Files |
|---|---|
| `const PLACEHOLDER = '/placeholder.svg'` | ≥6 |
| Manual logo swap | RedesignMap listings |
| `setImgFailed` / hide img | ≥5 components |
| `CardCoverImage` local helper | ComplexCard |

**Conclusion:** No single media SSOT before Iteration 4.

---

## Out of Scope (confirmed)

- `next/image`, SSR optimization, CDN migration
- Backend / API / Prisma / Redis
- Map architecture rewrite
- Gallery rewrite on detail pages
