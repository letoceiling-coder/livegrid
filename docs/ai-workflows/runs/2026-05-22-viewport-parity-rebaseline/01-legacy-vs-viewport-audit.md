# Iteration 24.1 — Legacy vs Viewport Audit

## Mode

VIEWPORT VALIDATION · parity re-baseline · 2026-05-22

---

## Pre-materialization state (Iter 16–22)

| Path | MSK listings with coords | Viewport total |
|---|---:|---:|
| Legacy `/listings` | 0 (no listing lat/lng) | — |
| Viewport prototype | 0 | **0** |

Root cause: feed apartments had building FK coords but no denormalized listing lat/lng.

---

## Post-materialization state (Iter 23)

| Path | MSK geo-ready | Moscow bbox visible |
|---|---:|---:|
| Materialized rows (region 1) | 76,267 | — |
| Active published apartments | **14,888** | **6,533** |

Viewport listings path **operational** at API level. Frontend still disabled.

---

## Architecture inspected

| Component | Role | Changed Iter 24? |
|---|---|---|
| `viewport-prototype.service.ts` | Bbox ∩ catalog filters, PostGIS ST_Within | No |
| `listings.service.ts` | Shared `buildCatalogListingWhere` | No |
| `useViewportListingsExperimental.ts` | Shadow fetch + parity recording | No |
| `viewport-shadow-parity.ts` | Client-side overlap math | No |
| `ListingsMapSearch.tsx` | Legacy markers + shadow hook | No |
| `fallbackCoords()` | Client-only approximate coords | **Not removed** |
| `MapDevOverlay` | DEV shadow parity display | No |

---

## New measurement tooling (Iter 24)

| Component | Purpose |
|---|---|
| `ViewportListingsParityService` | Server-side legacy vs viewport comparison |
| `viewport-listings-parity.cli.ts` | `pnpm --filter api viewport:parity` |
| `GET /_prototype/viewport/listings-parity-rebaseline` | DEV endpoint |

---

## Key finding

**Count parity is exact.** Legacy geoTotal === viewport total across all 16 scenario×filter combinations. ID overlap is **100%** when comparing full visible sets (not legacy 200-row page cap).

The remaining gap is **frontend legacy cap artifact** (200 rows), not API semantic divergence.

---

## Iter 23 → Iter 24 delta

| Metric | Iter 23 (pre) | Iter 24 (post) |
|---|---:|---:|
| MSK viewport total | 0 | **14,888** |
| MSK bbox visible | 0 | **6,533** |
| Shadow parity meaningful | No | **Yes** |
| Frontend enabled | No | **No** (intentional) |
