# Iteration 9.1 — Filter Parity Audit

## Mode

SHADOW VALIDATION · measured mismatches · no production changes

**Date:** 2026-05-22 · local API `:3000`, region 1

---

## Query Composition

| Layer | Data source | Filters applied | Bbox applied |
|---|---|---|---|
| **Legacy (production)** | `GET /blocks` or `GET /listings` | Full catalog via `buildBlocksSearchParams` / `buildListingsSearchParams` | **No** — client receives fixed page-1 (200 rows) |
| **Viewport (prototype)** | `GET /_prototype/*/viewport` | **None in SQL** (params forwarded but ignored) | PostGIS `ST_Within` envelope |
| **Shadow comparison** | In-memory | Legacy = API-filtered set; viewport = prototype response | Legacy subset via `filterByBbox()` |

**Critical gap (Iter 8 carry-forward):** Prototype API accepts filter query params but does not apply them server-side. Shadow overlay reports this explicitly via `filterMismatchWarning`.

---

## Filter Keys Tracked

From `viewport-shadow-parity.ts` → `CATALOG_FILTER_KEYS`:

| Category | Keys |
|---|---|
| Region | `region_id` (required on both paths) |
| Search | `search` |
| Location | `district`, `subway` |
| Builder | `builder` |
| Rooms / status | `rooms`, `status` |
| Price / area | `price_min`, `price_max`, `area_min`, `area_max`, `floor_min`, `floor_max` |
| Other catalog | `deadline`, `finishing`, `market_type`, `kind`, `require_active_listings` |
| Geo | `geo_lat`, `geo_lng`, `geo_radius_m`, `geo_polygon`, `geo_preset` |

Filter signature included in shadow dedupe: `combinedShadowSignature(bbox, filterParams)`.

---

## Measured Legacy Baselines (region 1)

| Scenario | Endpoint | Rows loaded | meta.total |
|---|---|---|---|
| Default apartments map | `/blocks?…&per_page=200&require_active_listings=true` | **200** | **359** |
| Geo radius 5 km (center Moscow) | `/blocks?…&geo_lat=55.751&geo_lng=37.618&geo_radius_m=5000` | **33** | **33** |
| Wire size default | — | 900 142 B | — |
| Wire size geo 5 km | — | 171 134 B | — |

---

## Parity Expectations by Filter

| Filter | Expected parity (prototype-api) | Reason |
|---|---|---|
| **None** (default) | **Partial** — viewport can exceed legacy in-bbox | Viewport queries full DB in bbox; legacy capped at 200, 50.5% offscreen |
| **district** | **Low** | Prototype returns all blocks in bbox; legacy pre-filtered |
| **subway** | **Low** | Same |
| **builder** | **Low** | Same |
| **rooms / price / status** | **Low** | Catalog filters not in prototype SQL |
| **search** | **Low** | Not in prototype SQL |
| **geo radius** | **Very low / inverted** | Legacy 33 vs viewport ~100+ in same bbox |
| **geo polygon** | **Very low** | Same |
| **marketType secondary** | N/A (listings path) | Different entity type |
| **objectType** | Route switch | Blocks vs listings — separate shadow hooks |

**Do not interpret low parity with active filters as a bug in shadow math — it is expected until prototype applies filters.**

---

## Measured In-Bbox Legacy Subset (no geo, Moscow bbox)

Bbox: `sw=55.6,37.4` → `ne=55.9,37.9` (zoom-11 region view)

| Metric | Value |
|---|---|
| Legacy loaded | 200 |
| Legacy in bbox | **101** |
| Offscreen legacy | **99** |
| Bbox coverage | **50.5%** |

Sample district filter (`Новая Москва`): 11 in legacy 200, **2** also inside bbox.

---

## Measured Geo + Bbox (legacy only)

Geo: 5 km radius, center Moscow. Same bbox as above.

| Metric | No geo | Geo 5 km |
|---|---|---|
| Legacy loaded | 200 | **33** |
| Legacy in bbox | 101 | **33** |
| Bbox coverage | 50.5% | **100%** |

When geo is active, entire legacy dataset fits in typical city bbox — but viewport prototype still returns **unfiltered** bbox rows → **high `extraInViewport`** expected.

---

## Shadow Warning Strings (automatic)

| Condition | Warning |
|---|---|
| Catalog filters + prototype-api | `prototype ignores filters: district, …` |
| Geo active + extras | `geo filter active: viewport may include N out-of-geo IDs` |
| Fallback | `fallback: viewport capped at legacy 200-row dataset` |
| Missing without filters | `N legacy-in-bbox IDs absent from viewport (cap or coords)` |

---

## Parity Formula

```
legacyInBbox = legacy IDs where lat/lng ∈ bbox
viewportIds  = prototype response IDs
overlap      = legacyInBbox ∩ viewportIds
missing      = legacyInBbox − viewportIds
extra        = viewportIds − legacyInBbox
parityPct    = |overlap| / max(|legacyInBbox|, |viewportIds|) × 100
```

Implemented in `computeShadowParity()` — never hides mismatches.

---

## Simulated Parity Scenarios (deterministic)

| Scenario | Parity | Overlap | Missing | Extra |
|---|---|---|---|---|
| Viewport superset (80 legacy bbox, 120 viewport) | 66.7% | 80 | 0 | 40 |
| District drift (30 vs 80) | 37.5% | 30 | 0 | 50 |
| Fallback perfect match | 100% | 50 | 0 | 0 |
| 200-cap artifact (200 vs 250) | 80% | 200 | 0 | 50 |

---

## Filter Parity Verdict

| State | Verdict |
|---|---|
| Prototype SQL | **NO filter parity** — by design in Iter 8 |
| Shadow detection | **Working** — warnings fire when filters active |
| Production path | **Unaffected** — legacy filters still sole render source |
| Before rollout | Must implement filter composition in viewport SQL |
