# Iteration 18.8 — Final Recommendation

## Mode

DATA PLATFORM RFC · final verdict · 2026-05-22

---

## Verdict

**Adopt the listing geo lineage schema as designed in Iter 18** — seven new fields on `listings`, three enums, optional `listing_geo_events` audit table, and a single `GeoResolverService` write path.

This is the **foundational persistence layer** for Iter 17 GEO CONTRACT. Without it, viewport normalization cannot proceed safely.

---

## What Iter 18 delivers

| Deliverable | Status |
|---|---|
| Current storage audit | ✓ `01-current-geo-storage-audit.md` |
| Schema design (7 fields + enums) | ✓ `02-schema-design-rfc.md` |
| Enum governance + tier mapping | ✓ `03-enum-governance-rfc.md` |
| Resolver + transition matrix | ✓ `04-lineage-resolution-rfc.md` |
| Import/normalization write rules | ✓ `05-import-normalization-rfc.md` |
| 6-phase migration plan | ✓ `06-migration-strategy-rfc.md` |
| Risk analysis | ✓ `07-risk-analysis.md` |

**Not delivered (by design):** migrations, backfill, resolver code, DTO changes.

---

## Recommended schema (summary)

```prisma
model Listing {
  lat                    Decimal?       // materialized display point
  lng                    Decimal?
  geoSource              GeoSource?     // provenance
  geoQuality             GeoQuality?    // Iter 17 tier (DB subset)
  geoConfidence          Decimal?       // 0.000–1.000
  geoResolvedAt          DateTime?
  geoEntityId            Int?
  geoEntityKind          GeoEntityKind?
  geoResolutionVersion   Int @default(1)
}
```

**Hard rules:**

- Coords without `geo_source` → constraint violation (Phase 5)
- `UI_ONLY` → never in DB enum
- EXACT → never silently downgraded
- All writes → `GeoResolverService.materialize()`

---

## Key audit findings driving design

| Finding | Design response |
|---|---|
| 78,540 FEED listings, 0 coords | Normalization job materializes BUILDING/BLOCK inherit |
| 56 coords without lineage | UNKNOWN classification + review queue |
| lat/lng schema drift (no migration) | Phase 1 `ADD COLUMN IF NOT EXISTS` |
| populate script silent inherit | Fix to BLOCK_INHERIT + geo fields |
| feed apartments never write geo | Preserved; queue re-materialize on FK change only |
| SQL/DTO drift risk | Single resolver + parity CI |

---

## Implementation sequence (post-RFC)

```
Iter 19 — GeoResolverService implementation (shadow mode)
Iter 20 — Phase 1 migration execution (local/staging)
Iter 21 — Shadow population + review report
Iter 22 — Phase 4 materialization (MSK)
Iter 23 — Viewport v2 contract + GIST index
Iter 24 — Phase 5 enforcement + import hooks
Iter 25 — Viewport shadow validation → enablement decision
```

Iter numbers approximate — may merge 19–20.

---

## Phase 1 migration — ready to draft

When approved for execution, first migration should:

1. Create `GeoSource`, `GeoQuality`, `GeoEntityKind` enums
2. Add seven nullable columns to `listings`
3. Reconcile `lat`/`lng` column existence
4. Add btree indexes on geo fields
5. **Zero data UPDATE**

Estimated migration size: ~30 lines SQL. Non-blocking on empty columns.

---

## Resolver contract (summary)

```
Precedence:
  stored EXACT (with valid source)
  → BUILDING_INHERIT
  → BLOCK_INHERIT
  → MISSING

Never:
  APPROXIMATE_UI_ONLY
  silent EXACT from inherit
  feed import inline geo write
```

Full spec: `04-lineage-resolution-rfc.md`

---

## Success criteria (schema governance complete)

| Criterion | When |
|---|---|
| Phase 1 migration applied all envs | Iter 20 |
| Zero unclassified coords (source null + lat set) | Phase 5 |
| MSK 14,917 listings materialized | Phase 4 |
| Resolver/SQL parity 100% sample | Phase 2+ |
| listing_geo_events audit trail | Phase 3+ |
| contract-check geo probes pass | Pre-viewport |
| UI_ONLY count in DB = 0 | Always |

---

## Relationship to Iter 17 GEO CONTRACT

| Iter 17 concept | Iter 18 persistence |
|---|---|
| GeoQuality tier | `geo_quality` column |
| GeoSource (API) | `geo_source` column (finer-grained) |
| geoConfidence | `geo_confidence` column |
| clusterRequired | Computed from geo_quality + zoom (not stored) |
| APPROXIMATE_UI_ONLY | Excluded from schema |
| Lineage / auditability | `geo_entity_*` + `listing_geo_events` |

---

## Explicit rejections

| Approach | Why rejected |
|---|---|
| Infer tier from `dataSource` alone | Insufficient — FEED can be EXACT or MISSING |
| Store geo only on block/building | No listing GIST; id-fallback persists |
| Skip geo_source — use quality only | Loses provenance for audit |
| Immediate backfill in schema migration | Violates phased rollout; no review gate |
| UI_ONLY in enum with CHECK=false | Invites accidental persistence |

---

## Final statement

**Geo lineage schema is prerequisite infrastructure** — not optional metadata. Every coordinate on a listing row must answer:

1. **Where** (lat/lng)
2. **What tier** (geo_quality)
3. **Why** (geo_source)
4. **From which entity** (geo_entity_id/kind)
5. **When** (geo_resolved_at)
6. **How trustworthy** (geo_confidence)

Until these fields exist and normalization completes, **listings viewport remains blocked** — regardless of SQL translator or frontend work.

Architecture only in Iteration 18. No migrations executed. No data modified.

---

## Document index

```
docs/ai-workflows/runs/2026-05-22-geo-source-schema-rfc/
├── 01-current-geo-storage-audit.md
├── 02-schema-design-rfc.md
├── 03-enum-governance-rfc.md
├── 04-lineage-resolution-rfc.md
├── 05-import-normalization-rfc.md
├── 06-migration-strategy-rfc.md
├── 07-risk-analysis.md
└── 08-final-recommendation.md
```

Prior context: Iter 16 (geo audit), Iter 17 (GEO CONTRACT RFC).
