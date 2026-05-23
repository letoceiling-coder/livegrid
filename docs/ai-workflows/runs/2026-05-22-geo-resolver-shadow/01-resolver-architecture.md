# Iteration 19.1 — Resolver Architecture

## Mode

DATA PLATFORM IMPLEMENTATION · shadow-only · 2026-05-22

---

## Delivered

```
apps/api/src/modules/geo/
├── geo-resolver.types.ts       — discriminated unions, inputs, outputs
├── geo-resolver.constants.ts   — confidence, valid combos, version
├── geo-resolver.utils.ts       — WGS84, legacy classification helpers
├── geo-resolver.service.ts     — GeoResolverService + pure exports
├── geo-resolver-sql-parity.ts  — serializeResolvedGeo, equality
├── geo-resolver-debug.ts       — DEV-only debug snapshots
├── geo-resolver.spec.ts        — 24 deterministic unit tests
└── geo.module.ts               — exports GeoResolverService
```

---

## Design principles

| Principle | Implementation |
|---|---|
| Single canonical authority | `GeoResolverService.resolveListingGeo()` |
| Pure + sync | No Prisma, DB, network, async |
| Shadow-only | No writes; `materializeListingGeo()` returns stub |
| Parents explicit | Caller passes `GeoParentInput` — no lazy load |
| Deterministic | No time, random, or env in resolution path |

---

## Resolution flow

```
resolveListingGeo(listing, { mode, parents })
  │
  ├─ invalid coord input (NaN) ──────────────→ INVALID
  ├─ lat/lng invalid WGS84 ──────────────────→ INVALID
  │
  ├─ lat/lng + geoSource + geoQuality ───────→ STORED_MATERIALIZED (RESOLVED)
  │     └─ bad combo ────────────────────────→ INVALID
  │
  ├─ lat/lng + no geoSource ─────────────────→ SHADOW_UNCLASSIFIED
  │
  ├─ buildingId + parent coords ───────────────→ BUILDING_INHERIT (RESOLVED)
  ├─ blockId + parent coords ────────────────→ BLOCK_INHERIT (RESOLVED)
  │
  └─ else ───────────────────────────────────→ MISSING
```

---

## NestJS integration

`GeoResolverService` registered in `GeoModule` — exported for future:

- Viewport prototype (shadow diff)
- Contract-check extension
- Normalization job (Iter 20+)

**Not wired** to viewport SQL or feed import in Iter 19.

---

## Pure exports

For tests and CI without DI:

```typescript
import { resolveListingGeo, materializeListingGeoStub } from './geo-resolver.service';
```

---

## Verification

```bash
pnpm --filter api exec tsc --noEmit          # pass
cd apps/api && npx tsx --test src/modules/geo/geo-resolver.spec.ts  # 24/24 pass
```
