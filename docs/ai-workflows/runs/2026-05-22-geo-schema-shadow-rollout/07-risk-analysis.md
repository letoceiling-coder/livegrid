# Iteration 20.7 — Risk Analysis

## Mode

SCHEMA GOVERNANCE · 2026-05-22

---

## Risks mitigated

| Risk | Mitigation | Status |
|---|---|---|
| Accidental backfill | Migration has no UPDATE; probe fails if lineage > 0 | ✓ verified 0 |
| Schema drift (lat/lng) | IF NOT EXISTS in migration | ✓ |
| Production geo semantics change | All columns NULL; no app writes | ✓ |
| Viewport regression | No viewport code changes | ✓ 14/14 checks |
| NOT NULL breakage | All nullable | ✓ |
| UI_ONLY in DB | Not in enum | ✓ probe |

---

## Residual risks

| Risk | Level | Notes |
|---|---|---|
| Staging/prod migration lag | Medium | Deploy migration before Iter 21 materialization |
| Prisma/client version skew | Low | Regenerate after migrate |
| Developer confusion (NULL geo fields) | Low | Documented; resolver shadow explains resolution |
| contract-check latency | Low | DEV-only |

---

## Guards added

1. `shadow_db_lineage_sample` fails if any row has lineage populated
2. Production blocks `/_shadow/lineage-stats`
3. Materialize stub still no-op (Iter 19 preserved)

---

## Unacceptable (blocked)

| Action | Iter 20 |
|---|---|
| UPDATE listings SET geo_* | ✗ not done |
| Materialization job | ✗ not deployed |
| CHECK constraints | ✗ not in migration |
| Viewport enablement | ✗ unchanged |

---

## Safety checklist

- [x] Additive migration only
- [x] Zero row mutations verified
- [x] tsc pass
- [x] 24/24 resolver unit tests pass
- [x] 14/14 contract-check pass
- [x] lineage_populated = 0
- [x] Resolver still pure (no DB in resolveListingGeo)
