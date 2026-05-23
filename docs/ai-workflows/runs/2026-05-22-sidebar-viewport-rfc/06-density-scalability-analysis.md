# Iteration 12.6 — Density & Scalability Analysis

## Mode

Measured estimates + scenario modeling · region 1 (Moscow) · local snapshot 2026-05-22

**Dataset reference (map perf audit):** 1336 blocks, 23044 listings, 359 active blocks with listings

---

## Scenario matrix

| Scenario | Zoom | Filters | Legacy loaded | Legacy in bbox | Viewport count | Source |
|---|---|---|---|---|---|---|
| Region overview | ~11 | none | 200 | 101 | **181** | Iter 10 |
| Downtown pan | ~14 | none | 200 | est. 40–80 | est. 60–120 | extrapolated |
| Street level | ~16 | none | 200 | est. 5–25 | est. 5–30 | extrapolated |
| Geo radius 5 km | ~11 | geo | 200 | 33 | **33** | Iter 10 measured |
| District | ~11 | district | 200 | 3 | **3** | Iter 10 measured |
| Price 5–15M | ~11 | price | 200 | 34 | **34** | Iter 10 measured |
| Rooms = 2 | ~11 | rooms | 200 | 97 | **140** | Iter 10 measured |
| Listings apartments | ~11 | none | 200 | sparse coords | **0** | Iter 10 measured |

---

## Density metrics (Iter 10, Moscow bbox)

```
Bbox area ≈ (55.9-55.6) × (37.9-37.4) = 0.3 × 0.5 = 0.15 deg²

Legacy in bbox:  101 → 673 / deg² (rounded)
Viewport:        181 → 1207 / deg²
Legacy page cap: 200 total loaded, 101 visible = 50.5% visible ratio
```

Shadow parity fields track this:

- `shadowVisibleRatio` = legacyInBbox / legacyTotal
- `shadowLegacyDensity` / `shadowViewportDensity` per deg²

---

## Scalability by layer

### Map markers (legacy production)

| Count | Cluster behavior | Rebuild cost |
|---|---|---|
| 200 | Yandex cluster groups | ~full rebuild on data change |
| 500 (viewport cap) | Heavier cluster | Iter 11 shadow: acceptable DEV-only |
| 1000+ | **Unsafe** without server cluster or tiling | Not tested — avoid |

**Zoom mode transition** (dot → price label at z12) triggers signature rebuild for **all** markers.

### Sidebar rows

| Count | DOM nodes | Images | Verdict |
|---|---|---|---|
| ≤ 50 | OK | Lazy load OK | Current OK |
| 51–200 | Heavy | 200 requests | **Needs virtualization** |
| 200–500 | **Critical** | Storm | Virtualization + lazy required |
| 500+ | Unacceptable | — | Paginate within bbox |

### React render pressure

| Trigger | Components affected |
|---|---|
| Filter change | `RedesignMap` + full sidebar map + cluster rebuild |
| Selection | Row className + marker icon (isolated) |
| Bbox change (viewport) | Shadow hook only today; future: sidebar list |
| Zoom mode | All marker descriptors rebuild |

**200-row sidebar:** ~200 `StableMediaFrame` + button trees per filter change.

### Memory

| Payload | Size (measured) |
|---|---|
| 200 blocks JSON | ~900 KB gzip, ~2 MB raw |
| Viewport 181 markers | smaller (minimal fields) |
| 200 listing cards | ~370 KB |

Viewport marker shape is lighter — favorable for map-driven architecture.

---

## Downtown Moscow modeling

At zoom 14 in central bbox (~0.02 deg²):

| Estimate | Calculation |
|---|---|
| Raw density | 1207 × 0.02 ≈ **24 markers** |
| With cap 500 | Unlikely hit |
| Sidebar | Virtualized list ~24 rows — fine |

At zoom 11 full region (0.15 deg²):

| Estimate | Value |
|---|---|
| Viewport (no filter) | **181** (measured) |
| Sidebar without virtualization | **Borderline** |
| With filters | Often < 50 — OK |

**Worst case:** zoom 11, weak filters, listings mode with coords fixed → could approach 500 cap. UI must show «500+ в области».

---

## Cluster rebuild interaction

From `useMapClusterLayer`:

| Event | Rebuild scope |
|---|---|
| `complexes` reference change | Full cluster |
| Zoom mode dot ↔ label | Full cluster |
| `activeSlug` change | Icon swap only |
| Viewport shadow data change | Separate shadow cluster (Iter 11) |

**Future viewport production markers:** decouple marker dataset from sidebar catalog dataset to avoid double rebuild on filter + bbox simultaneous change.

Recommended: **single viewport fetch** feeds both markers and «В области» sidebar from same cached result.

---

## API timing (measured Iter 10)

| Scenario | Legacy ms | Viewport ms |
|---|---|---|
| No filters | 258 | 210 |
| Geo 5 km | 88 | 48 |
| District | 76 | 90 |

Viewport comparable or faster for filtered queries. Bbox COUNT query (future) should target < 50 ms warm.

---

## Index / PostGIS notes

Map perf audit: geo radius uses seq scan 29.7 ms on 1336 blocks — acceptable now.

At scale:

- Bbox envelope query + catalog filter AND — verify composite plan (Iter 10 performance doc)
- GIST on blocks geography — index not used with current cast pattern

Not a sidebar RFC blocker at current scale; monitor if viewport becomes default.

---

## Virtualization necessity threshold

| Sidebar source | Threshold | Action |
|---|---|---|
| Catalog page-1 | **Now** (200 rows) | Virtualize immediately in Phase 1 |
| Viewport bbox | > 30 rows | Virtualize in list panel |
| Infinite catalog | Always | Virtualize + infinite scroll |

---

## Request storm model

Rapid pan (10 moves in 5 s):

| Path | Requests |
|---|---|
| Current legacy | 0 (no bbox fetch) |
| Viewport shadow | ~2–3 (debounce + epsilon) |
| Future viewport sidebar | Same + must not duplicate marker fetch |

**Rule:** one viewport query serves markers + sidebar + count.

---

## Honest limits

| Limit | Value | UX implication |
|---|---|---|
| Prototype LIMIT | 500 | Cannot represent > 500 in bbox honestly |
| Legacy PER_PAGE | 200 | 44% blocks invisible |
| Listings total | 14 917 | Catalog tab must paginate |
| VIEWPORT_MIN_ZOOM | 10 | Below z10: fall back to catalog |

---

## Conclusion

Viewport architecture **scales better spatially** (181 bbox vs 200 global cap) but requires **virtualization**, **500-cap disclosure**, and **unified fetch** for markers + sidebar. Downtown/street zoom naturally reduces counts; region zoom with weak filters is the stress case. Listings mode remains blocked until coords complete.
