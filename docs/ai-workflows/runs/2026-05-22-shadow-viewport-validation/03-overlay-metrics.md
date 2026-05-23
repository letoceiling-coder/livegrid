# Iteration 9.3 — Shadow Overlay Metrics

## Mode

DEV-only · extends Iter 7 `MapDevOverlay` · no production UI

---

## Enable

```
http://localhost:5173/map?region_id=1&map_debug=1&viewport_debug=1
```

Optional stress modes:

```
?viewport_stress=404      → force API failure → fallback
?viewport_stress=timeout  → force timeout → fallback
```

---

## Overlay Sections

### Core (Iter 7 — unchanged)

| Field | Source |
|---|---|
| layer | `useMapClusterLayer` kind |
| mode | dot / price / name |
| markers | Rendered cluster count |
| cluster rebuilds | Full clusterer recreations |
| selection updates | iconLayout swaps |
| mode transitions | Zoom bucket changes |
| last rebuild / selection | Timing ms |

### Viewport (Iter 8)

| Field | Description |
|---|---|
| legacy markers | Legacy fetch count |
| viewport markers | Last shadow fetch count |
| viewport fetch | Last fetch ms |
| payload | Prototype JSON estimate (KB) |
| source | `prototype-api` \| `client-filter-fallback` |
| requests | Cumulative viewport fetches |
| **fallbacks** | Cumulative fallback activations (Iter 9) |
| bbox | Last bbox signature |

### Shadow Parity (Iter 9 — new)

| Field | Description |
|---|---|
| **parity** | % overlap (color-coded) |
| **overlap** | Shared ID count |
| **missing** | Legacy-in-bbox not in viewport |
| **extra** | Viewport not in legacy-in-bbox |
| **bbox coverage** | % legacy loaded that falls in bbox |
| **offscreen legacy** | Legacy outside bbox |
| **visible ratio** | legacyInBbox / legacyTotal |
| **density legacy/viewport** | Markers per deg² in bbox |
| **filters** | active / none |
| **geo** | active indicator |
| **⚠ warning** | Filter/geo/fallback mismatch text |
| **missing / extra samples** | First 5 IDs (truncated) |

---

## Store API

**File:** `map-render-observability.ts`

```typescript
recordViewportComparison({
  legacyMarkerCount,
  viewportMarkerCount,
  fetchMs,
  payloadBytes,
  source,
  bboxSignature,
  isFallback,
  shadow: ShadowParityResult,
});
```

New snapshot fields: `shadowParityPct`, `shadowOverlap`, `shadowMissing`, `shadowExtra`, `shadowBboxCoveragePct`, `shadowOffscreenLegacy`, `shadowVisibleRatio`, `shadowLegacyDensity`, `shadowViewportDensity`, `shadowFilterActive`, `shadowFilterWarning`, `shadowGeoActive`, `shadowMissingSample`, `shadowExtraSample`, `fallbackCount`.

---

## Production Safety

| Guard | Effect |
|---|---|
| `import.meta.env.DEV` | Overlay tree-shaken in prod |
| `map_debug=1` OR `viewport_debug=1` | Required for display |
| `pointer-events-none` | No interaction capture |
| Shadow hooks gated | `isViewportExperimentalEnabled()` |

---

## Interpreting Parity Colors

| Color | Range | Meaning |
|---|---|---|
| Green | ≥ 95% | Fallback mode OR no filters + good bbox overlap |
| Amber | 70–94% | Partial overlap — investigate extras/missing |
| Red | < 70% | Filter/geo drift OR cap artifact — **expected with filters** |

**Red parity with active filters is not a regression — it confirms prototype gap.**

---

## Wiring (Iter 9)

`RedesignMap.tsx` passes `filterSearchParams` to map components:

- `blocksFilterSearchParams` — mirrors `blocksQuery` params
- `listingsFilterSearchParams` — mirrors `listingsQuery` params

Ensures shadow refetches when filters change, not only on pan/zoom.

---

## Example Session (expected readings)

| Action | overlay changes |
|---|---|
| Load map default | parity amber/red, extra > 0, filters: none |
| Apply geo 5 km | filters: active, geo: active, ⚠ geo warning, parity red |
| `viewport_stress=404` | source: client-filter-fallback, fallbacks++, parity ~100% |
| Pan map | requests++, bbox changes, coverage updates |
| Sidebar click | selection updates++, parity unchanged |

---

## Verdict

Shadow overlay exposes **honest, ID-level parity** without altering rendered map. Suitable for DEV QA before any viewport rollout discussion.
