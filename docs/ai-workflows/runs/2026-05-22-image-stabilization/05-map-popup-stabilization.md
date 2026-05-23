# Iteration 4 — Map Popup Stabilization

## Problem (verified in code)

### `ListingsMapSearch.tsx` — critical

```tsx
// BEFORE
{active.photoUrl ? (
  <img ... onError={(e) => { e.target.style.display = 'none'; }} />
) : null}
```

- No photo → **zero-height** media region; popup shorter than blocks mode
- Broken URL → image hidden → **layout collapse + flicker**

### `MapSearch.tsx`

```tsx
// BEFORE
<img src={... || PLACEHOLDER} className="w-full h-[120px] object-cover" />
```

- Fixed 120px height ≠ 16:9 at 320px popup width (~180px expected)
- No skeleton; placeholder swap only after error event

---

## Fix (no popup architecture rewrite)

Both popups now use **`StableMediaFrame`** at top of card shell:

| Map mode | Component | Fallback | Aspect |
|---|---|---|---|
| Blocks | MapSearch | `placeholder` | 16:9 |
| Listings | ListingsMapSearch | `logo` | 16:9 |

Shared popup chrome unchanged:
- Close button absolute top-right
- Title, price, address, CTA button below media frame
- `animate-in slide-in-from-bottom-2` preserved

---

## Sidebar (`RedesignMap.tsx`)

| Tab | Before | After |
|---|---|---|
| Blocks | `<img w-14 h-11>` + placeholder swap | `StableMediaFrame aspect=4/3 w-14 fallback=placeholder` |
| Listings | Logo swap with manual guard | `StableMediaFrame aspect=4/3 w-14 fallback=logo` |

Removed `LIVEGRID_LOGO_SRC` import from page — centralized in `image-media.ts`.

---

## Flicker reduction

1. **Reserved aspect box** always rendered when popup open
2. Skeleton blocks flash of white during src change (active marker switch)
3. `loading="eager"` on popup images — prioritize visible media
4. Fallback shown immediately when `src` invalid — no failed network round-trip

---

## NOT changed

- Yandex Maps clusterer / marker HTML
- Popup position (`absolute bottom-4 …`)
- Popup width (`sm:w-[320px]` / `sm:w-[300px]`)
- Link targets `/complex/:slug` / `/listing/:id`

---

## Smoke checklist

- [ ] Select block marker → popup shows 16:9 image or placeholder
- [ ] Select listing without photo → logo fallback, popup height stable
- [ ] Block broken image URL → placeholder, no broken icon
- [ ] Switch between sidebar items → no height jump in popup
- [ ] Close popup → no residual layout issues
