# Iteration 2 — Performance Check

## Mode

`@gstack/review` · performance regression analysis

---

## Rebuild Frequency Comparison

### Before (raw zoom in deps)

```
Zoom 11 → 15: 4 full clusterer rebuilds (one per integer step)
200 markers × 4 = 800 placemark creations during zoom
```

### After (markerMode bucketing)

```
Zoom 11 → 15: 2 rebuilds (cross 12, cross 14)
200 markers × 2 = 400 placemark creations
```

**~50% reduction** in marker recreation during typical zoom interaction.

---

## Rebuild Triggers (unchanged count)

| Trigger | Rebuilds clusterer? |
|---|---|
| Filter change → new complexes | Yes (data change — required) |
| activeSlug change | Yes (visual update — required) |
| Zoom mode threshold cross | Yes (layout change — required) |
| Zoom within same mode | **No** (improved) |
| Pan map | No |

---

## No New Network Activity

- Zero additional API calls
- Zero React Query changes
- Zero new useEffects on data fetching

---

## DOM / Render

| Area | Impact |
|---|---|
| Marker HTML | Slightly larger template (badge div) at zoom ≥ 12 |
| React popup | +1 Button component when active — negligible |
| RedesignMap | Unchanged |

---

## Memory

- `map-marker-layout.ts` — pure functions, no state
- Same number of Yandex placemarks (N ≤ 200)

---

## Lazy Loading

Not affected — sidebar images from R3 unchanged.

---

## Performance Verdict

| Criterion | Result |
|---|---|
| No extra fetches | ✓ |
| Fewer zoom rebuilds | ✓ Improved |
| No new render loops | ✓ |
| Marker cap 200 unchanged | ✓ |

**Performance: PASS (neutral to improved)**
