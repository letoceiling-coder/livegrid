# Iteration 21.1 — Dry-Run Architecture

## Mode

SHADOW NORMALIZATION · dry-run only · 2026-05-22

---

## Goal

Simulate the full future `normalize-listing-geo` pipeline against live schema **without mutating any row**.

---

## Components

| File | Role |
|---|---|
| `geo-materialization.types.ts` | Report types, classification enum, metrics |
| `geo-materialization-report.ts` | Pure classification + aggregation + GO/NO-GO |
| `geo-materialization-dry-run.service.ts` | NestJS read-only batch processor |
| `geo-materialization.cli.ts` | `normalize-listing-geo --dry-run` CLI |
| `geo-materialization.spec.ts` | Deterministic classification tests |

---

## Per-listing flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Load listing│────▶│ GeoResolverService│────▶│ classifyListingDryRun│
│ + parents   │     │ resolve + stub   │     │ (pure classification)│
└─────────────┘     └──────────────────┘     └─────────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────────┐
                                              │ Aggregate + report  │
                                              │ schema before/after │
                                              └─────────────────────┘
```

1. Load listing geo state + block/building parent coords (JOIN)
2. Run `resolveListingGeo()` + `materializeListingGeo()` stub
3. Classify outcome (WOULD_WRITE / SKIP / FLAG)
4. Serialize deterministic result
5. **No UPDATE, no UPSERT, no transaction writes**

---

## Batch strategy

- Keyset cursor pagination: `ORDER BY id ASC`, `cursor: { id }`
- Default batch size: **500**
- Optional `--region=N`, `--max-rows=N` for scoped probes

---

## Entry points

| Entry | Command / route |
|---|---|
| CLI | `pnpm --filter api geo:dry-run` |
| CLI (JSON) | `npx tsx src/modules/geo/geo-materialization.cli.ts --dry-run --json` |
| DEV endpoint | `GET /api/v1/geo/_shadow/materialization-dry-run` |

All entry points blocked in production (`NODE_ENV=production`).

---

## Zero-write guarantee

Dry-run captures schema counts **before** and **after** processing:

- `geo_source` populated
- `geo_quality` populated
- `lat/lng` count
- `lineage_populated`

CLI exits with code **2** if counts diverge.

---

## Resolver parity

Classification delegates to Iter 19 `GeoResolverService` — no duplicate resolution logic. Shadow probes from Iter 20 remain unchanged.
