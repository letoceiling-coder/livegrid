# Iteration 19.5 — SQL Parity Prep

## Mode

DATA PLATFORM IMPLEMENTATION · future contract-check · 2026-05-22

---

## Module

`geo-resolver-sql-parity.ts`

---

## serializeResolvedGeo()

Deterministic JSON-safe snapshot:

- Coords rounded to `COORD_EQUALITY_DECIMALS` (6)
- All enum values as strings
- Discriminated by `status`

Used for:

- Resolver vs resolver regression tests
- Future SQL point vs TypeScript resolver diff
- Contract-check probe output

---

## resolvedGeoEquals()

```typescript
JSON.stringify(serializeResolvedGeo(a)) === JSON.stringify(serializeResolvedGeo(b))
```

Stable cross-run equality for CI.

---

## geoEntityGroupKey()

Future cluster/dedup key:

```
BUILDING_CENTROID:BUILDING:200
BLOCK_CENTROID:BLOCK:100
EXACT:listing:55.761244:37.620000
```

Used when viewport pre-aggregation ships (Iter 21+).

---

## Future SQL parity workflow

```
1. Sample N listing IDs from DB
2. Load listing + block + building parents (read-only)
3. resolved = resolveListingGeo(listing, { parents })
4. sqlPoint = execute ST_MakePoint CASE query
5. assert coordsEqual(resolved.lat, sqlPoint.lat)
6. assert serializeResolvedGeo(resolved) matches expected fixture
```

**Not implemented in Iter 19** — infrastructure only.

---

## Alignment with Iter 18 SQL CASE

Resolver inherit paths match conceptual SQL:

| Resolver path | SQL equivalent |
|---|---|
| BUILDING_INHERIT | `bld.latitude/longitude` |
| BLOCK_INHERIT | `b.latitude/longitude` |
| STORED_MATERIALIZED | `l.lat/lng` with lineage |
| SHADOW_UNCLASSIFIED | `l.lat/lng` (legacy, no quality filter) |

Post-materialization (Phase 4), first SQL WHEN branch must match stored materialized path.

---

## Export surface

```typescript
export {
  serializeResolvedGeo,
  resolvedGeoEquals,
  geoEntityGroupKey,
  COORD_EQUALITY_DECIMALS,
} from './geo-resolver-sql-parity';
```

Safe to import from contract-check module without Nest DI.
