# Iteration 11.3 — Visual Diff Styling

## File

`apps/web/src/redesign/lib/shadow-marker-layout.ts`

---

## Color legend

| Visual | Meaning | CSS |
|---|---|---|
| **Green dot** (semi-transparent) | Overlap — in viewport AND legacy-in-bbox | `#22c55e`, opacity 0.75 |
| **Orange dot** (dashed ring) | Viewport-only — extra vs legacy page | `#f97316`, opacity 0.85 |
| **Blue marker** (main layer) | Legacy production markers | unchanged Iter 2 styling |

---

## Design choices

| Choice | Rationale |
|---|---|
| Small dots (11–13 px) | Diff layer, not primary UX |
| `pointer-events: none` | Clicks pass to legacy cluster |
| `interactivityModel: silent` | Yandex does not capture events |
| Dashed ring on orange | Viewport-only visually distinct |
| Layout class cache | Avoid template factory churn |

---

## Expected visual patterns

### No filters (200 cap)

- Blue legacy markers across bbox
- Green dots co-located with many blues (overlap)
- Orange dots where viewport has blocks not on legacy page 1

### Geo 5 km (100% parity)

- Blue + green co-located
- **No orange** (viewport-only = 0)

### District filter

- Tight match: mostly green, few/no orange

---

## Z-order

Shadow cluster added **after** legacy cluster in hook effect order. Shadow uses `zIndex: 650–660` with pointer-events disabled — legacy remains clickable underneath overlap zones.

---

## Not styled on shadow layer

- Price labels
- Name labels
- Active selection highlight
- Cluster pie charts

Shadow always uses fixed dot mode regardless of map zoom.
