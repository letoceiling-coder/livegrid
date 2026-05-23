# Iteration 26.7 — Bottleneck Classification

## Mode

Evidence-based classification · 2026-05-22

---

## Classification key

| Class | Meaning | Staging implication |
|---|---|---|
| **SAFE FOR STAGING** | Measured or structurally sound | Proceed |
| **NEEDS OPTIMIZATION** | Survivable but should improve | Proceed with hold items |
| **ARCHITECTURAL LIMIT** | Requires redesign to scale further | Block or scope-limit |

---

## Component classification

| Component | Class | Evidence |
|---|---|---|
| Viewport API fetch (~214ms) | **SAFE** | Iter 24 measured |
| Bbox debounce + dedupe | **SAFE** | Code + Iter 26 counters |
| Stale request abort | **SAFE** | Iter 26 — low risk |
| Sidebar virtualization (200 rows) | **SAFE** | Decoupled from map N |
| Layout class cache | **SAFE** | Bounded cache |
| Selection icon swap | **SAFE** | O(1) per click |
| Shadow parity (DEV) | **SAFE** | DEV-only overhead |
| Popup React render | **SAFE** | Single conditional |
| `markerLayerSignature` O(n) | **NEEDS OPTIMIZATION** | 6533 string concat per change |
| Full cluster rebuild at N=6533 | **NEEDS OPTIMIZATION** / **ARCHITECTURAL LIMIT** | Yandex Clusterer model |
| Zoom mode → full rebuild | **ARCHITECTURAL LIMIT** | By design in current hook |
| Sidebar sync for viewport-only IDs | **NEEDS OPTIMIZATION** (product) | Iter 25 known gap |
| Mobile FPS under density | **MEASURE** | Browser required |

---

## Optimization candidates (future, not Iter 26)

| Optimization | Risk | Impact |
|---|---|---|
| Hash-based layer signature (count+hash vs full concat) | Low | Faster signature compare |
| Incremental placemark diff | Medium | Reduce rebuild scope |
| Server-side clustering | High | Architecture change — **out of scope** |
| Viewport-driven sidebar | Medium | Product change — **out of scope** |

---

## Iter 26 delivered optimization

**AbortController for viewport fetches**
- Before: overlapping fetches could apply stale marker sets
- After: cancel + drop stale → fewer spurious cluster rebuilds
- Measure: `canceled`, `stale dropped` during pan/filter spam

---

## Evidence gaps (require browser)

| Metric | Status |
|---|---|
| Cluster rebuild p95 at 6533 | **PENDING MEASUREMENT** |
| FPS min zoom | **PENDING MEASUREMENT** |
| Heap at 6533 | **PENDING MEASUREMENT** |
| Mobile FPS | **PENDING MEASUREMENT** |

Use `map_debug=1` overlay + `logStressSnapshot()` in console.

---

## Staging readiness by area

| Area | Preliminary class |
|---|---|
| Network/viewport API | SAFE FOR STAGING |
| Network storm handling | SAFE FOR STAGING |
| Cluster at 6533 | HOLD — measure first |
| Mobile | HOLD — measure first |
| Sidebar | SAFE (legacy scope) |
| Rollback | SAFE |
