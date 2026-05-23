# Iteration 9.2 — Shadow Dataset Comparison

## Mode

Parallel invisible comparison · metrics-only · no viewport rendering

**Implementation:** `viewport-shadow-parity.ts` + experimental hooks

---

## Architecture

```
Legacy React Query → blocks/listings (200 max)
        ↓
MapSearch / ListingsMapSearch → useMapClusterLayer (RENDER)
        ↓
useViewport*Experimental (SHADOW, flag-gated)
        ↓
  ├─ try GET /_prototype/*/viewport
  └─ catch → client-filter fallback
        ↓
computeShadowParity() → recordViewportComparison()
        ↓
MapDevOverlay (DEV only)
```

**Viewport data never reaches cluster layer.**

---

## ID Spaces

| Mode | Legacy ID | Viewport ID |
|---|---|---|
| Blocks (apartments) | `slug` (string) | `slug` |
| Listings | `id` (number → string) | `id` |

---

## Comparison Dimensions

| Metric | Description |
|---|---|
| `legacyTotal` | Count from legacy fetch (≤ 200) |
| `legacyInBbox` | Legacy points inside current map bbox |
| `viewportCount` | Prototype or fallback response count |
| `overlapCount` | IDs in both legacy-in-bbox and viewport |
| `missingInViewport` | In legacy bbox but not in viewport — **stale / cap / coords** |
| `extraInViewport` | In viewport but not in legacy-in-bbox — **filter drift or superset** |
| `parityPct` | Overlap / max(legacyInBbox, viewportCount) |
| `offscreenLegacy` | legacyTotal − legacyInBbox |
| `bboxCoveragePct` | legacyInBbox / legacyTotal |

---

## Measured Example (region 1, no filters)

Legacy source: live `/blocks` 200 rows. Bbox: Moscow zoom-11 envelope.

| Metric | Value |
|---|---|
| legacyTotal | 200 |
| legacyInBbox | **101** |
| offscreenLegacy | **99** |
| bboxCoveragePct | **50.5%** |

**Interpretation:** Half of loaded legacy markers are outside current viewport. Viewport prototype (when live) can return blocks in bbox **beyond** the 200-name-sorted page — `extraInViewport` expected.

---

## Missing ID Causes

| Cause | Detection |
|---|---|
| **200-row cap** | legacyTotal = 200, catalog total > 200, missing slugs not in page 1 |
| **Offscreen but in catalog** | In bbox, not in legacy 200 — appears as `extraInViewport` from viewport, not `missing` |
| **No coordinates** | Excluded from legacy map; prototype SQL requires lat/lng NOT NULL |
| **Prototype limit (300)** | Rare at region 1 scale; would truncate viewportCount |

---

## Extra ID Causes

| Cause | Detection |
|---|---|
| **Filter drift** | `filterActive` + `extra > 0` + warning |
| **Geo drift** | `geoFilterActive` + warning |
| **Bbox superset** | No filters; viewportCount > legacyInBbox |
| **Fallback ceiling** | source = client-filter-fallback; extra = 0 always |

---

## Stale Legacy IDs

Legacy dataset is **filter snapshot at last React Query fetch**, not live bbox query.

| Event | Legacy freshness | Viewport freshness |
|---|---|---|
| Pan map | Unchanged (same 200 rows) | Refetch on debounced bbox |
| Filter change | Refetch | Refetch (filter sig in dedupe key) |
| Region switch | Refetch | Refetch |

**Shadow compares:** frozen legacy page vs fresh viewport bbox — intentional for parity audit.

When user pans after load:

- `legacyInBbox` changes (client filter)
- Viewport refetches
- Parity updates without legacy API call — **correct shadow behavior**

---

## Fallback Dataset

On API failure (`404`, timeout, stress mode):

```
viewportIds = client-filter(legacyPoints, bbox) capped at legacy 200
parity → 100% when all in-bbox legacy present in fallback
warning → "fallback: viewport capped at legacy 200-row dataset"
```

Measured simulation: fallback perfect match → **100% parity**, 0 missing, 0 extra.

---

## Sample Output (overlay)

```
shadow parity
parity: 66.7%
overlap: 80
missing: 0 · extra: 40
bbox coverage: 50.5%
offscreen legacy: 99
```

Color coding: ≥95% green, ≥70% amber, <70% red (does not imply production readiness).

---

## Verdict

Shadow dataset comparison provides **real visibility** into ID-level drift. Low parity is **expected and documented** until prototype applies catalog filters and legacy pagination decouples from map bbox.
