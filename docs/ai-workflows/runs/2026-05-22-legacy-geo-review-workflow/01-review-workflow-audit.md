# Iteration 22.1 — Review Workflow Audit

## Mode

PRODUCTION SAFETY · governance only · 2026-05-22

---

## Governance chain (pre-Iter 22)

| Layer | Status | Role |
|---|---|---|
| Iter 17 GEO CONTRACT | ✓ | Quality tiers, source semantics |
| Iter 18 lineage schema RFC | ✓ | Nullable geo columns design |
| Iter 19 GeoResolverService | ✓ | Pure deterministic resolver |
| Iter 20 additive schema | ✓ | DB columns deployed, zero population |
| Iter 21 dry-run | ✓ | 78,602 rows simulated, GO_WITH_REVIEW |

---

## Current blocker

**56 SHADOW_UNCLASSIFIED rows** — legacy manual coords without lineage. All in **region 7 (Belgorod)**. Cannot auto-materialize without human classification.

---

## Inspected components

| Component | Finding |
|---|---|
| `GeoResolverService` | Legacy coords → SHADOW_UNCLASSIFIED; no auto-persist |
| `geo-materialization-report.ts` | Classification + DANGEROUS_OVERWRITE guards |
| `geo-materialization-dry-run.service.ts` | Full-table simulation, schema before/after |
| Iter 20 schema | Nullable geo columns; no CHECK enforcement |
| DEV shadow endpoints | lineage-stats, materialization-dry-run |
| `fallbackCoords()` frontend | Client-only APPROXIMATE_UI_ONLY — **not touched** |
| Viewport prototype | Unchanged; MSK listings still total=0 |

---

## Gap identified

No governance layer existed for human review decisions. Resolver could suggest lineage but had no audit trail for reviewer sign-off.

---

## Iter 22 scope

Build review infrastructure ONLY:

- Review dataset service (SHADOW_UNCLASSIFIED rows)
- Separate review status enum (NOT geo_source)
- Append-only decision storage
- DEV endpoints
- Safety guards
- Observability metrics

**Explicitly excluded:** listing geo writes, viewport enablement, materialization jobs.

---

## Verified candidate set

| Metric | Value |
|---|---:|
| Legacy coord candidates (SQL) | 56 |
| SHADOW_UNCLASSIFIED after classify | **56** |
| Region | 7 (Belgorod) |
| MSK (region 1) shadow rows | 0 |

All 56 are manual houses/land without block/building FK — resolver suggests MANUAL_EXACT.
