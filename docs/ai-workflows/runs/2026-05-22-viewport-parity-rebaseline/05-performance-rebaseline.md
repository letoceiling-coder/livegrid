# Iteration 24.5 — Performance Re-Baseline

## Mode

VIEWPORT VALIDATION · measured · 2026-05-22

---

## Before/after materialization (Iter 23 baseline)

| Metric | Pre-Iter 23 | Post-Iter 23/24 |
|---|---:|---:|
| MSK listings with coords | 0 | **14,888** |
| Viewport query useful | No | **Yes** |
| Viewport total | 0 | 14,888 |
| Payload (markers) | 0 bytes | ~40 KB (500 markers) |

---

## Query latency (m Moscow wide, no filters)

| Path | Latency | Notes |
|---|---:|---|
| Legacy (full parity scan) | **1,526 ms** | Includes ID fetch + bbox SQL |
| Viewport prototype | **214 ms** | PostGIS bbox + limit 500 |
| Speedup | **7.1×** | Viewport faster |

---

## Filter scenario latency

| Scenario | Legacy ms | Viewport ms |
|---|---:|---:|
| moscow_wide / none | 1,526 | 214 |
| moscow_wide / rooms_2 | 4,640 | 184 |
| moscow_center_tight | 164 | 252 |
| geo_radius_5km | 708 | 47 |

Viewport consistently faster for bbox-constrained queries.

---

## Payload size

| Path | Estimate |
|---|---:|
| Legacy page (200 full cards) | ~24 KB (cap) |
| Viewport (500 markers) | ~40 KB |
| Viewport (59 markers, tight bbox) | ~4.7 KB |

Viewport payload is **marker-only** (id, lat, lng, price, title) — smaller per row than full listing cards.

---

## Cluster rebuild / scroll

Not measured (frontend unchanged). Expected improvement: viewport fetches bbox-scoped data vs client-filtering 200 global rows.

---

## Performance verdict

| Area | Status |
|---|---|
| Viewport query latency | **GO** — 7× faster moscow_wide |
| Payload efficiency | **GO** — marker-only DTO |
| Legacy catalog scan | **HOLD** — 200 cap limits usefulness |
| Scale at 14k+ listings | **GO** — viewport bbox-scoped |

---

## Recommendation

Replace legacy 200-row map fetch with viewport API for map layer when enabling frontend — eliminates cap artifact and improves latency.
