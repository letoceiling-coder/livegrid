# Iteration 12.7 — Architecture Options

## Comparison of four paths

All options assume **filter parity** (Iter 10 ✓) and **shadow validation** (Iter 9–11 ✓). None are implemented in Iter 12.

---

## Option A — Catalog-first sidebar (current + polish)

### Architecture

```
React Query → GET /blocks|listings?page=1&per_page=200
     ├─→ Legacy map cluster (all 200)
     └─→ Sidebar (all 200)
Viewport prototype → metrics only
```

### Changes from today

- Virtualize sidebar (200 rows)
- Fix subtitle copy («200 из 359 на карте»)
- Optional: infinite scroll for sidebar «load more»
- Display `FilterSidebar.totalCount`

### Matrix

| Criterion | Score | Notes |
|---|---|---|
| Map/list coherence | ⭐ | 80+ extras in bbox (Iter 10) |
| Engineering effort | ⭐⭐⭐⭐⭐ | Minimal |
| Rollout risk | ⭐⭐⭐⭐⭐ | Lowest |
| Catalog discovery | ⭐⭐⭐⭐ | Good with infinite scroll |
| Viewport readiness | ⭐ | Does not advance |
| Mobile UX | ⭐⭐⭐ | Virtualization helps |
| Count honesty | ⭐⭐ | Gap shown but map overstates |
| Performance | ⭐⭐⭐ | 900 KB initial payload |

### When to choose

Stay here if viewport render delayed 6+ months. Accept known bbox mismatch.

---

## Option B — Viewport-first sidebar

### Architecture

```
useMapBbox → GET /_prototype/*/viewport?bbox+filters
     ├─→ Map cluster (viewport markers)
     └─→ Sidebar (same viewport data)
Legacy fetch → removed from map path
```

### Matrix

| Criterion | Score | Notes |
|---|---|---|
| Map/list coherence | ⭐⭐⭐⭐⭐ | Best |
| Engineering effort | ⭐⭐ | Major refactor |
| Rollout risk | ⭐ | High — all-or-nothing |
| Catalog discovery | ⭐ | 14k listings unreachable |
| Viewport readiness | ⭐⭐⭐⭐⭐ | Full commit |
| Mobile UX | ⭐⭐ | List churn on pan |
| Count honesty | ⭐⭐⭐⭐ | Spatial honest; catalog lost |
| Performance | ⭐⭐⭐⭐ | Smaller bbox payloads |

### Blockers

- No sort/cursor on viewport API
- No `meta.count` without full fetch
- Listings coords sparse
- Selection orphan on pan
- 500 cap at region zoom

### When to choose

**Not recommended** as sole architecture for LiveGrid catalog scale.

---

## Option C — Hybrid (viewport map + catalog sidebar)

### Architecture

```
                    ┌─ Viewport fetch (bbox+filters)
                    │    ├─→ Map markers (future)
                    │    └─→ Sidebar tab «В области»
Catalog fetch ──────┴─→ Sidebar tab «Все» (infinite scroll)
Filter meta.total ────→ Filter panel header
```

### Phased rollout

| Phase | Map | Sidebar |
|---|---|---|
| C0 | Legacy 200 | Legacy 200 (virtualized) |
| C1 | Legacy + shadow | + «В области» tab (flag) |
| C2 | Viewport render (flag) | Default «В области» |
| C3 | Viewport default | Both tabs production |

### Matrix

| Criterion | Score | Notes |
|---|---|---|
| Map/list coherence | ⭐⭐⭐⭐ | When on viewport tab |
| Engineering effort | ⭐⭐⭐ | Moderate phased |
| Rollout risk | ⭐⭐⭐⭐ | Feature flags per phase |
| Catalog discovery | ⭐⭐⭐⭐⭐ | «Все» tab |
| Viewport readiness | ⭐⭐⭐⭐ | Natural migration |
| Mobile UX | ⭐⭐⭐⭐ | Map/list toggle + tabs |
| Count honesty | ⭐⭐⭐⭐⭐ | Dual counts |
| Performance | ⭐⭐⭐⭐ | Split payloads |

### Dependencies

- Viewport API: count + cursor + sort
- `useMapSelection` controller
- Sidebar virtualization
- Unified viewport cache (markers + list)

### When to choose

**Recommended default path** for LiveGrid.

---

## Option D — Viewport sidebar + lazy details

### Architecture

Extends Option C «В области» tab:

```
Viewport fetch → minimal rows { id, slug, lat, lng, priceFrom, thumb? }
Row visible or selected → GET /blocks/:slug (detail)
Virtualized list only
Map uses same minimal marker set
```

### Matrix

| Criterion | Score | Notes |
|---|---|---|
| Map/list coherence | ⭐⭐⭐⭐⭐ | Same IDs |
| Engineering effort | ⭐⭐ | Detail fetch plumbing |
| Rollout risk | ⭐⭐⭐ | Extra loading states |
| Catalog discovery | ⭐⭐⭐⭐ | Via «Все» tab (same as C) |
| Viewport readiness | ⭐⭐⭐⭐⭐ | Optimal payload |
| Mobile UX | ⭐⭐⭐⭐⭐ | Fast list scroll |
| Count honesty | ⭐⭐⭐⭐⭐ | Same as C |
| Performance | ⭐⭐⭐⭐⭐ | Minimal wire |

### Tradeoffs

| Pro | Con |
|---|---|
| Smallest viewport JSON | Pop-in on scroll |
| Faster first paint | More API calls on scroll |
| Scales to 500 rows | Needs detail endpoint cache |

### When to choose

Implement **after Option C phase C1** when viewport tab ships. Especially valuable for listings.

---

## Side-by-side summary

| | A catalog | B viewport | **C hybrid** | D lazy |
|---|---|---|---|---|
| Coherence | Poor | Excellent | **Good** | Excellent |
| Discovery | Good | Poor | **Excellent** | Excellent |
| Effort | Low | High | **Medium** | Med-High |
| Risk | Low | High | **Medium** | Medium |
| 14k listings | OK w/ scroll | Broken | **OK** | OK |
| Rollback | Trivial | Hard | **Flag-based** | Flag-based |

---

## Feature flag model (recommended)

| Flag | Effect |
|---|---|
| `viewport_debug=1` | Shadow metrics (existing) |
| `viewport_shadow_render=1` | Visual diff (existing) |
| `viewport_sidebar=1` | Show «В области» tab (future) |
| `viewport_render=1` | Map uses viewport markers (future) |

Flags compose; production default all off.

---

## API surface comparison

| Capability | Legacy | Prototype today | Needed for C/D |
|---|---|---|---|
| Catalog total | `meta.total` ✓ | — | ✓ keep |
| Bbox markers | — | ✓ limit 500 | ✓ |
| Bbox count only | — | ✗ | **ADD** |
| Cursor pagination | offset ✓ | ✗ | **ADD** |
| Sort in viewport | name_asc (catalog) | ✗ | **ADD** |
| Detail on demand | `/blocks/:id` ✓ | — | ✓ reuse |

---

## Rollback safety

| Option | Rollback |
|---|---|
| A | N/A — baseline |
| B | Revert entire map path |
| C | Disable flags → legacy 200 |
| D | Disable lazy → full viewport rows |

Option C/D preserve legacy path longest — aligns with project strict rules.

---

## Conclusion

**Option C (hybrid)** is the recommended architecture. **Option D** optimizes the viewport tab payload once C is underway. **Option A** is acceptable short-term polish only. **Option B alone is rejected** at catalog scale.
