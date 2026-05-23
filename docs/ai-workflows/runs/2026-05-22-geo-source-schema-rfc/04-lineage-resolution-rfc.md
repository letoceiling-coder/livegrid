# Iteration 18.4 — Lineage Resolution RFC

## Mode

DATA PLATFORM RFC · resolver contract · 2026-05-22

---

## Purpose

Define **`resolveListingGeo()`** — single deterministic function governing geo resolution for SQL, DTOs, normalization jobs, and contract-check. Prevents SQL/DTO drift documented in Iter 17 R10.

---

## Function contract (future)

```typescript
type ResolvedListingGeo =
  | {
      status: 'RESOLVED';
      lat: number;
      lng: number;
      geoSource: GeoSource;
      geoQuality: GeoQuality;
      geoConfidence: number;
      geoEntityId: number | null;
      geoEntityKind: GeoEntityKind | null;
      materialized: boolean;  // true if read from listing row cache
    }
  | {
      status: 'MISSING';
      geoQuality: 'MISSING';
    }
  | {
      status: 'INVALID';
      geoQuality: 'INVALID';
      lat: number;
      lng: number;
    };

function resolveListingGeo(
  listing: ListingGeoInput,
  options?: {
    mode: 'read' | 'materialize';
    parentBlock?: { id: number; latitude: Decimal; longitude: Decimal } | null;
    parentBuilding?: { id: number; latitude: Decimal; longitude: Decimal } | null;
    resolutionVersion?: number;
  },
): ResolvedListingGeo;
```

**Single module:** `apps/api/src/modules/geo/geo-resolver.service.ts` (future).

---

## Precedence rules (deterministic)

```
1. If listing.lat/lng present AND geo_source/geo_quality present AND valid WGS84:
     → Return stored materialized point (materialized: true)
     → Validate combo (source ↔ quality)
     → If INVALID coords → status: INVALID

2. If listing.lat/lng present BUT geo_source IS NULL (legacy):
     → mode=read: compute best tier, do NOT persist (shadow)
     → mode=materialize: classify via legacy rules (doc 03), persist + event

3. If listing.lat/lng NULL OR mode=materialize with stale inherit:
     → Try BUILDING: buildingId + parentBuilding coords valid
     → Try BLOCK: blockId + parentBlock coords valid
     → Else MISSING

4. NEVER return APPROXIMATE_UI_ONLY from this function.
```

### Building beats block

When both FKs exist and both parents have coords:

```
BUILDING_INHERIT (building centroid)  >  BLOCK_INHERIT (block centroid)
```

Iter 16: 100% of building-linked listings have building coords ≠ block coords.

### Stored EXACT beats inherit

If `geo_quality = EXACT` and coords valid → return stored point even if building/block FK exists. Feed import **must not** overwrite.

---

## Materialization write rules

When `mode = 'materialize'`:

```typescript
// Pseudocode — future implementation
function materialize(listing, resolved) {
  if (resolved.status !== 'RESOLVED') {
    clearGeoFields(listing);
    emitEvent('CLEARED' | 'INVALIDATED');
    return;
  }

  const changed = coordsOrTierChanged(listing, resolved);
  if (!changed) return;

  // Downgrade requires explicit reason + ADMIN or PARENT_UPDATED event
  if isDowngrade(listing.geoQuality, resolved.geoQuality)) {
    if (!options.allowDowngrade) return;
  }

  UPDATE listings SET
    lat = resolved.lat,
    lng = resolved.lng,
    geo_source = resolved.geoSource,
    geo_quality = resolved.geoQuality,
    geo_confidence = resolved.geoConfidence,
    geo_entity_id = resolved.geoEntityId,
    geo_entity_kind = resolved.geoEntityKind,
    geo_resolved_at = NOW(),
    geo_resolution_version = CURRENT_VERSION;

  emit ListingGeoEvent(...);
}
```

---

## Transition matrix (allowed tier changes)

| From \ To | EXACT | BUILDING | BLOCK | MISSING | INVALID |
|---|:---:|:---:|:---:|:---:|:---:|
| **EXACT** | ✓ same | ✗ downgrade | ✗ | admin only | auto |
| **BUILDING** | ✓ upgrade | ✓ parent refresh | ✗ downgrade | ✓ FK lost | auto |
| **BLOCK** | ✓ upgrade | ✓ upgrade | ✓ parent refresh | ✓ FK lost | auto |
| **MISSING** | ✓ | ✓ | ✓ | — | — |
| **INVALID** | admin | ✓ re-resolve | ✓ re-resolve | ✓ clear | — |
| **UNKNOWN** | review | ✓ normalize | ✓ normalize | ✓ | auto |

### Upgrade paths (automatic)

| Trigger | Transition |
|---|---|
| Normalization job first run | MISSING → BLOCK_INHERIT or BUILDING_INHERIT |
| buildingId assigned | BLOCK → BUILDING |
| Admin sets manual coords | * → EXACT (MANUAL_EXACT) |
| Geocode verified | MISSING → EXACT (GEOCODE_VERIFIED) |
| Feed adds unit geometry | MISSING → EXACT (FEED_EXACT) |

