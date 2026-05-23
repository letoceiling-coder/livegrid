# Iteration 20.4 — Contract-Check Shadow Probes

## Mode

SCHEMA GOVERNANCE · live verification · 2026-05-22

---

## Implementation

| File | Role |
|---|---|
| `geo-resolver-contract-probes.ts` | Pure in-memory probes |
| `viewport-prototype.service.ts` | Wires probes into `runContractChecks()` |
| `geo-shadow-lineage.service.ts` | Read-only DB sample probe |

---

## New probes

| Probe | Assertion |
|---|---|
| `geo_resolver_building_precedence` | BUILDING_INHERIT beats block when both FKs |
| `geo_resolver_invalid_exact_combo` | BLOCK_INHERIT + EXACT → INVALID |
| `geo_resolver_no_ui_only` | GeoSource has 7 values, no UI_ONLY |
| `geo_resolver_deterministic_replay` | serializeResolvedGeo identical ×2 |
| `geo_resolver_shadow_legacy` | Legacy coords → SHADOW_UNCLASSIFIED |
| `shadow_db_lineage_sample` | Read-only sample; `lineage_populated=0` |

Existing viewport probes (8) unchanged.

---

## Live results

```
GET /api/v1/_prototype/viewport/contract-check

TOTAL 14 PASS 14
```

Geo/shadow probe details:

| Probe | Result |
|---|---|
| geo_resolver_building_precedence | ✓ source=BUILDING_INHERIT entityId=200 |
| geo_resolver_invalid_exact_combo | ✓ BLOCK_INHERIT+EXACT rejected |
| geo_resolver_no_ui_only | ✓ sources=7 no UI_ONLY |
| geo_resolver_deterministic_replay | ✓ |
| geo_resolver_shadow_legacy | ✓ suggested=BLOCK_INHERIT/BLOCK_CENTROID |
| shadow_db_lineage_sample | ✓ sample=2000 building=2000 lineage_populated=0 |

---

## shadow_db_lineage_sample guard

Probe **fails** if `lineage_populated > 0` — ensures no accidental backfill.

---

## Module wiring

`ViewportPrototypeModule` imports `GeoModule` for `GeoShadowLineageService` injection.

No viewport SQL or response shape changes.
