# Iteration 16.7 — Risk Analysis

## Mode

DATA PLATFORM AUDIT · evidence-based · 2026-05-22

---

## Risk register

### R1 — Zero listing coords in primary region (CRITICAL)

| Attribute | Value |
|---|---|
| Evidence | 0 / 14,917 MSK active apartments have `lat`/`lng`; FEED 0 / 78,540 |
| Impact | Listings viewport returns empty; any feature depending on listing point is dead |
| Likelihood | **Certain** (already happening) |
| Mitigation | Geo normalization policy + SQL path via block/building join |

---

### R2 — ID-fallback scalability bomb (CRITICAL)

| Attribute | Value |
|---|---|
| Evidence | `findListingsInViewport` does `findMany({ select: id })` on all geo-qualified listings, then `IN (...)` |
| Impact | O(n) memory + query per pan; 15k–78k IDs in Node; PG plan degradation |
| Likelihood | **Certain** if coords backfilled without SQL rewrite |
| Mitigation | Abandon id-fallback; implement `catalogListingWhereToSql` + single-pass bbox SQL |

---

### R3 — Block-centroid marker stacking (HIGH)

| Attribute | Value |
|---|---|
| Evidence | 705 apartments share exact block point (ЗилАрт); 10 blocks have > 50 units at one coord |
| Impact | Pin-per-listing viewport misleads users; click targets overlap; false precision |
| Likelihood | **Certain** with block-join path |
| Mitigation | Mandatory server-side clustering; `geoQuality: BLOCK_CENTROID` in response; never claim unit-level geo |

---

### R4 — Building vs block coord divergence (MEDIUM)

| Attribute | Value |
|---|---|
| Evidence | 100% of listings with `building_id` have building coords ≠ block coords |
| Impact | Using block centroid when building available degrades accuracy by 50–500 m within large JK |
| Likelihood | **Certain** if normalization picks block over building |
| Mitigation | Prefer building centroid when `building_id` present; document precision limits |

---

### R5 — Frontend inferred coords conflated with real geo (HIGH)

| Attribute | Value |
|---|---|
| Evidence | `fallbackCoords()` in `RedesignMap.tsx` / `RedesignCatalog.tsx` generates spiral offsets |
| Impact | Secondary listings appear placed on map with no geo basis; audit confusion |
| Likelihood | Active in production UI for secondary market |
| Mitigation | Label as approximate in UI; never port to API; exclude from viewport |

---

### R6 — Missing SQL translator for listings (HIGH)

| Attribute | Value |
|---|---|
| Evidence | `catalogBlockWhereToSql` exists; no listing equivalent; apartment sub-filters require JOINs |
| Impact | Cannot achieve blocks-style filter+bbox parity in one SQL query |
| Likelihood | **Certain** until built |
| Mitigation | Dedicated Iter N: `catalogListingWhereToSql` with apartment JOIN support |

---

### R7 — No listing geo index (MEDIUM)

| Attribute | Value |
|---|---|
| Evidence | `blocks_geo_gist_idx` only spatial index; listings lat/lng unindexed |
| Impact | Direct listing bbox queries seq-scan 78k rows (13 ms today with 0 results; seconds at scale) |
| Likelihood | Triggers on any direct-point path |
| Mitigation | GIST on normalized listing point AFTER backfill; or use block-join leveraging existing index |

---

### R8 — Catalog/viewport geo model split (HIGH)

| Attribute | Value |
|---|---|
| Evidence | Catalog geo filter uses `blockId IN geoIds`; viewport uses `listings.lat/lng` |
| Impact | Architectural inconsistency; viewport cannot reuse catalog geo investment |
| Likelihood | **Certain** today |
| Mitigation | Unify on block-join or normalized listing point with shared bbox SQL |

---

### R9 — Silent backfill creates false EXACT tier (MEDIUM)

| Attribute | Value |
|---|---|
| Evidence | `populate-local-map-data.ts` copies block→listing coords for dev |
| Impact | If copied to prod import without `geoQuality`, centroids appear as exact pins |
| Likelihood | Possible if rushed fix |
| Mitigation | Require `geo_source` column; never copy silently in feed import |

---

### R10 — PostGIS dependency on managed DB (LOW)

| Attribute | Value |
|---|---|
| Evidence | Migration creates extension; geo-spatial.service catches failure gracefully |
| Impact | Geo filters silently skipped if extension missing |
| Likelihood | Low on current infra (3.6.3 confirmed local) |
| Mitigation | Health check for PostGIS; fail loud in staging |

---

## Risk heat map

```
Impact ↑
  CRITICAL │ R1 R2          │
  HIGH     │ R3 R5 R6 R8    │
  MEDIUM   │ R4 R7 R9       │
  LOW      │ R10            │
           └────────────────→ Likelihood
             Low    Certain
```

---

## What enabling viewport today would cause

| Scenario | Outcome |
|---|---|
| Enable as-is (listing.lat/lng) | Empty map in Moscow; contract works but useless |
| Backfill block coords to listing.lat/lng + enable id-fallback | Non-empty map; **OOM/latency** on pan; stacked pins |
| Block-join SQL + clustering + geoQuality | **Viable shadow** — honest approximate viewport |
| Wait for unit-level geo from feed | **Indefinite block** — feed has no apartment geometry |

---

## Audit constraints honored

| Constraint | Status |
|---|---|
| No production backfill | ✓ |
| No DB modification | ✓ |
| No viewport enablement | ✓ |
| No fake coordinates | ✓ |
| Evidence-based | ✓ measured counts + EXPLAIN + live API |