### Downgrade paths (restricted)

| Trigger | Transition | Allowed? |
|---|---|---|
| Feed import | EXACT → BLOCK | ✗ **Forbidden** |
| Parent coord drift | BUILDING → BLOCK | ✗ Automatic forbidden |
| Admin clears coords | EXACT → MISSING | ✓ ADMIN_OVERRIDE + event |
| FK removed | BUILDING → MISSING | ✓ automatic |
| Invalid coords detected | * → INVALID | ✓ automatic |

**Rule:** EXACT **never downgraded silently**. Requires `GeoEventType.ADMIN_OVERRIDE` or `INVALIDATED`.

---

## SQL integration (future)

Single CASE expression shared by `catalogListingWhereToSql` bbox and SELECT:

```sql
-- geo_resolver_sql.sql (conceptual)
CASE
  WHEN l.lat IS NOT NULL AND l.lng IS NOT NULL
       AND l.geo_quality IS NOT NULL
       AND l.geo_quality NOT IN ('MISSING', 'INVALID')
    THEN ST_SetSRID(ST_MakePoint(l.lng::float8, l.lat::float8), 4326)

  WHEN l.geo_quality = 'BUILDING_CENTROID'
       AND bld.latitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(bld.longitude::float8, bld.latitude::float8), 4326)

  WHEN l.geo_quality = 'BLOCK_CENTROID'
       AND b.latitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(b.longitude::float8, b.latitude::float8), 4326)

  WHEN l.building_id IS NOT NULL AND bld.latitude IS NOT NULL  -- pre-materialization fallback
    THEN ST_SetSRID(ST_MakePoint(bld.longitude::float8, bld.latitude::float8), 4326)

  WHEN l.block_id IS NOT NULL AND b.latitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(b.longitude::float8, b.latitude::float8), 4326)

  ELSE NULL
END AS resolved_geom
```

**Phase 2:** SQL uses JOIN fallback (last two WHEN branches) — read-time, no persist.  
**Phase 3+:** SQL prefers materialized row (first WHEN) — must match resolver output.

Contract-check compares SQL point to `resolveListingGeo()` for sample IDs.

---

## geo_resolution_version

| Version | Meaning |
|---:|---|
| 1 | Initial: building > block precedence, Iter 17 tier rules |
| 2+ | Breaking resolver changes — trigger re-materialization job |

Stored per listing. Batch job: `WHERE geo_resolution_version < CURRENT_VERSION`.

---

## Staleness detection

Materialized inherit coords become stale when parent moves:

```typescript
function isStale(listing, block, building): boolean {
  if (listing.geoQuality === 'BLOCK_CENTROID') {
    return block.updatedAt > listing.geoResolvedAt
      || coordsDiffer(listing, block);
  }
  if (listing.geoQuality === 'BUILDING_CENTROID') {
    return building.updatedAt > listing.geoResolvedAt
      || coordsDiffer(listing, building);
  }
  return false;
}
```

**Phase 4:** Feed import emits `PARENT_UPDATED` events → queue re-materialization for affected listings.

---

## Read path modes

| Mode | Use case | Persists? |
|---|---|---|
| `read` | API response, viewport DTO | No |
| `materialize` | Normalization job, admin save | Yes |
| `shadow` | Contract-check, CI diff | No — compares to stored |

---

## Single source of truth hierarchy

```
1. GeoResolverService.resolveListingGeo()     ← canonical logic (TypeScript)
2. geo_resolver_sql.sql fragment              ← generated from same rules OR CI parity test
3. Viewport DTO mapper                        ← calls resolver, no inline tier logic
4. Frontend                                   ← consumes geoQuality from API only, never computes tier
```

**Forbidden:** Tier inference from `dataSource`, bare lat/lng, or `blockId` presence in DTO mappers.

---

## Resolver inputs: ListingGeoInput

Minimum fields:

```typescript
type ListingGeoInput = {
  id: number;
  lat: Decimal | null;
  lng: Decimal | null;
  geoSource: GeoSource | null;
  geoQuality: GeoQuality | null;
  geoEntityId: number | null;
  geoEntityKind: GeoEntityKind | null;
  geoResolvedAt: Date | null;
  blockId: number | null;
  buildingId: number | null;
  dataSource: DataSource;
};
```

Parent coords loaded by caller or JOIN — resolver does not query DB directly in hot path (testability).

---

## Auditability requirements

Every `materialize` call emitting:

- `ListingGeoEvent` with previous/new source, quality, coords
- `actorType` + `actorId`
- `resolutionVersion`

Queryable: "Why does listing 12345 have BLOCK_INHERIT?" → latest event chain.

---

## Contract-check integration

See `06-migration-strategy-rfc.md` — resolver parity probes:

- Random sample: SQL geom = resolver geom
- Zero UNKNOWN in new writes
- Zero EXACT without geo_source
- Building precedence verified on dual-FK listings
