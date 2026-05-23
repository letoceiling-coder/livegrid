# Iteration 4 — Mobile Media Check

## CLS Mitigations

| Technique | Where |
|---|---|
| Aspect-ratio containers | All `StableMediaFrame` usages |
| Skeleton with fixed box | During image load |
| No `display:none` on error | ListingsMapSearch fix |
| `overflow-hidden` on frames | Cards, sidebar thumbs |
| `shrink-0` on sidebar media | RedesignMap sidebar rows |

---

## Object-fit

| Surface | Fit | Rationale |
|---|---|---|
| Cards, popup, sidebar photos | `object-cover` | Fill frame, crop edges |
| Layout plans | `object-contain` | Preserve plan proportions |
| Logo fallback | `object-contain` at 70% | Brand mark, not cropped |

---

## Touch targets

- Map popup close button: `w-7 h-7` — unchanged, meets minimum with padding
- Sidebar row buttons: full row tap target preserved
- Card links: entire card clickable — image area does not intercept separately

---

## Mobile-specific surfaces

### Map popup (bottom sheet style)

- Full width on mobile (`left-4 right-4`)
- 16:9 media scales with viewport width — predictable height
- No horizontal overflow on popup card

### Sidebar thumbs `w-14` (56px)

- 4:3 → ~42px height — consistent with text block
- Rounded corners `rounded-md` preserved

### ListingCard on narrow screens

- 16:9 image scales with card width
- List variant stacks vertically below `sm` breakpoint — image full width then 16:9

---

## Slow network simulation

Expected behavior (Chrome DevTools → Slow 3G):

1. Gray pulse skeleton visible in frame
2. Image fades in (`opacity-0 → opacity-100`)
3. No layout shift when load completes
4. On timeout/error → fallback replaces skeleton in same box

---

## Remaining mobile gaps (deferred)

- Legacy pages (`Compare.tsx`, `Presentation.tsx`) still use local PLACEHOLDER
- PropertyCard on home — not migrated
- No `srcset` / responsive images (out of scope)
