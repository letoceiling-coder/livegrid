# Iteration 14.4 — Clipping Analysis

## Fixed-height design (Iter 13)

| Element | Constraint |
|---|---|
| Row wrapper | `height: 72px` |
| Thumb | `w-12` + `aspect 4/3` → 48×36px |
| Text column | `overflow-hidden` |
| Title | `line-clamp-2` |

---

## Clipping detection (DEV only)

`useSidebarVirtualizerDebug` → `detectClippingWarnings()`:

| Check | Condition | Warning |
|---|---|---|
| Row height | `getBoundingClientRect().height > 74px` | `row#N:height=Xpx` |
| Title | `scrollHeight > clientHeight + 1` | `row#N:title-clipped` |
| Button | `scrollHeight > clientHeight + 1` | `row#N:button-overflow` |

Probes only **currently rendered** virtual rows (`data-sidebar-row`).

Markers added:

```html
<div data-sidebar-row data-sidebar-index="N">
  <p data-sidebar-title>...</p>
```

---

## Expected outcomes

| Scenario | Expected clip warning |
|---|---|
| Normal block name (2 lines) | none |
| Long district + 2-line title | `title-clipped` possible — **intentional** line-clamp |
| Image fallback | none — absolute fill in thumb |
| `font-size` accessibility scaling | **may trigger** — monitor in DEV |

---

## Image fallback layout

`StableMediaFrame`:

- Container: aspect ratio locked
- Image: `absolute inset-0 object-cover`
- Fallback: `absolute inset-0`

**Should not** change row height when fallback loads.

---

## Overlay display

```
clip: none                    → green
clip: row#3:title-clipped     → red, truncated in overlay
```

---

## DEV stress tests

| Test | How |
|---|---|
| Long names | Search blocks with long Cyrillic names |
| Font scaling | Chrome → Rendering → Emulate 'Prefers larger text' |
| Missing images | Blocks without photos |

---

## Production impact

Clipping probe runs only when:

```typescript
import.meta.env.DEV && isMapDebugEnabled()
```

Zero production overhead.

---

## Tuning path

If persistent false positives on `title-clipped`:

- Expected with `line-clamp-2` — distinguish **intentional** vs **overflow**
- Future: only warn when `scrollHeight > clientHeight + 4px`

If row height warnings:

- Increase `MAP_SIDEBAR_ROW_HEIGHT` constant (single knob)

---

## Conclusion

DEV clipping detection surfaces **layout drift** and **a11y font scaling** risks without affecting production. Intentional title clamp may appear as warnings — interpret as signal, not automatic bug.
