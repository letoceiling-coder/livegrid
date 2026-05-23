# Iteration 17.4 — Clustering Policy RFC

## Mode

ARCHITECTURE RFC · density-aware strategy · 2026-05-22

---

## Purpose

Define **tier-aware clustering policy** so map rendering respects geo honesty — preventing 705 identical pins at one block centroid from appearing as 705 distinct apartment locations.

---

## Problem statement

Iter 16 measurements:

| Scenario | Density |
|---|---:|
| Max listings per block coord | 705 (ЗилАрт) |
| MSK bbox via block/building join | 6,555 listings |
| Blocks in same MSK bbox | ~300 |
| Listings with EXACT coords (MSK) | 0 |

Without tier-aware clustering, viewport at city zoom would render thousands of stacked pins — **fake precision at scale**.

---

## Current clustering (legacy)

Yandex Maps Clusterer via `useMapClusterLayer`:

| Layer | Preset | Policy |
|---|---|---|
| Blocks | `islands#invertedBlueClusterIcons` | Zoom-based grid cluster, tier-agnostic |
| Listings | `islands#blueCircleClusterIcons` + pie chart | Same — treats all coords as equal |

Marker zoom modes (`map-marker-layout.ts`):

| Zoom | Mode |
|---|---|
| ≤ 12 | dot |
| 13–14 | price label |
| ≥ 15 | name label |

**No connection to geo tier.** A `fallbackCoords` secondary listing gets the same pin treatment as a manual EXACT coord.

---

## Tier → cluster policy matrix

| GeoQuality | Cluster below zoom | Individual pin allowed at | Grid size factor | Coalesce by geoEntityId |
|---|---:|---:|---:|---|
| EXACT | optional (density only) | ≥ 13 | 1.0 | No |
| BUILDING_CENTROID | **required** | ≥ 15 | 1.5 | Yes (same building) |
| BLOCK_CENTROID | **required** | ≥ 16 | 2.0 | Yes (same block) |
| APPROXIMATE_UI_ONLY | **never in viewport** | N/A | N/A | N/A |
| MISSING / INVALID | excluded | N/A | N/A | N/A |

### Rationale

- **EXACT:** Optional clustering above 50 markers/screen — standard map UX
- **BUILDING_CENTROID:** Individual pin only at street zoom; must cluster at city/district zoom
- **BLOCK_CENTROID:** Never show individual apartment pins below z16; at z16+ show with approximation badge
- **APPROXIMATE_UI_ONLY:** Legacy production only; excluded from viewport API entirely

---

## Density-aware overrides

Base policy modified by `meta.density` (objects per deg²):

| Density | Override |
|---|---|
| < 20 | Relax clusterRequired for BUILDING at z≥14 |
| 20–100 | Default policy |
| 100–500 | Force cluster for BUILDING below z16 |
| > 500 | Force cluster for all non-EXACT below z17; consider server-side pre-aggregation |

MSK typical bbox density: **~42.5** (Iter 15 blocks) to **~200+** (listings via join) — middle band.

---

## Server-side pre-aggregation (future option)

When `visible > 1000` AND `approximateShare > 0.9` AND `zoom < 14`:

Return **cluster cells** instead of individual markers:

```typescript
type ViewportClusterCell = {
  lat: number;
  lng: number;
  count: number;
  geoQuality: 'BLOCK_CENTROID' | 'BUILDING_CENTROID';
  geoEntityId: number;
  geoEntityKind: 'block' | 'building';
  priceMin: number | null;
  priceMax: number | null;
  sampleListingIds: number[];  // max 5
};
```

Response `meta.clusterMode: 'cells' | 'markers'`.

**Benefits:**
- Payload reduction (6,555 → ~300 cells)
- Honest representation (one bubble per JK)
- Eliminates client-side stack ambiguity

---

## Coalesce rules

When multiple listings share identical coords AND tier:

```
Group key = `${geoQuality}:${geoEntityKind}:${geoEntityId}`
```

| Group size | Render |
|---|---|
| 1 | Single marker |
| 2–10 | Cluster badge with count |
| 11–100 | Cluster + "705 квартир" on expand |
| 100+ | Server-side cell only at zoom < 16 |

**Never expand cluster into individual pins** for BLOCK_CENTROID unless zoom ≥ 16 AND user explicitly drills into JK.

---

## Interaction with marker zoom modes

Proposed tier gates on existing modes:

| Mode | EXACT | BUILDING_CENTROID | BLOCK_CENTROID |
|---|---|---|---|
| dot (z≤12) | ✓ | cluster only | cluster only |
| price (z13–14) | ✓ | cluster only | cluster only |
| name (z≥15) | ✓ | ✓ + badge | cluster only |
| name (z≥16) | ✓ | ✓ + badge | ✓ + badge |

---

## Viewport meta clusterPolicy

From `03-viewport-contract-rfc.md`:

```typescript
clusterPolicy: 'none' | 'soft' | 'required'
```

| Condition | Policy |
|---|---|
| allExact && visible < 100 | `none` |
| anyApproximate && zoom ≥ 15 | `soft` |
| anyApproximate && zoom < 15 | `required` |
| blockCentroid share > 0.5 | `required` |

Client must respect `clusterPolicy` even if Yandex clusterer would otherwise split.

---

## Shadow render implications (DEV)

Iter 11 shadow diff compares marker **counts** — with tier-aware clustering, shadow diff must compare **cluster cell counts** or **geoEntityId cardinality**, not raw listing count.

Proposed shadow metric: `uniqueGeoEntities` vs `rawMarkerCount`.

---

## Legacy migration

| Current | Target |
|---|---|
| `fallbackCoords` listings in cluster | Remove from map OR show as MISSING |
| Block map (JK mode) | Already correct — one pin per block |
| Listings map secondary | Replace spiral with BLOCK_CENTROID + badge OR no pin |
| Viewport prototype | Implement tier policy before enablement |

---

## Acceptance criteria (future implementation)

1. At zoom 12, MSK listings viewport returns ≤ 400 visible **render units** (markers + cells)
2. No BLOCK_CENTROID listing rendered as individual pin below z16
3. ZilАрт block never shows 705 overlapping price labels
4. EXACT listings (region 7 manual) render individually at z≥13
5. `clusterRequired` flag on marker matches actual client behavior (contract-check)
