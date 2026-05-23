# Iteration 2 — Mobile Check

## Mode

`@gstack/design-review` · `@gstack-ui-product-audit`

---

## Marker Readability (mobile)

| Zoom | Mobile expectation | Implementation |
|---|---|---|
| < 12 | Dots visible, not cluttered | 12px blue dots ✓ |
| ≥ 12 | Price readable without overlap | White badge, 11px font, max-width 120px + ellipsis |
| > 14 | Name readable | Truncated at 22 chars + CSS ellipsis |

Touch target: `iconShape` rectangle expanded for labeled modes ([-48,48] × [-36,8]) — adequate for finger tap.

---

## Popup (mobile)

```tsx
<div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[320px]">
```

| Element | Mobile behavior |
|---|---|
| Width | Full width minus 16px margins |
| Image | 120px height (blocks), 100px (listings) |
| Close button | 28px tap target top-right |
| "Подробнее" button | Full width `h-9` — good touch target |
| Text | `line-clamp-2` on title |

---

## Visual Improvements vs Before

| Aspect | Before | After |
|---|---|---|
| Price on map | White text on blue pill — low contrast at small sizes | Dark text on white badge — higher contrast |
| Active marker | Red (off-brand) | Darker blue (consistent) |
| CTA | Text link | Full-width button |

---

## Cluster Behavior (mobile)

- Pinch zoom triggers `boundschange` → mode update — same as desktop
- Cluster tap zoom preserved (`clusterDisableClickZoom: false`)

---

## Overflow Risks

| Element | Risk | Mitigation |
|---|---|---|
| Long complex name badge | Medium | truncate + ellipsis |
| Popup title | Low | line-clamp-2 |
| Price badge | Low | nowrap + ellipsis |

---

## Manual Test Checklist (375px)

| # | Action | Expected |
|---|---|---|
| 1 | Load map, zoom 11 | Blue dots only |
| 2 | Pinch zoom to 13 | White price badges appear |
| 3 | Zoom to 15 | Names in badges |
| 4 | Tap marker | Bottom popup, full-width Button |
| 5 | Tap Подробнее | Navigate to complex/listing |

---

## Mobile Verdict

**PASS** — improved readability, preserved layout, adequate touch targets.
