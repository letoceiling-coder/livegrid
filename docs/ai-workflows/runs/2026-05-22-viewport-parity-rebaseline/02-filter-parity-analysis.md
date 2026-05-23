# Iteration 24.2 — Filter Parity Analysis

## Mode

VIEWPORT VALIDATION · measured · 2026-05-22

---

## Methodology

16 scenarios: 4 bbox × 4 filter combinations. Compare legacy catalog counts vs viewport meta using shared `buildCatalogListingWhere`.

---

## Summary

| Check | Result |
|---|---|
| allTotalMatch | **true** (16/16) |
| allVisibleMatch | **true** (16/16) |
| totalDelta | **0** across all scenarios |

---

## Moscow wide — filter matrix

| Filter | Legacy geoTotal | Viewport total | Visible | Parity % |
|---|---:|---:|---:|---:|
| none | 14,888 | 14,888 | 6,533 | **100** |
| rooms_2 | 5,699 | 5,699 | 2,388 | **100** |
| price_5–15M | 3,842 | 3,842 | 1,654 | **100** |
| geo_radius_5km | 421 | 421 | 421 | **100** |

---

## Filter types verified

| Filter | Parity | Notes |
|---|---|---|
| rooms | ✓ | Room type resolution via shared where |
| price_min/max | ✓ | Decimal filter identical |
| geo_radius (ST_DWithin blocks) | ✓ | 421 listings in 5km radius |
| district/builder/search | ✓ (via shared builder) | Same code path |

---

## Acceptable thresholds

| Threshold | Target | Measured |
|---|---|---|
| totalDelta | 0 | **0** |
| visibleDelta | 0 | **0** |
| idOverlapPct (full set) | ≥ 98% | **100%** (non-empty bboxes) |

---

## Legacy cap artifact (frontend only)

| Metric | Legacy page (cap 200) | Full catalog |
|---|---:|---:|
| moscow_wide in bbox | 125 markers | 6,533 |
| rooms_2 in bbox | 103 markers | 2,388 |

Shadow overlay comparing 200-row legacy page to viewport will show **low parity %** — expected artifact, not filter bug.

Server-side full-set comparison: **100% overlap**.

---

## Verdict

**Filter parity: PASS** — shared where builder produces identical counts for all tested filters.
