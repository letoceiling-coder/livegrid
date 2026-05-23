# Iteration 25.6 — Performance Validation

## Mode

Before/after performance comparison · legacy vs viewport primary · 2026-05-22

---

## Baseline (Iter 24 — API layer)

| Metric | Legacy catalog | Viewport API |
|---|---:|---:|
| Moscow wide total | 14,888 | 14,888 |
| Visible in bbox | 6,533 | 6,533 |
| Query latency | 1,526 ms | **214 ms** |
| Legacy cap in bbox | 125 | — |

---

## Frontend activation impact (expected)

| Metric | Legacy map source | Viewport map source |
|---|---|---|
| Initial catalog fetch | 200 rows (~same) | 200 rows (sidebar only) |
| Map marker count (bbox) | ~125 | **~6,533** |
| Viewport fetch | N/A (unless debug) | ~214 ms per bbox change |
| Cluster rebuild | Small (~125) | **Large (~6,533)** |
| Memory (placemarks) | Low | **~50× higher** |

---

## Observability fields (`map_debug=1`)

| Field | Use |
|---|---|
| `viewportFetchMs` | API round-trip per bbox |
| `viewportRequests` | Fetch count (debounced by bbox signature) |
| `cluster rebuilds` | Rebuild count |
| `lastClusterRebuildMs` | Rebuild duration |
| `markers` | Active marker count |
| `sidebarDomReductionPct` | Sidebar virtualization (unchanged) |

---

## Bbox debounce

`useViewportListingsExperimental` deduplicates via `combinedShadowSignature(bbox, filters)` — identical bbox+filter won't re-fetch.

Pan/zoom changes bbox → new fetch → potential cluster rebuild when viewport data returns.

---

## Before/after comparison

| Area | Legacy | Viewport primary | Delta |
|---|---|---|---|
| Sidebar virtualization | ✓ | ✓ | None |
| Map data transfer | 200 full listing objects | Slim viewport DTOs × N | More markers, smaller per-marker payload |
| Network per pan | 0 (client filter) | ~214 ms API | New cost |
| Render per pan | Client filter 200 | Full rebuild ~6533 | Higher render cost |

**Net:** Viewport wins on catalog semantics and total coverage; frontend render cost increases with marker count. Acceptable for DEV validation; staging needs browser profiling.

---

## Measurement status

| Metric | Status |
|---|---|
| API fetch (214ms) | **Measured** (Iter 24) |
| Cluster rebuild at 6533 | **HOLD** — manual browser |
| Memory usage | **HOLD** — manual browser |
| Viewport fetch frequency | **HOLD** — observe `viewportRequests` in overlay |
