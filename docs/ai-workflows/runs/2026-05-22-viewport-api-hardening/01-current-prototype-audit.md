# Iteration 15.1 — Current Prototype Audit

## Mode

Backend contract audit · live API · 2026-05-22 · post-Iter 14 frontend stabilization

---

## Module layout

```
apps/api/src/modules/viewport-prototype/
├── viewport-prototype.controller.ts   @Controller('_prototype')
├── viewport-prototype.service.ts      SQL + shared where builders
├── viewport-bbox-sql.ts               ST_Within envelope
├── viewport-contract.types.ts         Iter 15 response types
├── viewport-contract.utils.ts         meta builder, sort, density
└── dto/
    ├── query-viewport-bbox.dto.ts     bbox + limit + cursor + zoom
    ├── query-viewport-blocks.dto.ts   Intersection QueryBlocksDto
    └── query-viewport-listings.dto.ts Intersection QueryListingsDto
```

**Gate:** `VIEWPORT_PROTOTYPE_ENABLED=1` OR `NODE_ENV !== production`

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/_prototype/blocks/viewport` | Blocks markers in bbox |
| GET | `/_prototype/listings/viewport` | Listings markers in bbox |
| GET | `/_prototype/viewport/contract-check` | Edge-case probes |

All `@Public()` — prototype only.

---

## Pre-Iter 15 contract (gaps)

| Field | Before | Issue |
|---|---|---|
| `meta.count` | returned rows only | No catalog total |
| `meta.visible` | **missing** | Cannot show «58 в области» |
| `meta.hasMore` | **missing** | No pagination signal |
| `meta.cursor` | **missing** | No keyset continuation |
| `meta.density` | **missing** | No spatial metric |
| `meta.bbox` | **missing** | No echo |
| Sort | hardcoded `name ASC` | Ignored `sort` param |
| Listings count | N/A | ID-scan path only |

---

## Post-Iter 15 contract

```typescript
{
  data: ViewportBlockMarkerDto[] | ViewportListingMarkerDto[],
  meta: ViewportResponseMeta
}
```

See `viewport-contract.types.ts`.

---

## SQL paths

### Blocks (primary)

1. `buildCatalogBlockWhere()` — shared with `/blocks`
2. `catalogBlockWhereToSql()` → SQL WHERE on alias `b`
3. `blockBboxEnvelopeSql()` → `ST_Within(point, envelope)`
4. Parallel: `COUNT(*)` catalog, `COUNT(*)` bbox, `SELECT … LIMIT`

**Composition:** `catalogSql AND bboxSql` — **AND only**, never OR.

### Listings (fallback)

1. `buildCatalogListingWhere()`
2. Prisma `findMany` all geo-capable IDs
3. Raw SQL `id IN (…) AND bboxSql`

**Honest limitation:** no listing catalog SQL translator — `catalogParity: id-fallback`.

---

## Filter source

Blocks/listings DTOs inherit full catalog query params from production DTOs (Iter 10).

---

## Measured baseline (region 1, Moscow bbox)

**Live after Iter 15 build:**

| Metric | Value |
|---|---|
| `meta.total` | **359** |
| `meta.visible` | **181** |
| `meta.returned` | **181** |
| `meta.hasMore` | false (limit 500) |
| `meta.density` | **1206.7** / deg² |
| Response time | **212 ms** |
| Payload | **47 KB** |
| Legacy `/blocks?per_page=200` | 221 ms, **900 KB** |

---

## Frontend coupling (unchanged)

Shadow hook reads `data.data` only — extended `meta` backward compatible.

**No frontend changes in Iter 15** — by design.

---

## Conclusion

Prototype had filter parity (Iter 10) but **weak response contract**. Iter 15 adds production-grade `meta` semantics while keeping `_prototype` path isolated.
