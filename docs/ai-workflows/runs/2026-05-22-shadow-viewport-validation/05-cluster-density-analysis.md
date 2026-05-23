# Iteration 9.5 — Cluster Density Analysis

## Mode

Metrics-only · **no second cluster layer** · no viewport rendering

---

## Purpose

Compare how densely legacy vs viewport datasets pack into the current bbox — proxy for clusterer load **if** viewport were ever wired to render.

---

## Metrics (Shadow)

Computed in `computeShadowParity()`:

| Metric | Formula |
|---|---|
| `legacyDensityPerDeg2` | `legacyInBbox / bboxAreaDeg2` |
| `viewportDensityPerDeg2` | `viewportCount / bboxAreaDeg2` |
| `visibleRatio` | `legacyInBbox / legacyTotal` |
| `offscreenRatio` | `offscreenLegacy / legacyTotal` |

Where `bboxAreaDeg2 = (neLat − swLat) × (neLng − swLng)`.

---

## Measured Legacy Density (region 1)

Bbox: `55.6–55.9 lat`, `37.4–37.9 lng` → area ≈ **0.09 deg²**

| Metric | Value |
|---|---|
| legacyTotal | 200 |
| legacyInBbox | 101 |
| offscreenLegacy | 99 |
| **visibleRatio** | **50.5%** |
| **offscreenRatio** | **49.5%** |
| **legacyDensityPerDeg2** | **~1122** (101 / 0.09) |

**Interpretation:** At zoom-11, half of loaded legacy markers are offscreen — clusterer still holds all 200 placemarks.

---

## Viewport Density (expected when API live)

Without 200 cap, Moscow bbox block count from DB likely **> 101** (includes blocks not on page 1).

| Scenario | viewportCount (est.) | Density vs legacy |
|---|---|---|
| No filters | 120–180 in bbox | **Higher** — more complete |
| Geo 5 km | ~100+ in bbox vs legacy 33 | **Much higher** — filter drift |
| Fallback | = legacyInBbox | **Equal** |

Exact viewport density requires live prototype API (404 on running server pre-restart, 2026-05-22).

---

## Cluster Load Comparison (Theoretical)

| Path | Markers in clusterer | Driven by |
|---|---|---|
| **Production (now)** | min(200, catalog) | Legacy fetch |
| **Viewport (if wired)** | bbox-limited (≤300 prototype) | Viewport fetch |
| **Shadow (Iter 9)** | **200 legacy only** | Unchanged |

**Iter 9 does not change clusterer input** — density metrics are informational.

---

## Zoom Movement Impact

| Zoom | Legacy cluster | Shadow density |
|---|---|---|
| 10–11 (region) | 200 markers, ~50% visible | Low visible ratio |
| 12–14 (district) | 200 markers, higher visible ratio | legacyInBbox increases |
| 15+ (street) | Few legacy in bbox | Density drops; many offscreen |

Zoom changes `legacyInBbox` via client filter without API call — shadow density updates on debounced bbox.

---

## Offscreen Marker Cost (Iter 7 context)

Post-Iter-7: selection uses iconLayout swap, not full rebuild. Cluster still holds offscreen markers in memory.

| Ratio | Implication |
|---|---|
| 49.5% offscreen at zoom-11 | Nearly half of cluster objects not visible — viewport could reduce count |
| 100% visible with geo 33 | Geo filter eliminates offscreen waste for loaded set |

---

## Density Overlay Display

```
density legacy/viewport: 1122/XXXX
visible ratio: 50.5%
offscreen legacy: 99
```

Updated on each shadow fetch.

---

## Verdict

Shadow density analysis confirms **legacy over-fetch** (200 markers regardless of viewport). Viewport architecture could reduce cluster memory **when wired** — but Iter 9 proves comparison math only, not render benefit.

**No second cluster layer rendered** — requirement satisfied.
