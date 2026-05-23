# Iteration 19.7 — Integration Plan

## Mode

DATA PLATFORM IMPLEMENTATION · future wiring · 2026-05-22

---

## Current state

| Consumer | Wired? |
|---|---|
| GeoModule DI | ✓ exported |
| Viewport prototype | ✗ |
| Contract-check | ✗ |
| Feed import | ✗ |
| Normalization job | ✗ |
| Frontend | ✗ |

---

## Iter 20 — Schema migration

- Apply Iter 18 Phase 1 columns
- No resolver writes yet

---

## Iter 21 — Contract-check shadow probes

Extend `viewport-prototype.service.runContractChecks()`:

```typescript
await run('geo_resolver_building_precedence', async () => {
  const resolved = geoResolver.resolveListingGeo(fixtureListing, { parents });
  if (resolved.status !== 'RESOLVED') throw new Error('expected resolved');
  if (resolved.geoSource !== 'BUILDING_INHERIT') throw new Error('building beat block');
  return serializeResolvedGeo(resolved);
});

await run('geo_resolver_no_ui_only', async () => {
  // assert GeoSource enum has no UI_ONLY
});
```

Read-only DB sample + in-memory resolver.

---

## Iter 22 — Viewport shadow diff

In `findListingsInViewport` (DEV only):

```typescript
// Pseudocode — future
for (const row of sampleRows) {
  const resolved = geoResolver.resolveListingGeo(row, { parents, mode: 'shadow' });
  logGeoResolverDebug(row, resolved, 'shadow');
}
```

Compare `resolved` point count vs current id-fallback count — no response shape change.

---

## Iter 23 — Normalization job

```typescript
const stub = geoResolver.materializeListingGeo(listing, { parents, mode: 'materialize' });
if (stub.action === 'STUB_WOULD_WRITE') {
  // Phase 4: actual Prisma update + ListingGeoEvent
}
```

Replace stub with real write only after Phase 3 sign-off.

---

## Iter 24 — SQL translator

`catalogListingWhereToSql` bbox uses same precedence as resolver — validated by parity probe.

---

## Import hook (Phase 6)

Feed block/building update → queue IDs → batch `resolveListingGeo({ mode: 'materialize' })`.

Apartment import remains geo-field-free.

---

## Frontend

No integration until viewport v2 DTO exposes `geoQuality` (Iter 17 contract).

Remove `fallbackCoords` only after API provides honest tiers.

---

## Dependency graph

```
Iter 19 GeoResolverService (done)
    ↓
Iter 20 Schema columns
    ↓
Iter 21 Contract-check probes
    ↓
Iter 22 Viewport shadow diff
    ↓
Iter 23 Normalization job
    ↓
Iter 24 Viewport v2 + SQL parity
    ↓
Iter 25 Enablement decision
```
