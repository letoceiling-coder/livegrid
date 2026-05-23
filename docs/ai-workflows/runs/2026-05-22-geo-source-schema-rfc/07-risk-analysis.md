# Iteration 18.7 — Risk Analysis

## Mode

DATA PLATFORM RFC · risk register · 2026-05-22

---

## Purpose

Analyze schema and governance risks for geo lineage — extending Iter 17 R1/R2 with persistence-layer failure modes.

---

## Risk register

### R1 — Silent coord promotion (CRITICAL)

| Attribute | Value |
|---|---|
| Description | lat/lng written without geo_source — appears EXACT to consumers |
| Current evidence | 56 listings with coords, no lineage; populate script copies block→listing as MANUAL |
| Schema mitigation | CHECK: coords require geo_source + geo_quality |
| Process mitigation | All writes via GeoResolverService; Prisma middleware |

---

### R2 — Schema drift recurrence (HIGH)

| Attribute | Value |
|---|---|
| Description | listing lat/lng in Prisma but no migration (discovered Iter 18) |
| Impact | Environment parity failure; prod may lack columns |
| Mitigation | Phase 1 migration includes `ADD COLUMN IF NOT EXISTS`; prisma migrate diff in CI |

---

### R3 — Stale inherited coords (HIGH)

| Attribute | Value |
|---|---|
| Description | Block/building feed update moves parent centroid; listing cache stale |
| Impact | Pin at old JK location; geo_entity_id still valid but coords wrong |
| Mitigation | `geo_resolved_at` vs parent `updated_at`; PARENT_UPDATED re-materialization queue |

---

### R4 — Lineage drift SQL vs resolver (HIGH)

| Attribute | Value |
|---|---|
| Description | SQL CASE and TypeScript resolver diverge on precedence |
| Impact | visible count ≠ rendered markers; contract-check failures |
| Mitigation | Shared test suite; 50-ID parity probe in CI; single code owner |

---

### R5 — Partial backfill corruption (CRITICAL)

| Attribute | Value |
|---|---|
| Description | Normalization job stops mid-region; mixed NULL/materialized rows |
| Impact | Viewport returns partial set; inconsistent tier coverage |
| Mitigation | Batch checkpoints; `geo_resolved_at IS NULL` query for completion; region-level transactions |

---

### R6 — UNKNOWN legacy bucket abuse (MEDIUM)

| Attribute | Value |
|---|---|
| Description | Normalization assigns UNKNOWN to all ambiguous rows and never reviews |
| Impact | Permanent low-confidence geo; false trust if UI ignores UNKNOWN |
| Mitigation | UNKNOWN excluded from EXACT UI; review queue; sunset deadline |

---

### R7 — Geocode poisoning (MEDIUM)

| Attribute | Value |
|---|---|
| Description | Bad geocode promoted to GEOCODE_VERIFIED / EXACT |
| Impact | Wrong city/neighborhood; legal/trust risk |
| Mitigation | Match kind gate; region bounding box validation; GEOCODE_APPROXIMATE default |

---

### R8 — Manual override conflicts (MEDIUM)

| Attribute | Value |
|---|---|
| Description | Admin sets EXACT; next normalization job overwrites with BUILDING_INHERIT |
| Impact | Admin work lost; tier downgrade |
| Mitigation | EXACT immune to automatic re-materialization; ADMIN_OVERRIDE locks until cleared |

---

### R9 — Enum/source combo invalid (MEDIUM)

| Attribute | Value |
|---|---|
| Description | BUILDING_INHERIT paired with BLOCK_CENTROID quality |
| Impact | Cluster policy wrong; routing gate wrong |
| Mitigation | VALID_COMBOS matrix; reject at materialize; contract-check |

---

### R10 — Feed import accidental geo write (HIGH)

| Attribute | Value |
|---|---|
| Description | Future developer adds lat/lng to apartment upsert "for convenience" |
| Impact | Silent BLOCK coords as listing coords without lineage |
| Mitigation | Code review rule; linter; feed import integration test asserts geo unchanged |

---

### R11 — GIST index before data quality (MEDIUM)

| Attribute | Value |
|---|---|
| Description | Index created on corrupt/NULL-tier rows |
| Impact | Index bloat; planner chooses bad plan |
| Mitigation | Partial index WHERE geo_quality IN (...); Phase 4 only |

---

### R12 — geo_resolution_version mass invalidation (LOW)

| Attribute | Value |
|---|---|
| Description | Version bump triggers full re-normalize during peak traffic |
| Impact | DB load spike; write contention |
| Mitigation | Off-peak batch; rate limit; read replica for shadow diff first |

---

## Observability requirements (future)

| Metric | Alert |
|---|---|
| `listing.geo.unclassified_count` (lat set, source null) | > 0 after Phase 5 |
| `listing.geo.unknown_count` | decreasing over time |
| `listing.geo.stale_inherit_count` | parent updated > geo_resolved_at |
| `listing.geo.materialization_lag_seconds` | job queue depth |
| `listing.geo.exact_without_audit` | = 0 |
| `listing.geo.resolver_sql_mismatch` | = 0 |

---

## Failure mode summary

| Failure | User impact | Detection |
|---|---|---|
| Promotion without source | Fake exact pin | contract-check |
| Stale inherit | Wrong JK pin | stale detector |
| Partial backfill | Empty/partial map | region completion metric |
| SQL/resolver drift | Count mismatch | parity probe |
| Geocode poison | Wrong neighborhood | region bbox + manual review |

---

## Acceptable residual risk (post-governance)

| Risk | Level | Notes |
|---|---|---|
| Block centroid ≠ unit | Medium | Disclosed via geo_quality |
| 705 units same coord | Medium | Cluster policy |
| UNKNOWN legacy rows | Low | Review queue, bounded count (56) |

---

## Unacceptable risk (block Phase 4+)

| Condition | Action |
|---|---|
| lat/lng without geo_source after Phase 5 | Halt rollout |
| EXACT from BLOCK_INHERIT source combo | Halt — data corruption |
| UI_ONLY in DB | Halt — constraint violation |
| Resolver/SQL mismatch in CI | Block merge |

---

## Legal / trust note

Geo lineage schema supports **auditability** for location claims:

- `ListingGeoEvent` chain answers "why is this pin here?"
- EXACT tier requires attributable source (MANUAL, FEED, GEOCODE)
- Approximate tiers prevent routing/distance claims via DTO flags (Iter 17)

Schema alone does not satisfy legal review — UI disclosure still required (Iter 17 doc 05).
