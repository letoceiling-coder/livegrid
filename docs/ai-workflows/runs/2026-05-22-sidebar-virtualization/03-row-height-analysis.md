# Iteration 13.3 — Row Height Analysis

## Method

Measured from Tailwind classes in sidebar row markup — not guessed from screenshots.

---

## Thumb geometry

```tsx
<StableMediaFrame
  className={cardVisual.sidebarThumb}  // w-12 shrink-0 rounded-md
  aspect="4/3"
/>
```

| Dimension | Value |
|---|---|
| Width | `w-12` = 48px |
| Aspect | 4:3 |
| Height | 48 × 3/4 = **36px** |

Container: `relative shrink-0 overflow-hidden` — height locked by aspect ratio.

---

## Button padding

```tsx
cardVisual.sidebarRow = 'flex gap-2 p-1.5 rounded-lg border ...'
```

| Property | px |
|---|---|
| `p-1.5` vertical | 6 + 6 = 12px |
| Border | 1px × 2 = 2px |
| Inner content target | 72 - 14 = **58px** usable |

---

## Text column

| Element | Class | Est. height |
|---|---|---|
| Price | `text-xs leading-none` | ~14px |
| Gap | `gap-0.5` | 2px |
| Title | `text-[11px] line-clamp-2 leading-snug` | ~28px (2 lines) |
| Meta (optional) | `text-[10px] truncate` | ~14px |

| Variant | Content height | vs thumb 36px |
|---|---|---|
| With district | ~58px | Content wins |
| Without district | ~44px | Thumb + padding ≈ 48px |

**Design target:** 72px row box fits both variants with `overflow-hidden` on text.

---

## Arrow link column

```tsx
<Link className="self-stretch flex items-center ... min-w-[28px]">
```

Stretches to row height — does not affect stride.

---

## Gap between rows

Legacy: `space-y-1` = 4px between siblings.

Virtual: `gap: MAP_SIDEBAR_ROW_GAP` (4) in virtualizer + `MAP_SIDEBAR_ROW_HEIGHT` (72).

**Stride = 76px**

---

## Layout jump prevention

| Risk | Mitigation |
|---|---|
| Image load expands row | Fixed `height: 72px` on row wrapper |
| Missing meta line | Fixed row height — empty meta space collapsed inside overflow |
| Pulse skeleton | Absolute inside thumb — no reflow |
| Active border change | Same box model |

---

## Validation checklist (DEV)

1. Load map with 200 blocks — scroll full list, no height jitter
2. Rows with/without district — same row height
3. Broken image fallback — thumb stays 48×36
4. Active selection border — no shift vs inactive

---

## Tuning note

If production shows clipped meta on unusual font scaling:

- Increase `MAP_SIDEBAR_ROW_HEIGHT` to 76 in **one constant**
- Do not switch to dynamic measure without RFC

---

## Conclusion

**72px fixed row + 4px gap** matches measured sidebar layout. Fixed sizing chosen over `measureElement` to prevent image-load layout shift.
