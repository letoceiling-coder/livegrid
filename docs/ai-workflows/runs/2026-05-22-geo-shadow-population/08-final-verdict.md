# Iteration 21.8 — Final Verdict

## Mode

SHADOW NORMALIZATION · dry-run complete · 2026-05-22

---

## Verdict

**GO_WITH_REVIEW** — Geo normalization is operationally safe for bulk inherit materialization (76,414 rows) after manual review of 56 legacy coord rows.

---

## GO/NO-GO matrix

| Scope | Recommendation | Blocker |
|---|---|---|
| MSK inherit bulk (region 1) | **GO** | None |
| Global all regions | **GO_WITH_REVIEW** | 56 SHADOW_UNCLASSIFIED |
| Legacy coord rows | **MANUAL REVIEW** | Human classification |
| MISSING rows (2,132) | **SKIP** | Upstream geo enrichment |
| Viewport enablement | **NO_GO** | Requires materialization first |

---

## Delivered

| Area | Status |
|---|---|
| `GeoMaterializationDryRunService` | ✓ |
| `geo-materialization-report.ts` classification | ✓ |
| CLI `normalize-listing-geo --dry-run` | ✓ |
| DEV endpoint `/_shadow/materialization-dry-run` | ✓ |
| Unit tests (16/16) | ✓ |
| Full-table dry-run (78,602 rows) | ✓ |
| Documentation (01–08) | ✓ |

---

## Verification proof

| Check | Result |
|---|---|
| `tsc --noEmit` | ✓ pass |
| Materialization tests | ✓ 16/16 |
| Resolver tests | ✓ 24/24 |
| Rows processed | 78,602 |
| schemaUnchanged | **true** |
| geo_source before/after | 0 / 0 |
| geo_quality before/after | 0 / 0 |
| lat/lng before/after | 56 / 56 |
| DANGEROUS_OVERWRITE | **0** |
| LINEAGE_CONFLICT | **0** |
| Dry-run hash | `5cdbb712284bfbb4` |

---

## Aggregate summary

| Metric | Count |
|---|---:|
| WOULD_WRITE_BUILDING | 75,998 |
| WOULD_WRITE_BLOCK | 416 |
| SHADOW_UNCLASSIFIED | 56 |
| MISSING | 2,132 |
| Duration | 5.9 s (read-only) |

---

## Explicit non-deliverables (correct)

- No UPDATE / UPSERT / backfill
- No viewport enablement
- No map API changes
- No production job deployment
- No queue workers

---

## Recommended next steps

1. **Iter 22** — Human review workflow for 56 SHADOW_UNCLASSIFIED rows
2. **Iter 23** — Staging materialization job (real writes, staging only) scoped to region 1 inherit
3. **Iter 24** — Viewport listings re-enable after coord materialization verified

---

## Final statement

Iteration 21 proves that future geo normalization is **deterministic, read-only verifiable, and safe for 97.3% of listings** (inherit path). The remaining 2.7% splits into human review (56 legacy) and upstream enrichment (2,132 missing). **Zero database mutations occurred.** Real materialization may proceed after human sign-off on legacy rows and staging validation.
