# Iteration 18.5 — Import & Normalization RFC

## Mode

DATA PLATFORM RFC · write governance · 2026-05-22

---

## Purpose

Define **who may write geo fields, when, and what may overwrite what** — covering feed import, manual flows, geocode enrichment, admin overrides, and batch normalization.

---

## Write authority matrix

| Actor | lat/lng | geo_source | geo_quality | Method |
|---|---|---|---|---|
| `processApartments()` | ✗ | ✗ | ✗ | FK only |
| `processBlocks()` | ✗ (block table only) | ✗ | ✗ | Parent coords |
| `processBuildings()` | ✗ (building table only) | ✗ | ✗ | Parent coords |
| Manual create (coords provided) | ✓ | ✓ MANUAL_EXACT | ✓ EXACT | Via resolver materialize |
| Manual create (no coords) | ✗ | ✗ | ✗ | MISSING until normalized |
| Admin geo override | ✓ | ✓ | ✓ | Audited ADMIN_OVERRIDE |
| Geocode service | ✓ | ✓ GEOCODE_* | ✓ | Via resolver materialize |
| Normalization job | ✓ | ✓ | ✓ | BATCH MATERIALIZED |
| `populate-local-map-data.ts` | ✓ dev only | ✓ BLOCK_INHERIT | ✓ | Dev mirror — fix script |
| Frontend fallbackCoords | ✗ | ✗ | ✗ | **Never** |

---

## Feed import rules

### Apartments (`processApartments`)

**Current behavior preserved until Phase 4:**

```typescript
// update clause — geo fields ABSENT (correct)
update: { price, blockId, buildingId, builderId, districtId, status }
```

**Phase 4 addition (after normalization baseline):**

On `blockId` or `buildingId` change:

```typescript
if (blockIdChanged || buildingIdChanged) {
  queueGeoReMaterialization(listing.id, reason: 'FK_CHANGED');
}
// Still do NOT inline-write geo fields in import loop
```

**Never in feed import:**

- Copy block.latitude → listing.lat
- Infer tier from dataSource
- Clear EXACT coords on price update

### Blocks (`processBlocks`)

Writes `blocks.latitude/longitude` from feed geometry.

**Phase 2b:** Also set `blocks.geoResolvedAt = now()`, `blocks.geoSource = FEED_GEOMETRY`.

**Phase 4:** After block coord update:

```typescript
await queueListingReMaterialization({
  blockId: block.id,
  eventType: 'PARENT_UPDATED',
  reason: 'block_geometry_changed',
});
```

Listings with `geo_entity_kind=BLOCK` and matching `geo_entity_id` re-normalized.

### Buildings (`processBuildings`)

Same pattern as blocks — parent coord update triggers listing re-materialization for `BUILDING_INHERIT` rows tied to that building.

---

## Manual listing flow

### Create with coordinates

```typescript
// Future — listings.service.ts createManual*
if (dto.lat != null && dto.lng != null) {
  await geoResolver.materialize(listing, {
    lat: dto.lat,
    lng: dto.lng,
    geoSource: 'MANUAL_EXACT',
    geoQuality: 'EXACT',
    geoConfidence: 0.95,
    actorType: 'ADMIN_USER',
    actorId: actorUserId,
  });
}
```

Validate WGS84 before write. Reject (0,0).

### Create without coordinates

Leave geo fields NULL. `geo_quality` unset (pre-enforcement) or `MISSING` (post-enforcement).

Normalization job will materialize BUILDING/BLOCK inherit on schedule.

### Update coordinates (future admin endpoint)

New `PATCH /admin/listings/:id/geo` — not existing `UpdateListingAdminDto`.

Requires:

- Explicit `lat`, `lng`
- Optional `reason` text
- Emits `ADMIN_OVERRIDE` event
- Sets MANUAL_EXACT / EXACT

**Cannot** set geo_source to UI_ONLY or omit geo_quality.

---

## Geocode enrichment

### ListingLocationMap (current)

