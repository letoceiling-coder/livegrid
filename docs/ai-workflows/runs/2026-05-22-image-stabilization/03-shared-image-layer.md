# Iteration 4 — Shared Image Layer

## Module: `redesign/lib/image-media.ts`

**Single source of truth** for image URL validation and error handling.

### Constants

```typescript
IMAGE_PLACEHOLDER = '/placeholder.svg'   // public/ asset
IMAGE_LOGO_SRC = LIVEGRID_LOGO_SRC       // '/logo.svg' from branding.ts

MEDIA_ASPECT = {
  card: 'aspect-video',      // 16:9
  sidebar: 'aspect-[4/3]',
  popup: 'aspect-video',
}
```

### API

```typescript
isValidImageUrl(url: unknown): url is string
// true when non-empty trimmed string and not IMAGE_PLACEHOLDER

shouldUseFallbackImage(url: unknown): boolean
// inverse of isValidImageUrl — use for initial render skip

getSafeImageUrl(url: unknown, fallback = IMAGE_PLACEHOLDER): string
// always returns a usable src

handleImageError(event, fallback = IMAGE_PLACEHOLDER): void
// sets data-lg-media-fallback guard, prevents infinite loop

imageAltText(context?, decorative = true): string
// '' for decorative; context when decorative=false
```

---

## Component: `StableMediaFrame.tsx`

### Props

| Prop | Default | Notes |
|---|---|---|
| `src` | — | nullable |
| `aspect` | `'16/9'` | `'4/3'` \| `'none'` |
| `fallback` | `'branded'` | `'logo'` \| `'placeholder'` |
| `loading` | `'lazy'` | popups use `'eager'` |
| `decorative` | `true` | set false + `altContext` for named images |
| `fixedHeightClass` | — | optional override (unused in Iter 4) |
| `className` | — | wrapper sizing (e.g. `w-14 rounded-md`) |
| `imgClassName` | — | hover scale etc. |

### Render flow

```
shouldUseFallbackImage(src)?
  yes → FallbackView (branded | logo | placeholder)
  no  → skeleton pulse until onLoad
        img absolute inset-0 object-cover opacity transition
        onError → switch to FallbackView
```

### Design decisions

- Container always reserves space via aspect ratio classes — **no collapse**
- Fallback is sibling inside `absolute inset-0` — no layout reflow
- Does not use `next/image` — plain `<img>` per constraints
- Reuses existing `MissingPhotoPlaceholder` — no new visual language

---

## Legacy bridge

Components that need `object-contain` (floor plans) keep raw `<img>` but use:

```typescript
import { getSafeImageUrl, handleImageError, IMAGE_PLACEHOLDER } from '@/redesign/lib/image-media';
```

---

## Data layer alignment

| File | Change |
|---|---|
| `blocks-from-api.ts` | `IMAGE_PLACEHOLDER` replaces local const |
| `home-blocks-map.ts` | `blockMainImage()` uses `getSafeImageUrl()` |

API contracts unchanged — only import path for placeholder constant.
