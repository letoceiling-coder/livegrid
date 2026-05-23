# Iteration 12.3 — Sidebar Semantics RFC

## Question

Should sidebar represent:

- **A)** full catalog result set  
- **B)** current viewport-visible objects  
- **C)** hybrid model  

---

## Current reality (Option A partial)

Sidebar = **page 1 of catalog** (200 rows), not full catalog.

| Label shown | Actual meaning |
|---|---|
| `Показано 200 из 359 объектов` | Truthful gap disclosure |
| `359 объектов на карте` | **Misleading** when only 200 loaded — subtitle uses total but map also capped |
| FilterSidebar `totalCount` | API `meta.total` — **unused in UI** |

Users may interpret sidebar as «everything matching filters on the map». That is false for 159+ blocks and 14k+ listings.

---

## Option A — Catalog-first sidebar (status quo+)

### Definition

Sidebar lists catalog results (paginated or infinite), independent of map bbox. Map may eventually use viewport markers.

### Pros

| Benefit | Detail |
|---|---|
| Stable list while panning | No flicker on every bbox change |
| Matches filter mental model | «Show me all 2-room in district X» |
| Aligns with `/catalog` list view | Same sort, same total count |
| Easier pagination | Reuse `useInfiniteQuery` from `RedesignCatalog` |
| Selection stability | Row stays in list when panning away |

### Cons

| Risk | Detail |
|---|---|
| Map/sidebar mismatch | Markers in viewport ⊄ sidebar page 1 (proven: 80 extras Iter 10) |
| Misleading counts | «359 on map» vs visible subset |
| Heavy initial load | 200+ DOM nodes, images |
| Doesn't scale to 14k listings | Needs infinite scroll regardless |

### When appropriate

- User goal = **browse catalog with map as orientation**
- Dense filters shrink total below ~500
- New-build blocks mode (359 total manageable)

---

## Option B — Viewport-first sidebar

### Definition

Sidebar lists objects returned by `/_prototype/*/viewport` for current bbox + filters. Updates on debounced pan/zoom.

### Pros

| Benefit | Detail |
|---|---|
| Map/list coherence | Row always corresponds to visible marker |
| Natural density scaling | Zoom in → fewer items; zoom out → more (capped) |
| Smaller payloads | Typical bbox 30–180 markers (Iter 10 measured) |
| Honest spatial UX | «Objects in this map area» |

### Cons

| Risk | Detail |
|---|---|
| List churn on pan | 450ms debounce still feels jumpy on mobile |
| Lost catalog context | User doesn't see «rest of results» without zooming out |
| Sort ambiguity | Viewport API has no `sort=name_asc` today — needs spec |
| Selection orphan | Pan away → selected item leaves list |
| Total count unclear | Is it bbox count or catalog count? |
| Rapid pan storms | Mitigated by debounce but mobile gestures aggressive |

### Measured bbox counts (region 1, Iter 10)

| Scenario | Viewport count | Legacy in bbox |
|---|---|---|
| Moscow bbox (~z11) | 181 | 101 |
| Geo 5 km | 33 | 33 |
| District filter | 3 | 3 |
| Price 5–15M | 34 | 34 |

Viewport-first sidebar would show **181 rows** for default Moscow view vs **200** catalog page — closer to visible truth but different sort order.

---

## Option C — Hybrid (recommended direction)

### Definition

- **Map markers:** viewport-driven (future production path)
- **Sidebar:** catalog-driven with **spatial section header**
- **Counts:** dual-line semantics (see below)

### Structure

```
┌─────────────────────────────────┐
│ В области карты: 58             │  ← viewport count (live)
│ Всего по фильтрам: 14 917       │  ← catalog meta.total
├─────────────────────────────────┤
│ [Tab: В области] [Tab: Все]     │  ← or default «В области»
│ ... rows ...                    │
└─────────────────────────────────┘
```

### Pros

| Benefit | Detail |
|---|---|
| Preserves catalog discovery | «All results» tab uses infinite scroll |
| Map coherence | Default tab matches markers |
| Honest counts | Both numbers visible |
| Gradual rollout | Can ship «В области» tab first behind flag |
| Filter parity already proven | Iter 10 shared where builders |

### Cons

| Risk | Detail |
|---|---|
| UI complexity | Two tabs, two data sources |
| Duplicate IDs possible | Same object in both — manageable |
| Engineering cost | Two queries per filter change + bbox change |
| User confusion if copy wrong | Must explain difference clearly |

### Hybrid default recommendation

**Default tab: «В области карты»** when viewport mode enabled; fallback to catalog tab when zoom < 10 or viewport fetch fails.

---

## Option D — Viewport sidebar + lazy details

Subset of C: sidebar shows **minimal cards** (id, price, thumb stub); detail on select via `GET /blocks/:slug` or listing detail.

Defer full card payload until row visible (virtualized) or selected.

---

## Count semantics product strategy

| Copy pattern | Meaning | Use when |
|---|---|---|
| `Показано 200 из 359` | Catalog pagination gap | Catalog-first / legacy |
| `58 объектов в области карты` | Viewport bbox count | Viewport-first |
| `14 917 квартир найдено` | Filter total (catalog) | Filter sidebar header |
| `58 из 14 917 в области` | Dual semantic | **Recommended hybrid** |

### Rules

1. **Never** say «N объектов на карте» when N = catalog total but markers ⊂ total.
2. **Always** show catalog total near filters (user needs filter feedback).
3. Viewport count must update on settled bbox (post-debounce), with «обновление…» during fetch.
4. When `viewportCount > limit` (500 cap): show `500+ в области` + honesty note.

---

## Decision matrix

| Criterion | A catalog | B viewport | C hybrid |
|---|---|---|---|
| Map/list coherence | Poor | Excellent | Good |
| Catalog discovery | Excellent | Poor | Excellent |
| Implementation risk | Low (now) | High | Medium |
| Mobile UX | OK | Risky | Good with tabs |
| Count honesty | Poor | Good | **Best** |
| Rollout flexibility | — | All-or-nothing | **Phased** |

---

## RFC decision (pre-rollout)

**Adopt Option C (hybrid)** as target architecture.

**Short term (no rollout):** document dual counts; fix misleading «N объектов на карте» copy in Iter 12+ UX pass.

**Do not adopt pure Option B** without hybrid escape hatch — 14k listing catalogs require catalog discovery path.

**Do not stay pure Option A** for map markers once viewport render enabled — Iter 10 proved 80+ marker divergence in bbox.

---

## Blockers before implementation

| Blocker | Status |
|---|---|
| Viewport sort order spec | **Open** — API returns unordered limit slice |
| Viewport total count endpoint | **Missing** — need `COUNT(*)` without full fetch |
| Listings lat/lng completeness | **Blocker** for listings viewport sidebar |
| Sidebar virtualization | **Required** for bbox counts > 100 |
| Selection controller | **Required** — see 02-selection-flow-analysis.md |

---

## Conclusion

Sidebar semantics must **split catalog truth from spatial truth**. Pure catalog or pure viewport both lie to users in different ways. Hybrid with explicit dual counts is the honest product model aligned with measured Iter 10 parity data.
