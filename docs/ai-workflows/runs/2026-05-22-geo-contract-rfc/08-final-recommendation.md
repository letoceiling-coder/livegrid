# Iteration 17.8 — Final Recommendation

## Mode

ARCHITECTURE RFC · foundational contract · 2026-05-22

---

## Verdict

**Adopt the six-tier GEO CONTRACT as a mandatory gate for all future viewport, map, and spatial API work.**

Iteration 16 proved listings viewport *can* work technically. Iteration 17 proves it *must not* ship without formal geo semantics — otherwise approximate coords will be presented as exact at scale (14,917 MSK apartments, 705 per JK).

---

## Foundational contract (summary)

### Six tiers

| Tier | Meaning | Viewport | API |
|---|---|---|---|
| EXACT | Verified unit location | Individual pin | ✓ |
| BUILDING_CENTROID | Building footprint center | Cluster < z15 | ✓ |
| BLOCK_CENTROID | JK center | Cluster < z16 | ✓ |
| APPROXIMATE_UI_ONLY | Client spiral fallback | **Never** | **Never** |
| MISSING | No resolvable geo | Exclude | Count in total only |
| INVALID | Corrupt coords | Exclude | Alert |

Full definitions: `02-geo-tier-definitions.md`

### Five invariants

1. **Tier accompanies every coordinate** in API responses
2. **Tier downgrade only** — never silent promotion to EXACT
3. **APPROXIMATE_UI_ONLY never crosses API boundary**
4. **Cluster policy enforced by tier + zoom + density**
5. **Catalog geo filter remains block-based** (already truth-safe)

---

## Document map

| Doc | Scope |
|---|---|
| 01 | Current truth leakage audit |
| 02 | Canonical tier definitions + resolution algorithm |
| 03 | Future viewport DTO (`geoQuality`, `geoSource`, `geoConfidence`, …) |
| 04 | Clustering policy by tier and density |
| 05 | UI honesty (badges, disclosure, routing gates) |
| 06 | Search/filter spatial participation rules |
| 07 | Risk register + observability metrics |
| 08 | This recommendation |

---

## Immediate actions (no implementation this iteration)

| Priority | Action | Owner track |
|---|---|---|
| P0 | Freeze viewport listings enablement until contract implemented | Engineering |
| P0 | Document GEO CONTRACT in `PROJECT_PLAN.md` / ADR | Architecture |
| P1 | Plan `geo_source` migration RFC (Iter 18) — schema only, no backfill | Data platform |
| P1 | Audit `fallbackCoords` removal plan for secondary map | Frontend |
| P2 | Extend contract-check with geo tier probes | Backend |

---

## Recommended implementation sequence

```
Iter 18 — Schema RFC
  └─ geo_source enum column on listings
  └─ NO backfill

Iter 19 — Server resolver
  └─ resolveListingGeo() shared by SQL + DTO
  └─ catalogListingWhereToSql + bbox CASE

Iter 20 — Viewport v2 contract (shadow)
  └─ geoQuality on markers
  └─ geo meta block
  └─ contract-check geo probes

Iter 21 — Clustering + UI honesty
  └─ tier-aware cluster policy
  └─ GeoApproxBadge + GeoDisclosureLine
  └─ remove fallbackCoords

Iter 22 — Shadow validation + enablement decision
  └─ MSK: visible=6555, approximateShare≈1.0, badges visible
  └─ Go/no-go for production viewport
```

---

## Viewport v2 marker contract (target)

```typescript
{
  lat: number;
  lng: number;
  geoQuality: 'EXACT' | 'BUILDING_CENTROID' | 'BLOCK_CENTROID';
  geoSource: 'LISTING_ROW' | 'BUILDING_GEOMETRY' | 'BLOCK_GEOMETRY';
  geoConfidence: number;
  clusterRequired: boolean;
  minIndividualZoom: number;
  exactDistanceAllowed: boolean;
  routingAllowed: boolean;
}
```

See `03-viewport-contract-rfc.md` for full shape.

---

## UI contract (target)

- Every non-EXACT pin: visible badge + disclosure line
- No routing for BUILDING/BLOCK tiers
- No distance sort for approximate tiers
- Map legend when `anyApproximate === true`
- Remove `fallbackCoords` before viewport launch

See `05-ui-truthfulness-rfc.md`.

---

## Search contract (target)

- Catalog geo filters: **unchanged** (block-based — truth-safe)
- Viewport bbox: resolved server point by tier precedence
- APPROXIMATE_UI_ONLY: excluded from all spatial queries
- Distance sort: EXACT only

See `06-search-filter-geo-rules.md`.

---

## Observability contract (target)

Before enablement, monitor:

- `viewport.geo.approximate_share`
- `viewport.geo.ui_fallback_in_api` (= 0 always)
- `viewport.cluster.max_stack_size`
- Contract-check geo probes passing

See `07-risk-analysis.md`.

---

## What we explicitly reject

| Approach | Why rejected |
|---|---|
| Silent block→listing coord copy | Creates fake EXACT tier |
| Enable viewport on empty listing lat/lng | Already dead; wrong model |
| Port `fallbackCoords` to API | APPROXIMATE_UI_ONLY in API — contract violation |
| Individual pins for all 6,555 MSK apartments at city zoom | Fake precision + unusable |
| Skip geoQuality "to ship faster" | Guarantees R1 fake precision risk |

---

## Relationship to blocks viewport

Blocks viewport is **already contract-compatible** with minor extensions:

- Block markers are **BLOCK_CENTROID by definition**
- Add explicit `geoQuality: 'BLOCK_CENTROID'` in v2 for consistency
- Blocks path needs no normalization program — data is healthy

Listings viewport is the **hard problem** — requires normalization + contract.

---

## Success criteria (GEO CONTRACT complete)

| Criterion | Measurable target |
|---|---|
| API markers include geoQuality | 100% |
| APPROXIMATE_UI_ONLY in API | 0 |
| MSK viewport visible > 0 | ≥ 6,000 |
| approximateShare disclosed in UI | 100% when > 0 |
| BLOCK tier individual pins below z16 | 0 |
| id-fallback retired | confirmed |
| Contract-check geo probes | 8/8 pass |
| fake precision user reports | 0 in shadow period |

---

## Final statement

The GEO CONTRACT is the **foundational architecture** for honest map product at scale. It transforms Iter 16's finding ("coords were never source-of-truth") from a blocker into a **design constraint** with explicit tiers, UI disclosure, and measurable rules.

**Do not implement viewport, backfill, or coord materialization until Iter 18–20 land this contract in code.**

Architecture only — no rollout, no migrations, no API changes in Iteration 17.

---

## Audit metadata

- **Inputs:** Iter 16 audit, codebase inspection (`~/livegrid`), live API probe
- **Constraints honored:** no viewport enablement, no migrations, no backfill, no DTO changes
- **Date:** 2026-05-22
