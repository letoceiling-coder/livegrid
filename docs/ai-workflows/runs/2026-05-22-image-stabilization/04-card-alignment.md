# Iteration 4 — Card Alignment

## Changes

### `ListingCard.tsx`

**Before:**
- Fixed `h-[160px]` container (~variable effective ratio by width)
- Manual `imgFailed` state + `MissingPhotoPlaceholder` swap
- Inline `onError`

**After:**
- `StableMediaFrame` with `aspect="16/9"`
- Branded fallback built-in
- Skeleton during load
- List variant: `sm:w-56` width constraint preserved

### `ComplexCard.tsx`

**Before:**
- Local `CardCoverImage` helper — returns `null` on failure → empty area inside aspect box
- Grid: `aspect-video` / `aspect-[4/3]` wrapper
- List: `w-[220px] min-h-[160px]`

**After:**
- Removed `CardCoverImage`
- Grid: `StableMediaFrame` with `aspect="none"` + `absolute inset-0` inside existing aspect wrapper
- List: `StableMediaFrame` `aspect="4/3"` in sidebar-style thumb proportions
- `decorative={false}` + `altContext={complex.name}` for accessibility
- Still hides cover section when `coverImages.length === 0` (no URLs from API)

### Unchanged this iteration

- `PropertyCard.tsx` — legacy home component
- `RedesignApartment.tsx` / `RedesignListingDetail.tsx` — detail galleries (hero preserved)
- `ApartmentTable.tsx` — small plan thumbs (uses MissingPhotoPlaceholder already)

---

## Aspect Ratio Compliance

| Surface | Target | Status |
|---|---|---|
| ListingCard grid/list | 16:9 | ✓ `aspect-video` |
| ComplexCard grid | 16:9 default | ✓ existing wrapper + StableMediaFrame |
| ComplexCard grid 4:3 variant | 4:3 | ✓ `coverAspect` prop preserved |
| ComplexCard list | 4:3 | ✓ |

---

## Visual Regression Notes

- ListingCard height now derives from width × 9/16 instead of fixed 160px — **slightly taller on wide grid columns**, more consistent on narrow
- Hover scale transition moved to `imgClassName` on StableMediaFrame
- Status badge overlay unchanged (absolute on parent)
