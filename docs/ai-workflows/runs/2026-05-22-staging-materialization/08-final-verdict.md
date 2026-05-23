# Iteration 23.8 — Final Verdict

## Mode

CONTROLLED STAGING · experiment complete · 2026-05-22

---

## Verdict

**PASS** — Staging geo materialization is operationally safe, reversible, and resolver-parity verified. Production-ready pending runbook and Belgorod EXACT pass.

---

## GO/NO-GO matrix

| Scope | Recommendation |
|---|---|
| MSK inherit materialization (production) | **GO_WITH_RUNBOOK** — after staging sign-off |
| Rollback capability | **GO** — proven on 76,267 rows |
| Viewport listings enablement | **GO_WITH_REBASELINE** — coords exist; parity re-baseline needed |
| Belgorod EXACT materialization | **PENDING** — 56 reviewed, not yet materialized |
| Production deploy | **NO_GO** — staging only this iteration |

---

## Delivered

| Area | Status |
|---|---|
| Belgorod review session (56/56) | ✓ |
| GeoMaterializationJobService | ✓ |
| Rollback snapshots migration | ✓ |
| Staging materialization (76,267 rows) | ✓ |
| Full rollback validation | ✓ |
| Re-materialization | ✓ |
| Resolver parity (200/200) | ✓ |
| Viewport shadow validation | ✓ |
| Documentation (01–08) | ✓ |

---

## Key measurements

| Metric | Value |
|---|---:|
| Materialized (region 1) | 76,267 |
| BUILDING_INHERIT | 75,851 |
| BLOCK_INHERIT | 416 |
| Materialization time | 338 s |
| Rollback time | 270 s |
| Viewport listings total | 14,888 |
| Viewport bbox visible | 6,533 |
| Resolver parity | 200/200 |
| Conflicts | 0 |

---

## Verification proof

| Check | Result |
|---|---|
| api tsc | ✓ |
| web tsc | ✓ |
| Geo tests | ✓ 59/59 |
| Rollback → lineage=0 | ✓ |
| Re-materialize → lineage=76267 | ✓ |
| Belgorod reviews | 56 APPROVED_AS_EXACT |
| Production guard | ✓ blocked |

---

## Explicit non-deliverables (correct)

- No production rollout
- No viewport frontend switch
- No map rendering changes
- No cluster behavior changes
- No Belgorod listing geo writes (review only)

---

## Recommended next steps

1. **Iter 24** — Viewport listings parity re-baseline post-materialization
2. **Iter 25** — Belgorod EXACT materialization pass (56 rows, preserve coords)
3. **Iter 26** — Production materialization runbook + off-peak execution

---

## Final statement

Iteration 23 proves that real geo materialization works at scale on staging: **76,267 rows in 5.6 minutes**, **zero conflicts**, **full rollback in 4.5 minutes**, and **100% resolver parity** on sample. MSK listings viewport path transitions from dead (`total=0`) to operational (`total=14,888`) — but frontend enablement remains deliberately deferred until parity re-baseline confirms safe rollout.
