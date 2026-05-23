# Iteration 23.7 — Risk Analysis

## Mode

CONTROLLED STAGING · 2026-05-22

---

## Risks mitigated

| Risk | Mitigation | Status |
|---|---|---|
| Production accidental write | NODE_ENV guard | ✓ |
| Transaction timeout | Sub-batch size 50 | ✓ |
| Irreversible materialization | Snapshot rollback tested | ✓ 76,267 restored |
| Belgorod unreviewed materialization | Review session complete | ✓ 56/56 |
| Resolver drift | 200/200 parity sample | ✓ |
| Partial failure | Idempotent geo_source guard | ✓ 0 conflicts |
| Viewport premature enable | No frontend changes | ✓ |

---

## Residual risks

| Risk | Level | Notes |
|---|---|---|
| Production deploy of materialization job | High | Requires staging sign-off + runbook |
| Belgorod EXACT materialization | Medium | 56 rows need separate EXACT pass |
| 2,132 MISSING rows (global) | Low | Skipped by inherit job |
| Viewport parity re-baseline needed | Medium | Listings layer now has coords |
| WAL burst on production | Medium | Off-peak window required |

---

## Safety checklist

- [x] Belgorod review 56/56 complete
- [x] Staging materialization 76,267 rows
- [x] Rollback validated (full restore)
- [x] Re-materialization successful
- [x] Resolver parity 200/200
- [x] No production DB touched
- [x] No viewport frontend switch
- [x] No cluster changes
- [x] api tsc pass
- [x] web tsc pass
- [x] 59/59 geo tests pass

---

## Staging vs production

| Aspect | Staging (Iter 23) | Production |
|---|---|---|
| Materialization | ✓ executed | ✗ not executed |
| Rollback tested | ✓ | pending |
| Review decisions | ✓ local DB | pending sync |
| Viewport enable | ✗ | ✗ |

---

## Unacceptable (blocked)

| Action | Status |
|---|---|
| Production materialization | ✗ |
| Viewport frontend switch | ✗ |
| Remove fallbackCoords | ✗ |
| Auto-classify Belgorod listings | ✗ |
