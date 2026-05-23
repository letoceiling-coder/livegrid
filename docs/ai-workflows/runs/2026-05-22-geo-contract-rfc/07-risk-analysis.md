# Iteration 17.7 — Risk Analysis

## Mode

ARCHITECTURE RFC · risk register · 2026-05-22

---

## Purpose

Analyze risks of fake precision, silent inheritance, and geo contract violations — with mitigations tied to the tier model.

---

## Risk register

### R1 — Fake precision (CRITICAL)

| Attribute | Value |
|---|---|
| Description | User believes apartment pin shows exact unit location when it is block/building centroid or UI spiral |
| Current evidence | `fallbackCoords()` in production; apartment detail uses JK centroid; viewport DTO has bare lat/lng |
| Impact | Trust erosion, wrong purchase decisions, potential legal exposure for location claims |
| Likelihood | **Active today** for secondary market map |
| Mitigation | GEO CONTRACT tiers + UI badges; remove APPROXIMATE_UI_ONLY; viewport geoQuality mandatory |

---

### R2 — Silent coord inheritance (CRITICAL)

| Attribute | Value |
|---|---|
| Description | Backfill or import copies block→listing lat/lng without geo_source, appearing EXACT |
| Current evidence | `populate-local-map-data.ts` copies block coords (dev only); no prod backfill yet |
| Impact | 14,917 MSK listings would look individually precise; 705 stacked at one point |
| Likelihood | **High** if viewport rushed without contract |
| Mitigation | Require `geo_source` column before any materialization; tier in API; contract-check asserts |

---

### R3 — Cluster collapse / pin explosion (HIGH)

| Attribute | Value |
|---|---|
| Description | Wrong cluster policy shows 705 individual pins OR collapses EXACT into JK cluster |
| Impact | Unusable map or hidden listings |
| Likelihood | **Certain** at MSK scale without tier policy |
| Mitigation | `04-clustering-policy-rfc.md`; server-side pre-aggregation above density 500 |

---

### R4 — Misleading routing (HIGH)

| Attribute | Value |
|---|---|
| Description | User navigates to block centroid thinking it is apartment entrance |
| Current evidence | No routing button today; Yandex map click may trigger OS routing externally |
| Impact | User arrives at wrong location |
| Likelihood | Medium when routing added |
| Mitigation | `routingAllowed: false` on non-EXACT; disable route button in UI |

---

### R5 — Legal / location trust (MEDIUM–HIGH)

| Attribute | Value |
|---|---|
| Description | Real estate advertising regulations may require accurate location representation |
| Impact | Compliance risk in RU market for misleading object location |
| Likelihood | Context-dependent |
| Mitigation | GeoDisclosureLine on all approximate surfaces; audit trail via geo_source; legal review of copy |

---

### R6 — Catalog/viewport semantic split (HIGH)

| Attribute | Value |
|---|---|
| Description | Catalog geo filter (block-based) vs viewport bbox (listing-point) return inconsistent sets |
| Current evidence | Catalog finds JK in zone; viewport finds 0 listings (no listing coords) |
| Impact | User confusion when sidebar count ≠ map markers |
| Likelihood | **Certain** until unified resolution |
| Mitigation | Same CASE resolution in catalog bbox + viewport; document total/visible split |

---

### R7 — visibleExact naming confusion (LOW)

| Attribute | Value |
|---|---|
| Description | `visibleExact` sounds like coordinate precision; means count accuracy |
| Impact | Engineer misimplements contract |
| Likelihood | Medium |
| Mitigation | Rename to `countExact` in v2 contract |

---

### R8 — Geocode false EXACT (MEDIUM)

| Attribute | Value |
|---|---|
| Description | `ListingLocationMap` geocodes address to wrong house; treated as precise |
| Impact | Detail page shows wrong pin confidently |
| Likelihood | Medium for ambiguous addresses |
| Mitigation | Match quality score; downgrade to BUILDING_CENTROID if kind≠house; show disclosure |

---

### R9 — Analytics spatial bias (MEDIUM)

| Attribute | Value |
|---|---|
| Description | Aggregating BLOCK_CENTROID pins as point data inflates density at JK locations |
| Impact | Wrong heatmaps, wrong "popular area" insights |
| Likelihood | Future analytics work |
| Mitigation | Separate analytics grids per tier; weight by geoConfidence |

---

### R10 — Contract drift (MEDIUM)

| Attribute | Value |
|---|---|
| Description | SQL path uses block join; DTO resolver uses building; counts diverge |
| Impact | visible count mismatch between meta and rendered markers |
| Likelihood | Medium during parallel implementation |
| Mitigation | Single shared `resolveListingGeo()` used by SQL CASE and DTO mapper |

---

## Observability RFC (future metrics)

Operational visibility required before viewport enablement:

### Marker composition gauges

| Metric | Type | Alert threshold |
|---|---|---|
| `viewport.geo.exact_pct` | gauge | Informational |
| `viewport.geo.building_centroid_pct` | gauge | > 0 expected for MSK |
| `viewport.geo.block_centroid_pct` | gauge | Informational |
| `viewport.geo.missing_pct` | gauge | > 5% of catalog |
| `viewport.geo.approximate_ui_only_count` | counter | **> 0 = contract violation** |

### Density metrics

| Metric | Type | Use |
|---|---|---|
| `viewport.cluster.cells_returned` | histogram | Pre-aggregation effectiveness |
| `viewport.cluster.max_stack_size` | gauge | Max listings per geoEntityId |
| `viewport.density` | gauge | Already in meta — export to metrics |

### Fake precision detection

| Metric | Type | Trigger |
|---|---|---|
| `viewport.geo.tier_lat_lng_mismatch` | counter | lat/lng on marker ≠ resolved entity coords |
| `viewport.geo.exact_without_source` | counter | EXACT tier but no geo_source |
| `viewport.geo.ui_fallback_in_api` | counter | geoConfidence < 0.10 in API response |

### Contract-check automation

Extend `/_prototype/viewport/contract-check`:

```
geo_tier_present          — all markers have geoQuality
no_exact_moscow_feed      — MSK FEED apartments ≠ EXACT
approximate_share_honest  — MSK approximateShare > 0.95
cluster_required_valid    — flags match zoom
missing_excluded          — excludedMissing + visible ≤ total
```

Run in CI against `lg_development` mirror.

### Dashboard panels (proposed)

1. **Geo tier pie** — exact / building / block / missing for visible set
2. **Stack histogram** — listings per geoEntityId (detect ZilАрт spikes)
3. **Contract violations** — ui_fallback_in_api should always be 0

---

## Risk heat map

```
Impact ↑
  CRITICAL │ R1 R2
  HIGH     │ R3 R4 R6
  MEDIUM   │ R5 R8 R9 R10
  LOW      │ R7
           └────────────────→ Likelihood
             Low         Active/Certain
```

---

## Acceptable residual risk (post-contract)

| Risk | Residual level | Acceptance |
|---|---|---|
| Block centroid ≠ unit | Medium | Disclosed via badge; user understands JK-level |
| Building centroid ±20 m | Low | Disclosed; sufficient for new-build catalog |
| No pin for MISSING secondary | Low | Sidebar-only; honest |
| Cluster at city zoom | None | Expected UX |

---

## Unacceptable risk (block enablement)

| Condition | Action |
|---|---|
| APPROXIMATE_UI_ONLY in viewport API | **Block release** |
| EXACT tier without geo_source | **Block release** |
| Individual BLOCK pins at z<16 for apartments | **Block release** |
| approximateShare > 0 without UI badge | **Block release** |
| id-fallback query path | **Block release** |