Client-side Yandex geocode — **not persisted**. Correct for now.

### Future server-side geocode job

Trigger: listing has `address` AND `geo_quality = MISSING` AND no block FK (secondary market).

```
1. Geocode address via provider
2. Parse match kind + precision
3. kind=house + score ≥ 0.8  → GEOCODE_VERIFIED / EXACT
4. kind=street/locality      → GEOCODE_APPROXIMATE / BUILDING_CENTROID
5. no match                  → remain MISSING
6. materialize via resolver
```

**Never** auto-promote geocode to EXACT without match quality gate.

---

## Normalization job lifecycle

### Job: `normalize-listing-geo`

```
FOR each listing WHERE geo_resolved_at IS NULL
   OR geo_resolution_version < CURRENT
   OR stale(parent.updatedAt > geo_resolved_at):

  parents = load block + building coords
  resolved = resolveListingGeo(listing, { mode: 'materialize', parents })

  IF resolved changed:
    materialize(listing, resolved)
    emit ListingGeoEvent(MATERIALIZED | UPGRADED | PARENT_UPDATED)
```

### Batch parameters

| Parameter | Suggested |
|---|---|
| Batch size | 500 |
| Region order | 1 (MSK) first |
| Dry run | `--shadow` writes to audit log only |
| Concurrency | 1 writer per region (avoid lock contention) |

### Expected MSK outcome (Iter 16 baseline)

| Before | After normalization |
|---|---:|
| lat/lng NULL | ~14,917 materialized |
| geo_source NULL | 0 (all classified) |
| BUILDING_INHERIT | ~majority (75k+ with buildingId) |
| BLOCK_INHERIT | remainder with blockId only |
| EXACT | 0 from FEED (unless manual) |

**Not executed in Iter 18.**

---

## Overwrite precedence (conflict resolution)

When multiple writers compete:

```
Priority (highest wins):
1. ADMIN_OVERRIDE (manual)
2. MANUAL_EXACT / FEED_EXACT / GEOCODE_VERIFIED
3. BUILDING_INHERIT (normalization)
4. BLOCK_INHERIT (normalization)
5. UNKNOWN (legacy classification — lowest)
```

Feed apartment import (price/FK update) **never** enters this stack for geo.

---

## Rebuild geo lineage (admin operation)

Future: `POST /admin/geo/rebuild?region_id=1&dry_run=true`

- Re-runs normalization for all listings in region
- Does not change lat/lng of EXACT rows unless `--force-exact` (superadmin)
- Emits summary: upgraded, downgraded, cleared, unchanged

---

## populate-local-map-data.ts fix (future)

Current anti-pattern:

```typescript
lat: block.latitude,
dataSource: 'MANUAL',  // wrong
```

Target:

```typescript
// After resolver exists
await geoResolver.materialize(listing, {
  geoSource: 'BLOCK_INHERIT',
  geoQuality: 'BLOCK_CENTROID',
  geoEntityId: block.id,
  geoEntityKind: 'BLOCK',
  actorType: 'SYSTEM',
  reason: 'dev_mirror_script',
});
dataSource: 'MANUAL',  // listing record source — separate from geo_source
```

---

## Import pipeline phase alignment

| Phase | Import behavior |
|---|---|
| 1 (schema) | No change |
| 2 (shadow resolver) | Import unchanged; shadow logs what normalization would write |
| 3 (normalization job) | Import unchanged; job backfills |
| 4 (parent triggers) | Block/building updates queue re-materialization |
| 5 (enforcement) | Import rejects direct lat/lng writes outside resolver |

---

## Forbidden operations (global)

| Operation | Why |
|---|---|
| Bulk UPDATE listings SET lat=blocks.latitude | Silent BLOCK promoted to ambiguous EXACT |
| Set lat/lng without geo_source | Provenance violation |
| Persist fallbackCoords output | UI_ONLY in DB |
| Feed import clears geo on status change | Destroys EXACT manual listings |
| Downgrade EXACT without audit event | Fake precision risk in reverse |
