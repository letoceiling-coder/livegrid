# Iteration 13.5 — Performance Measurements

## Methodology

Metrics combine:
1. **Structural analysis** (DOM count formula — deterministic)
2. **Map perf audit baseline** (Iter map-performance-audit, 2026-05-22)
3. **DEV verification procedure** (Chrome Performance / Elements panel)

No synthetic benchmark fabricates FPS numbers — formulas below are reproducible.

---

## DOM row count

### Formula

```
renderedRows = visibleRows + 2 × OVERSCAN
visibleRows  = ceil(viewportHeight / ROW_STRIDE)
ROW_STRIDE   = 72 + 4 = 76px
OVERSCAN     = 8
```

### Measured scenarios

| Context | Viewport h | Visible | Rendered DOM rows | Before |
|---|---|---|---|---|
| Mobile 40vh (~340px) | 340 | 5 | **21** | 200 |
| Desktop sidebar (~650px) | 650 | 9 | **25** | 200 |
| Desktop tall (~900px) | 900 | 12 | **28** | 200 |

**Reduction: ~88–90% fewer row DOM nodes**

---

## Image request count

### Before (map perf audit)

- 200 `StableMediaFrame` instances in sidebar DOM
- `loading="lazy"` — browser loads images approaching viewport
- Audit observation: **up to 200 concurrent requests** on initial sidebar paint

### After (structural)

| Scenario | Max `<img>` in sidebar DOM |
|---|---|
| Mobile | ~21 |
| Desktop | ~28 |

**Reduction: ~86–89% fewer image nodes**

Lazy loading now bounded by virtual window — images unmount when scrolled away.

---

## Memory pressure (estimate)

| Payload | Before | After |
|---|---|---|
| Sidebar row DOM + React fibers | ~200 × ~2KB ≈ 400KB | ~25 × ~2KB ≈ 50KB |
| Image decode buffers | proportional to loaded imgs | ~25 max |

Exact heap depends on image sizes — measure in Chrome Memory snapshot comparing before/after on same `/map?region_id=1` session.

---

## Selection rerender count

| Event | Before | After |
|---|---|---|
| Click sidebar row | Reconcile 200-row list | Memo rows: **2 row components** + virtualizer |
| Click map marker | Same | Same |
| Map cluster rebuild | **0** (isolated selection) | **0** (unchanged) |

React Profiler (DEV):

1. Record selection click on sidebar
2. Expect `MapSidebarBlockRow` × 2 commits, not 200

---

## Scroll FPS (DEV procedure)

```
Chrome → Performance → Mobile CPU 4× throttle
Record 3s sidebar fling through full 200 list
```

| Metric | Before (expected) | After (expected) |
|---|---|---|
| Long tasks > 50ms | More frequent with 200 DOM | Reduced |
| Scripting during scroll | Layout of off-screen nodes | Window-only |

**Honest note:** Exact FPS not captured in CI — run locally for hard numbers. Structural DOM reduction is the guaranteed win.

---

## Filter refetch (`keepPreviousData`)

| Event | Scroll | Network |
|---|---|---|
| Refetch same filters | Preserved | Same as before |
| Filter URL change | Reset top | New query |

Compatible with existing React Query `placeholderData: keepPreviousData`.

---

## Map / API impact

| Metric | Change |
|---|---|
| `/blocks` payload | **0** |
| Map cluster rebuilds | **0** |
| Viewport shadow fetch | **0** |

---

## Reproduce DOM count (DEV)

```javascript
// Console on /map?region_id=1 — after Iter 13
document.querySelectorAll('[role="list"] [role="listitem"]').length
// Expected: ~20–30 while scrolled mid-list, not 200
```

---

## Conclusion

**Measured structural improvement:** ~200 → ~25 DOM rows, proportional image reduction. Selection and map paths unchanged. Full FPS/memory numbers require local Chrome profiling — procedure documented above.
