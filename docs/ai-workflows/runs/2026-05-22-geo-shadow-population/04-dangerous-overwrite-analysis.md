# Iteration 21.4 — Dangerous Overwrite Analysis

## Mode

SHADOW NORMALIZATION · 2026-05-22

---

## Result

| Metric | Count |
|---|---:|
| DANGEROUS_OVERWRITE | **0** |
| LINEAGE_CONFLICT | **0** |

**No rows flagged for automatic coord replacement.**

---

## Detection mechanisms

### 1. Payload coord mismatch

Compares stored lat/lng against materialize stub payload. Triggers when stub would write different coordinates.

### 2. Inherit hypothetical

For legacy rows (coords present, no lineage):

1. Strip coords and lineage from input
2. Run resolver inherit path
3. Compare inherit lat/lng vs stored lat/lng

If different → DANGEROUS_OVERWRITE (normalization would silently move pin).

---

## Why zero flags in production data

| Population | Behavior |
|---|---|
| 75,998 feed apartments | No listing coords → inherit writes new coords (not overwrite) |
| 416 block-only inherit | Same — no stored coords |
| 56 legacy manual coords | Stub preserves stored coords in payload → SHADOW_UNCLASSIFIED, not overwrite |
| 2,132 missing | No coords to overwrite |

The 56 legacy rows retain their stored coordinates in the stub payload. Classification is `SHADOW_UNCLASSIFIED` (lineage review), not dangerous overwrite — coords are preserved unless human approves reclassification.

---

## Unit test coverage

| Scenario | Classification |
|---|---|
| Legacy coords matching block centroid | SHADOW_UNCLASSIFIED |
| Legacy coords differing from building inherit | DANGEROUS_OVERWRITE |
| Stored entity FK mismatch | LINEAGE_CONFLICT |

---

## Policy

**DANGEROUS_OVERWRITE → automatic NO_GO**

Any future materialization job MUST:

1. Exclude DANGEROUS_OVERWRITE rows from batch
2. Route to manual review queue
3. Never auto-approve coord replacement

---

## Residual risk

Legacy rows classified SHADOW_UNCLASSIFIED may still receive **lineage** writes without coord changes. Future materialization job must support `lineage_only` vs `full_materialize` modes for these 56 rows.
