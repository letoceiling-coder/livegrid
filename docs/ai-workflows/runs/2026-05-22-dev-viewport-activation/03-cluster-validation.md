# Iteration 25.3 — Cluster Validation

## Mode

Cluster layer audit under viewport primary source · 2026-05-22

---

## Architecture (unchanged)

`useMapClusterLayer` drives marker lifecycle:

- Signature-gated full rebuild on descriptor set change
- Isolated selection updates (active icon layout swap)
- Zoom bucket → `MarkerZoomMode` transitions (`dot` / `name` / `price`)

When viewport data loads, `effectiveMapListings` changes → new `layerSignature` → **one full cluster rebuild** from legacy (~125 in bbox) to viewport (~6,533).

---

## Expected behavior (Moscow wide, no filters)

| Metric | Legacy source | Viewport source |
|---|---:|---:|
| Markers in bbox | ~125 | **~6,533** |
| Initial rebuild | legacy count | viewport count |
| Zoom mode transitions | Same bucket logic | Same bucket logic |
| Cluster click | Zoom into cluster | Zoom into cluster |
| Cluster preset | `islands#blueCircleClusterIcons` | Unchanged |

---

## Stress validation checklist

| Check | Status | Notes |
|---|---|---|
| Cluster rebuild on source switch | **PASS** (design) | Signature change triggers rebuild |
| Zoom bucket behavior | **PASS** (design) | Same `zoomToMarkerMode` path |
| Marker density 6,533 | **HOLD** | Requires manual DEV browser test |
| Cluster click behavior | **HOLD** | Manual test at high density |
| Popup stability | **HOLD** | Popup uses merged lookup |
| Active marker sync | **HOLD** | Selection path unchanged |

---

## Observability

With `map_debug=1`, overlay shows:

- `markers: {count}` — post-rebuild viewport count
- `cluster rebuilds: N` — expect +1 on source switch, +1 per pan/zoom signature change
- `last rebuild: Xms` — expect higher ms at 6,533 vs 125
- `reason: signature`

---

## Known risk

6,533 placemarks in one clusterer is within Yandex Maps capability but may increase rebuild latency. Iter 6 performance rebaseline showed viewport fetch at 214ms; cluster rebuild time is separate and needs browser measurement (Phase 6).

---

## Manual test procedure

1. Open test URL with `viewport_listings=1&map_debug=1`
2. Wait for viewport fetch (overlay: `source: prototype-api`)
3. Confirm `markers` jumps from ≤200 to ~6533
4. Zoom in/out — verify mode transitions increment
5. Click cluster — verify zoom-in
6. Click individual marker — verify popup
