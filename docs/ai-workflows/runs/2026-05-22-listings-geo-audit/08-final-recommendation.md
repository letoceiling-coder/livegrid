# Iteration 16.8 — Final Recommendation

## Mode

DATA PLATFORM AUDIT · final verdict · 2026-05-22

---

## Verdict

### Is LISTINGS VIEWPORT ARCHITECTURE production-viable today?

**No.**

The viewport prototype is **fundamentally constrained by data model mismatch**, not by missing feed data or broken PostGIS:

| Layer | Status |
|---|---|
| Blocks viewport | ✓ Contract-ready, SQL parity, GIST-backed, measured 212 ms |
| Listings viewport (current) | ✗ **Dead in Moscow** — 0 coords on listing rows |
| Listings viewport (architecture) | ✗ **Not scalable** — id-fallback O(n) ID scan |

This is **not a quick fix**. It requires an explicit geo normalization program before viewport enablement.

---

## Evidence summary

| Fact | Measurement |
|---|---:|
| Listings with lat/lng | 56 / 78,602 (0.07%) |
| FEED listings with coords | 0 / 78,540 |
| MSK active apartments with listing coords | 0 / 14,917 |
| MSK apartments resolvable via block FK | 14,917 / 14,917 |
| MSK bbox count via block join | 6,555 |
| Blocks with coords (region 1) | 1,336 / 1,336 |
| Listings viewport live (MSK bbox) | total=0, visible=0 |
| Block-join bbox EXPLAIN | 0.77 ms |
| Id-fallback EXPLAIN (listing direct) | 13.9 ms seq scan, 0 rows |

---

## Root cause (one sentence)

**Import pipeline and PROJECT_PLAN design resolve apartment geo via `block_id` JOIN at read time; viewport prototype queries denormalized `listings.lat/lng` which were never populated.**

---

## Path forward (recommended sequence)

### Phase 0 — Do NOT enable (current state)

Keep listings viewport shadow-only. Do not switch frontend source. Do not backfill production.

### Phase 1 — Geo normalization RFC (next iteration)

Decision required:

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Read-time JOIN** | Viewport SQL joins blocks/buildings; no listing.lat/lng write | No backfill; works today | Approximate; complex SQL |
| **B. Materialized normalize** | Add `geo_source` + populate lat/lng from building→block chain | Indexable; simpler bbox SQL | Migration + backfill job |
| **C. Hybrid** | Materialize with quality tier; viewport reads listing point + geoQuality | Best contract; honest UX | Most work |

**Recommendation: Option C (hybrid)** — aligns with blocks viewport patterns and data quality matrix.

Normalization precedence:
```
EXACT (manual lat/lng)
  → BUILDING_CENTROID (buildings.latitude/longitude)
    → BLOCK_CENTROID (blocks.latitude/longitude)
      → MISSING (exclude)
```

Never materialize INFERRED tier.

### Phase 2 — SQL translator

Build `catalogListingWhereToSql()` mirroring blocks Iter 10 parity:
- Region, kind, status, published, price
- Apartment sub-filters via `listing_apartments` JOIN
- Geo preset/radius via block GIST (reuse `resolveGeoBlockIds` → `block_id IN`)
- Compose: `catalogSql AND bboxSql` (same as blocks)

Retire id-fallback path entirely.

### Phase 3 — Index + clustering

| Item | Action |
|---|---|
| GIST on normalized listing point | After materialization |
| Server-side cluster in viewport response | Required for BLOCK_CENTROID density |
| `geoQuality` in marker DTO | Contract extension |

### Phase 4 — Shadow validation

Re-run Iter 10-style filter parity + Iter 15 contract-check with block-join/materialized path. Target:
- MSK bbox visible > 0
- total ≥ visible ≥ returned invariant
- latency < 500 ms p95
- cursor overlap = 0

### Phase 5 — Production enablement (future, explicit approval)

Only after Phases 1–4 pass with `geoQuality` exposed and clustering live.

---

## What blocks viewport proves

The platform **can** do geo viewport correctly:
- PostGIS 3.6.3 operational
- GIST index performs (< 2 ms)
- Catalog+bbox SQL composition works
- Contract meta (total/visible/cursor) validated

Listings viewport failure is **data binding**, not platform incapability.

---

## Honest answers to audit questions

| Question | Answer |
|---|---|
| Can listings viewport EVER scale safely? | **Yes**, after geo normalization + SQL translator + clustering — not on current id-fallback |
| Are blocks coords the fallback? | They are the **designed source** per feed mapping; not copied to listings |
| Is geo enrichment broken? | **No** — blocks/buildings 100% geocoded |
| Do feeds contain apartment coords? | **No** — 41 fields, no geometry |
| Is SQL translator feasible? | **Yes**, medium effort; harder than blocks due to apartment JOINs |
| Is pagination viable? | **Yes**, with keyset cursor on single SQL path |
| PostGIS ready? | **Yes** for block-join; needs listing GIST if direct point |

---

## Iteration 16 deliverables

| Doc | Content |
|---|---|
| 01 | Current geo state + live API proof |
| 02 | Coordinate quality measurements |
| 03 | Import pipeline root cause |
| 04 | SQL feasibility + scalability |
| 05 | PostGIS EXPLAIN evidence |
| 06 | Data quality matrix |
| 07 | Risk register |
| 08 | This recommendation |

---

## Final statement

**LISTINGS VIEWPORT ARCHITECTURE is not production-viable today** because listing-level coordinates were never populated and the prototype uses a non-scalable id-fallback query path.

**It CAN become viable** if the team treats this as a **data platform geo normalization program** (materialize + quality tier + SQL translator + clustering), not as a viewport feature flag.

Do not enable listings viewport until Phase 4 shadow validation passes with non-zero Moscow coverage and honest `geoQuality` metadata.

---

## Audit metadata

- **Database:** `lg_development` @ localhost:5432
- **Date:** 2026-05-22
- **Constraints honored:** no backfill, no migration, no viewport enablement, no fake coords
- **Measurements:** Prisma raw SQL + EXPLAIN ANALYZE + live API probe
