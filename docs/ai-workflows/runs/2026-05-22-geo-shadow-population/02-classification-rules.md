# Iteration 21.2 — Classification Rules

## Mode

SHADOW NORMALIZATION · 2026-05-22

---

## Classification enum

| Classification | Meaning |
|---|---|
| `WOULD_WRITE_BUILDING` | Stub would materialize BUILDING_INHERIT |
| `WOULD_WRITE_BLOCK` | Stub would materialize BLOCK_INHERIT |
| `EXACT_PRESERVED` | Materialized EXACT — noop, no change |
| `SHADOW_UNCLASSIFIED` | Legacy coords — human review before write |
| `INVALID` | Coordinates fail WGS84 validation |
| `MISSING` | No resolvable geo (no coords, no parent FK) |
| `DANGEROUS_OVERWRITE` | Stored coords would be replaced — **never auto-approve** |
| `LINEAGE_CONFLICT` | Stored lineage contradicts FK or resolver |
| `UNCHANGED` | Stub noop (already materialized, etc.) |
| `EXACT_DOWNGRADE_BLOCKED` | Resolver blocks EXACT downgrade |

---

## Decision order

1. **INVALID** — resolver status INVALID
2. **MISSING** — resolver status MISSING
3. **LINEAGE_CONFLICT** — `geo_entity_id` ≠ FK, or stored lineage ≠ resolver
4. **EXACT_DOWNGRADE_BLOCKED** — stub `STUB_BLOCKED`
5. **EXACT_PRESERVED** — noop + `geoQuality=EXACT`
6. **DANGEROUS_OVERWRITE** — payload coords ≠ stored, OR inherit resolution differs from stored coords
7. **SHADOW_UNCLASSIFIED** — resolver status SHADOW_UNCLASSIFIED
8. **UNCHANGED** — stub noop
9. **WOULD_WRITE_BUILDING / BLOCK** — stub `STUB_WOULD_WRITE` with inherit source

---

## Dangerous overwrite detection

Two paths:

### Path A — payload mismatch

Listing has stored coords. Materialize stub payload lat/lng differs from stored.

### Path B — inherit hypotheticals

Listing has legacy coords (no materialized lineage). Hypothetical inherit resolution (coords stripped) produces different lat/lng than stored.

Example: legacy manual coords `55.999, 37.999` with `building_id` → inherit would write building centroid `55.752, 37.619` → **DANGEROUS_OVERWRITE**.

---

## Lineage conflict detection

- `geo_entity_kind=BUILDING` but `geo_entity_id ≠ building_id`
- `geo_entity_kind=BLOCK` but `geo_entity_id ≠ block_id`
- Stored source/quality/entity differs from resolver RESOLVED output

---

## Exact downgrade

Materialize stub returns `STUB_BLOCKED` with reason `exact_downgrade_forbidden` when stored EXACT would be downgraded to inherit. Classified as `EXACT_DOWNGRADE_BLOCKED` — expected safety behavior.

---

## Building precedence

When both `building_id` and `block_id` present with parent coords, classification resolves to `WOULD_WRITE_BUILDING` (matches Iter 19 resolver).

---

## Legacy shadow (56 rows globally)

Coords present, no lineage → `SHADOW_UNCLASSIFIED`. Stub reason: `legacy_classification_requires_review`. Requires human sign-off before real materialization.
