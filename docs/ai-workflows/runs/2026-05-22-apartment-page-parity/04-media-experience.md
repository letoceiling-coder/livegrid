# Iteration 28.4 — Media Experience

## Mode

APARTMENT PAGE PRODUCT PARITY · gallery · 2026-05-22

---

## Component: `ApartmentMediaGallery`

### Media types

| Tab | Source | Display |
|---|---|---|
| План | `apartment.planImage` | `object-contain` + padding |
| Фото | `galleryImages` + API `mediaFiles` | `object-cover`, carousel |
| Отделка | `apartment.finishingImage` | `object-cover` |

Tabs render only when multiple types exist.

---

## StableMediaFrame integration

- Fixed aspect container: `aspect-[4/3] sm:aspect-[16/10] max-h-[min(520px,70vh)]`
- `fallback="branded"` on empty/broken
- `loading="eager"` for hero; similar cards use `lazy`
- Invalid sources filtered: empty, `/placeholder.svg`

---

## Interactions

| Feature | Implementation |
|---|---|
| Tab switch | Resets index within tab |
| Prev/next arrows | Within active tab only |
| Dot indicators | Active tab slides |
| Fullscreen | Lightbox overlay, Escape to close |
| Keyboard | Arrow keys in lightbox |
| Reduced motion | Disables dot transition animation |

---

## Empty state

No valid images → single `StableMediaFrame` with `src={null}`, branded fallback, no broken `<img>`.

---

## Data merge

```text
mediaImages = unique(galleryImages ∪ mediaFiles[].url)
```

Deduplication via `Set`; placeholder URLs excluded.

---

## Not in scope

- 3D tour embed
- Video walkthrough
- Separate «рендер» vs «фото» without API metadata
- Pinch-zoom in lightbox (native browser zoom on img)

---

## CLS mitigation

- Aspect ratio box before image load
- StableMediaFrame skeleton inside frame
- No layout shift on tab switch (same container dimensions)
