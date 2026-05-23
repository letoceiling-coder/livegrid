# Iteration 17.6 — Search + Filter Geo Rules

## Mode

ARCHITECTURE RFC · truth-safe spatial query semantics · 2026-05-22

---

## Purpose

Define which geo tiers participate in **search, bbox, radius, and sort** — ensuring spatial operations never silently treat approximate coords as exact.

---

## Geo filter types in system

| Filter | Parameter(s) | Implementation | Entity queried |
|---|---|---|---|
| Geo preset | `geo_preset=moscow_center` | Polygon from presets service | blocks |
| Geo polygon | `geo_polygon={...}` | ST_Within polygon | blocks |
| Geo radius | `geo_lat`, `geo_lng`, `geo_radius_m` | ST_DWithin geography | blocks |
| Has geo | `has_geo=true` | `listings.lat IS NOT NULL` | listings (broken at scale) |
| Map bbox (legacy) | client-side | Filter loaded page-1 | client |
| Map bbox (viewport) | `sw_lat/lng`, `ne_lat/lng` | ST_Within envelope | blocks OR listings |
| Distance to city | `distance_min/max` | Listing attribute | non-spatial column |

---

## Tier participation matrix

| Operation | EXACT | BUILDING_CENTROID | BLOCK_CENTROID | APPROXIMATE_UI_ONLY | MISSING |
|---|---|---|---|---|---|
| Catalog geo preset/radius | ✓ via blockId | ✓ via blockId | ✓ via blockId | ✗ | ✗ |
| Viewport bbox | ✓ point in envelope | ✓ building point | ✓ block point | ✗ **never** | ✗ |
| Radius sort ("nearest") | ✓ | ✗ | ✗ | ✗ | ✗ |
| Distance display from user | ✓ | ✗ | ✗ | ✗ | ✗ |
| Geo analytics aggregation | ✓ | ✓ (building grid) | ✓ (block grid) | ✗ | ✗ |
| Full-text search | ✓ (non-spatial) | ✓ | ✓ | ✓ | ✓ |

---

## Catalog geo filters (current — keep)

### Semantics (normative)

> **Catalog geo filter answers:** "Show listings whose **residential complex (block)** is within the selected area."

This is **truth-safe for FEED apartments** because:
- Geo query runs on blocks (100% geocoded)
- Listings matched via `blockId IN (geoBlockIds)`
- User expectation for new-build catalog = "JK in district/zone"

### Rules

1. Geo preset/radius/polygon **never** queries `listings.lat/lng`
2. Secondary listings without `block_id` are **excluded** from geo-filtered results (correct — no JK)
3. Geo filter + `kind=APARTMENT` + `marketType=secondary` may return empty — not a bug

**No change required** — document as canonical behavior in GEO CONTRACT.

---

## Viewport bbox (future)

### Semantics

> **Viewport bbox answers:** "Show markers whose **resolved display point** is within the visible map rectangle."

### Point resolution for bbox (server)

Same precedence as tier resolution:

```
bbox_point =
  listing exact point
  ?? building centroid
  ?? block centroid
  ?? excluded
```

### Rules

| Rule | Detail |
|---|---|
| APPROXIMATE_UI_ONLY | **Never** included in bbox SQL or visible count |
| BLOCK_CENTROID in bbox | ✓ Counted as visible; marker clustered |
| Building point outside bbox, block inside | **Excluded** — use building point for BUILDING tier, not block fallback for bbox |
| MISSING | In `total` (catalog) but not `visible` |

### total vs visible vs returned

```
total     = COUNT(catalog filters, no bbox, includes MISSING geo)
visible   = COUNT(catalog ∩ bbox ∩ resolvable geo tier)
returned  = MIN(visible, limit) after cursor
```

Document in API: `total` may exceed `visible` when listings exist in region but outside bbox OR have MISSING geo.

---

## Radius search (future "near me")

If implemented:

| Tier | Include in radius results | Sort by distance |
|---|---|---|
| EXACT | ✓ | ✓ |
| BUILDING_CENTROID | ✓ (with badge) | ✗ (sort by price/date only) |
| BLOCK_CENTROID | ✓ (grouped by JK) | ✗ |
| APPROXIMATE_UI_ONLY | ✗ | ✗ |
| MISSING | ✗ | ✗ |

Radius query must use **user location → resolved point** ST_DWithin, not block-only, for EXACT/BUILDING tiers.

For BLOCK_CENTROID: radius search should match **block centroid** but return JK-grouped results, not flat apartment list sorted by fake distance.

---

## Sorting implications

| Sort key | EXACT | BUILDING/BLOCK |
|---|---|---|
| `price_asc` | ✓ | ✓ |
| `date_desc` | ✓ | ✓ |
| `distance_asc` | ✓ | ✗ **disabled** |
| `name_asc` | ✓ | ✓ |

Viewport prototype currently: `sortApplied: 'id_asc'` for listings — acceptable until distance sort is requested.

If distance sort added: gate on `exactDistanceAllowed` per marker; reject at API level if all results are approximate.

---

## Nearby / similar listings

Current similar apartments query: non-spatial (room count, price range). **No change.**

Future "nearby" feature:

- Must filter `geoQuality = EXACT` OR explicit user opt-in to "include approximate"
- Default: EXACT only within 1 km

---

## has_geo filter (deprecate)

Current: `has_geo=true` → `listings.lat IS NOT NULL`

**RFC decision:** Deprecate in favor of:

```
has_resolvable_geo=true  → tier != MISSING (server-side resolution)
```

Or remove entirely — catalog geo filter already handles block-based spatial inclusion.

---

## URL / filter state

Geo params in URL (`geo_lat`, `geo_lng`, `geo_radius_m`, `geo_preset`) map to **block-based catalog filter** — unchanged.

Do **not** add client-computed APPROXIMATE coords to URL state.

---

## Search index implications (future)

If Elasticsearch/PostGIS search added:

| Tier | Index point | Index field |
|---|---|---|
| EXACT | listing lat/lng | `geo_point_exact` |
| BUILDING | building centroid | `geo_point_building` |
| BLOCK | block centroid | `geo_point_block` |

Separate fields prevent accidental cross-tier radius queries.

---

## Truth-safe summary

| Question | Answer |
|---|---|
| Do approximate coords participate in bbox? | BUILDING/BLOCK yes (resolved server-side); APPROXIMATE_UI_ONLY never |
| Do approximate coords participate in radius search? | Included but not distance-sorted |
| Does catalog geo filter use listing lat/lng? | **No** — block IDs only |
| Can user sort by distance for JK apartments? | **No** — unless EXACT tier |
| Are subway walking times affected? | **No** — feed attribute, not computed from pin |
