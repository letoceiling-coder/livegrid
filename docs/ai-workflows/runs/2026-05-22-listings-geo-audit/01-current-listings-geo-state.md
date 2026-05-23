# Iteration 16.1 — Current Listings Geo State

## Mode

DATA PLATFORM AUDIT · read-only · 2026-05-22 · `lg_development` local DB

---

## Executive summary

**Listing-level coordinates are effectively absent for the primary catalog (Moscow apartments).**  
78,602 total listings; only **56 (0.07%)** have `lat`/`lng`. All 56 are `MANUAL` entries in region 7 (Belgorod). **Zero FEED-sourced listings have coordinates.**

Blocks and buildings are fully geocoded. Apartments inherit block linkage (`block_id`) but the import pipeline **never writes `listings.lat`/`listings.lng`**. The viewport prototype therefore returns `total=0, visible=0` for Moscow.

---

## Schema

From `packages/database/prisma/schema.prisma`:

| Entity | Geo columns | Precision | Indexed geo |
|---|---|---|---|
| `Block` | `latitude`, `longitude` | `Decimal(10,8)` / `Decimal(11,8)` | **GIST** (`blocks_geo_gist_idx`) |
| `Building` | `latitude`, `longitude` | same | btree FK only |
| `Listing` | `lat`, `lng` | same | **none** |

Listing geo is optional (`Decimal?`). No PostGIS index, no generated column, no trigger to sync from block/building.

---

## Measured counts (2026-05-22, `lg_development`)

### Overall

| Metric | Count |
|---|---:|
| Total listings | 78,602 |
| Published + ACTIVE | 14,974 |
| With `lat` AND `lng` | **56** |
| Missing coords (`lat IS NULL OR lng IS NULL`) | 78,546 |
| With `block_id` | 76,414 |

**Coord coverage:** 56 / 78,602 = **0.07%**

### By kind (published + ACTIVE)

| Kind | Total | With coords | With block_id |
|---|---:|---:|---:|
| APARTMENT | 14,928 | 10 | 14,917 |
| HOUSE | 27 | 27 | 0 |
| LAND | 19 | 19 | 0 |

Apartment coords exist only in region 7 (manual secondary market). Moscow apartments: **0 / 14,917**.

### By region (published + ACTIVE)

| region_id | Total | With coords | With block_id |
|---:|---:|---:|---:|
| 1 (Moscow) | 14,917 | **0** | 14,917 |
| 7 (Belgorod) | 57 | 56 | 0 |

### By data source

| Source | Total | With coords |
|---|---:|---:|
| FEED | 78,540 | **0** |
| MANUAL | 62 | 56 |

### Parent entity geo (region 1)

| Entity | Total | With coords |
|---|---:|---:|
| Blocks | 1,336 | 1,336 (100%) |
| Buildings | 9,535 | 9,535 (100%) |

**Inheritance potential:** 14,917 Moscow active apartments have `block_id` and their block has coords — but listing rows store `lat`/`lng` = NULL.

---

## Live API confirmation

```
GET /api/v1/_prototype/listings/viewport
  ?region_id=1&sw_lat=55.6&sw_lng=37.4&ne_lat=55.9&ne_lng=37.9&kind=APARTMENT

→ total=0, visible=0, returned=0, catalogParity=id-fallback
```

Matches DB: no listing-level coords in Moscow bbox.

**Contrast — blocks viewport (same bbox):** total=359, visible=181 (Iter 15 measurement).

---

## Frontend behavior today

`RedesignMap.tsx` renders secondary apartments without coords using `fallbackCoords()` — a **deterministic spiral offset** from region center. This is explicitly approximate and must not be treated as geo truth:

```96:104:apps/web/src/redesign/pages/RedesignMap.tsx
function fallbackCoords(center: [number, number] | null, index: number): [number, number] | null {
  if (!center) return null;
  const ring = Math.floor(index / 12) + 1;
  const angle = (index % 12) * (Math.PI / 6);
  const radius = 0.018 * ring;
  return [center[0] + Math.sin(angle) * radius, center[1] + Math.cos(angle) * radius];
}
```

Production map does **not** use listing `lat`/`lng` for FEED apartments — it shows block markers and sidebar listings separately.

---

## Architectural state

```
Blocks path:     geometry in feed → blocks.latitude/longitude → GIST index → viewport SQL ✓
Buildings path:  geometry in feed → buildings.latitude/longitude ✓
Listings path:   NO geometry in apartments.json → lat/lng never set → viewport dead ✗
```

---

## Key finding

The geo lifecycle for apartments was **designed as JOIN-time resolution** (`block_geometry` via FK), not denormalized listing coordinates. The viewport prototype assumes denormalized `listings.lat`/`lng`, which were never populated.

See `03-import-pipeline-analysis.md` for root cause.
