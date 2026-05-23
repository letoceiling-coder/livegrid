# Iteration 21.7 — Risk Analysis

## Mode

SHADOW NORMALIZATION · 2026-05-22

---

## Risks mitigated

| Risk | Mitigation | Status |
|---|---|---|
| Accidental DB writes | Read-only service; schema before/after guard | ✓ verified |
| Coord overwrite | DANGEROUS_OVERWRITE detection | ✓ 0 flags |
| Lineage corruption | LINEAGE_CONFLICT detection | ✓ 0 flags |
| EXACT downgrade | Resolver STUB_BLOCKED | ✓ tested |
| Non-deterministic reports | stableReportHash + unit tests | ✓ pass |
| Production exposure | DEV-only endpoint + CLI gate | ✓ |

---

## Residual risks

| Risk | Level | Notes |
|---|---|---|
| 56 legacy rows misclassified | Medium | Require human review (Phase A) |
| 2,132 MISSING rows | Low | Skip in bulk job; enrich upstream |
| Feed import race during write | Medium | Advisory lock or off-peak window |
| lat/lng denormalization drift | Low | Re-materialize on parent coord change (future) |
| Viewport premature enablement | High impact | Do NOT enable until materialization complete |

---

## Safety checklist

- [x] Zero UPDATE statements in dry-run code
- [x] schemaUnchanged=true (78,602 rows processed)
- [x] geo_source=0 before and after
- [x] geo_quality=0 before and after
- [x] lat/lng=56 before and after
- [x] lineage_populated=0 before and after
- [x] tsc --noEmit pass
- [x] 16/16 materialization tests pass
- [x] 24/24 resolver tests pass (unchanged)
- [x] No viewport changes
- [x] No frontend changes
- [x] No feed import changes

---

## Classification safety matrix

| Category | Auto-approve bulk write? |
|---|---|
| WOULD_WRITE_BUILDING | ✓ Yes (with idempotent guard) |
| WOULD_WRITE_BLOCK | ✓ Yes |
| EXACT_PRESERVED | N/A (noop) |
| SHADOW_UNCLASSIFIED | ✗ Manual review required |
| MISSING | ✗ Skip |
| INVALID | ✗ Skip |
| DANGEROUS_OVERWRITE | ✗ **Never** |
| LINEAGE_CONFLICT | ✗ Reconcile first |

---

## Unacceptable (blocked in Iter 21)

| Action | Status |
|---|---|
| UPDATE listings | ✗ not done |
| Populate geo_source | ✗ not done |
| Enable viewport | ✗ not done |
| Deploy materialization job | ✗ not done |
| Modify lat/lng | ✗ not done |

---

## Test coverage

`geo-materialization.spec.ts` — 16 tests:

- Classification paths (9)
- Determinism (2)
- GO/NO-GO logic (3)
- Zero-write guard (2)
