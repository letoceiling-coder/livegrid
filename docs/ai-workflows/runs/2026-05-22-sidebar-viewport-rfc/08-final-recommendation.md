# Iteration 12.8 — Final Recommendation

## Verdict

### **ARCHITECTURE RFC COMPLETE — NO ROLLOUT APPROVAL**

Iteration 12 defines the **sidebar + viewport target architecture** based on codebase audit and Iter 8–11 measurements. **No production changes.** Legacy 200-cap map and sidebar remain authoritative.

---

## Primary finding

The bottleneck is **not** viewport SQL or filter parity (Iter 10 resolved). It is **semantic coupling**:

> One `page=1&per_page=200` array simultaneously represents catalog results, map markers, and sidebar rows — while viewport prototype correctly returns bbox-filtered sets that diverge by 80+ IDs.

Until sidebar semantics are decoupled, viewport render rollout would produce **visible map/sidebar lies**.

---

## Recommended architecture

**Option C — Hybrid** with **Option D** lazy details for the viewport tab.

| Layer | Source | Semantics |
|---|---|---|
| Map markers (future) | Viewport fetch | Objects in bbox ∩ filters |
| Sidebar default tab | Viewport fetch | Same set as map |
| Sidebar «Все» tab | Catalog infinite scroll | Full filter result set |
| Filter header | Catalog `meta.total` | «14 917 найдено» |
| Spatial subtitle | Viewport `meta.count` | «58 в области карты» |

---

## Sidebar semantics decision

| Question | Answer |
|---|---|
| A vs B vs C? | **C (hybrid)** |
| Default tab when viewport enabled | «В области карты» |
| Catalog discovery | «Все результаты» tab — required for 14k listings |
| Count copy | Dual-line: spatial + catalog — never conflate |

---

## Pagination decision

| Tab | Strategy |
|---|---|
| В области | Viewport cursor pagination, limit 50–100 |
| Все | `useInfiniteQuery` keyset, per_page 20 |
| Both | **Mandatory virtualization** |

---

## Selection decision

- Extract `useMapSelection` controller (Phase 2)
- Add optional `?highlight=` URL param
- On pan: keep selection popup; mark sidebar row if off-viewport
- Map/list mobile toggle before viewport sidebar default

---

## Mobile decision

- Replace 40vh×200 cram with **map/list toggle**
- Bottom sheet for selection (not overlapping popup + sidebar)
- 600 ms debounce on touch for viewport fetches

---

## Performance decision

- Single viewport fetch feeds markers + sidebar + count (no duplicate storms)
- Virtualize sidebar immediately for current 200 rows (Phase 1 — lowest risk)
- Respect 500 viewport cap with «500+» disclosure
- Keep legacy path behind flags until staging sign-off

---

## Measured evidence summary

| Fact | Source |
|---|---|
| 200 loaded / 359 total blocks | Map perf audit |
| 80 viewport extras, 0 missing (filters OK) | Iter 10 |
| 181 viewport vs 101 legacy-in-bbox | Iter 10 |
| 200 sidebar DOM + image storm | Map perf audit |
| Selection = isolated update, not rebuild | useMapClusterLayer |
| Viewport timing ≤ legacy | Iter 10 |

---

## Honest blockers (rollout still blocked)

| # | Blocker | Severity |
|---|---|---|
| 1 | Sidebar coupled to 200-row catalog | **Critical** |
| 2 | No viewport `meta.count` endpoint | High |
| 3 | No viewport cursor/sort | High |
| 4 | Listings lat/lng incomplete | **Critical** for listings mode |
| 5 | No sidebar virtualization | High |
| 6 | Misleading «N объектов на карте» copy | Medium |
| 7 | Selection not in URL | Medium |
| 8 | Mobile 40vh layout inadequate | High |

**Viewport filter parity:** ✓ ready (Iter 10)  
**Viewport production render:** ✗ not ready  
**Sidebar architecture:** ✓ defined (this RFC)  
**Sidebar implementation:** ✗ not started  

---

## Phased roadmap (RFC — not committed schedule)

| Phase | Deliverable | Production impact |
|---|---|---|
| **12** | This RFC | None |
| **13** | Sidebar virtualization + copy fix | Low — legacy data |
| **14** | Viewport API count + cursor + sort | API additive |
| **15** | Hybrid sidebar tab behind `viewport_sidebar=1` | DEV/staging |
| **16** | Viewport map render behind `viewport_render=1` | Staging |
| **17** | Lazy detail cards (Option D) | Staging |
| **18+** | Production default discussion | Requires sign-off |

Phases 13–17 each preserve legacy rollback via flags.

---

## Explicit non-approvals

| Action | Status |
|---|---|
| Replace sidebar source | **NOT APPROVED** |
| Switch render source | **NOT APPROVED** |
| Remove 200-cap | **NOT APPROVED** |
| Remove legacy map | **NOT APPROVED** |
| Enable viewport production mode | **NOT APPROVED** |

---

## Documentation delivered

| File | Topic |
|---|---|
| 01-current-sidebar-architecture.md | As-is audit |
| 02-selection-flow-analysis.md | Click/sync/URL |
| 03-sidebar-semantics-rfc.md | A/B/C decision |
| 04-pagination-rfc.md | Strategies |
| 05-mobile-ux-rfc.md | Toggle + sheet |
| 06-density-scalability-analysis.md | Measured density |
| 07-architecture-options.md | A/B/C/D matrix |
| 08-final-recommendation.md | This verdict |

---

## Conclusion

**Correct sidebar architecture = hybrid dual-semantics** with viewport-spatial default for map coherence and catalog-infinite tab for discovery. Implementation must proceed in flagged phases starting with **virtualization of the existing 200-row sidebar** — the highest ROI, lowest risk step.

Viewport production rollout discussion remains **premature** until Phase 15 hybrid sidebar is validated in staging with honest dual counts and measured mobile UX.

**Overall: RFC APPROVED FOR PLANNING — IMPLEMENTATION NOT STARTED**
