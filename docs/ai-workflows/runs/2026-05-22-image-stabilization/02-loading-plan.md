# Iteration 4 — Loading & Fallback Plan

## Mode

Implementation plan · `@gstack-plan-eng-review` · `@gstack-careful`

**Date:** 2026-05-22

---

## Target States

| State | UI behavior |
|---|---|
| Valid URL | Render `<img>` with `object-cover`, fade-in on load |
| Loading | Pulse skeleton inside fixed aspect container |
| Broken URL | Branded fallback — never broken icon |
| Empty URL | Same as broken — immediate fallback, no network |
| Decorative context | `alt=""` |
| Named context (hero, popup title) | `alt` from `altContext` when `decorative={false}` |

---

## Architecture

```
redesign/lib/image-media.ts     ← helpers (SSOT constants + URL logic)
redesign/components/StableMediaFrame.tsx  ← canonical UI wrapper
redesign/components/MissingPhotoPlaceholder.tsx  ← reused for 'branded' mode
```

### Helpers

| Function | Role |
|---|---|
| `getSafeImageUrl(url, fallback?)` | Never empty `src` |
| `shouldUseFallbackImage(url)` | Skip network when invalid |
| `handleImageError(event, fallback?)` | One-shot swap for legacy `<img>` |
| `isValidImageUrl(url)` | Trim + non-placeholder check |
| `imageAltText(context, decorative)` | a11y helper |

### Fallback modes (`StableMediaFrame`)

| Mode | Use case |
|---|---|
| `branded` | Catalog/listing cards — Home icon + «Фото отсутствует» |
| `logo` | Listing thumbnails (sidebar, listings popup) |
| `placeholder` | Block/complex surfaces — `/placeholder.svg` |

---

## Aspect Ratio Matrix

| Surface | Ratio | Implementation |
|---|---|---|
| Cards (grid) | 16:9 | `aspect="16/9"` (`aspect-video`) |
| Sidebar thumbs | 4:3 | `aspect="4/3"` + `w-14` |
| Map popup | 16:9 | `aspect="16/9"` — replaces fixed 100–120px |
| Hero | preserved | `ComplexHero` unchanged height; reset `imgFailed` on slide change |
| Layout plans | 1:1 contain | Keep square box + `handleImageError` (plans are not photos) |

---

## Migration Strategy (minimal diff)

1. Add shared layer — no consumer changes yet
2. Replace highest-impact surfaces: map popups, sidebar, cards
3. Point data helpers (`blocks-from-api`, `home-blocks-map`) at `IMAGE_PLACEHOLDER`
4. Legacy `<img>` tags: `getSafeImageUrl` + `handleImageError` where `StableMediaFrame` is awkward (LayoutGrid plans, hints dropdown tiny thumb)
5. **Do not** migrate admin, Profile avatar, Telegram widgets

---

## Loading Semantics

- Default `loading="lazy"` on `StableMediaFrame`
- Map popups: `loading="eager"` (above fold when open)
- `decoding="async"` on all StableMediaFrame images
- `aria-busy={!loaded && !fallback}` on container during load

---

## Verification Matrix

| Route / surface | Check |
|---|---|
| `/map` blocks popup | 16:9 frame, broken URL → placeholder |
| `/map` listings popup | Always has media frame, logo fallback |
| `/map` sidebar | 4:3 thumbs, both tabs |
| `/catalog` | ListingCard 16:9, skeleton on slow 3G |
| `/complex/:slug` | Hero unchanged; cards on page use StableMediaFrame |
| Home | block cards via `blockMainImage()` |
| Broken URL test | DevTools → block image request → branded/placeholder shows |

---

## Non-Goals

- Image CDN assumptions or URL rewriting
- Upload pipeline
- Replacing all legacy pages (Compare, Presentation) in this iteration
