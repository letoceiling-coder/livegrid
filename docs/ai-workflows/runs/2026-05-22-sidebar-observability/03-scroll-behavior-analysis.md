# Iteration 14.3 — Scroll Behavior Analysis

## Hardening implemented

### 1. `prefers-reduced-motion`

```typescript
// map-sidebar-scroll-utils.ts
sidebarScrollBehavior() → 'auto' | 'smooth'
```

Selection `scrollToIndex` uses `'auto'` when OS reduced motion enabled.

### 2. Rapid selection coalesce

```typescript
shouldCoalesceSelectionScroll(lastScrollAt, now)
// if < 280ms since last → behavior: 'auto'
```

Prevents smooth-scroll stacking during rapid marker clicks.

### 3. Overscroll containment

```tsx
className="overscroll-y-contain"
style={{ overscrollBehavior: 'contain' }}
```

Isolates sidebar scroll from map pan on mobile.

---

## Selection scroll flow

```
Map marker click
  → setActiveBlock
  → activeIndex computed
  → scrollToIndex(index, { align: 'auto', behavior })
  → recordSidebarSelectionScroll(ms) [DEV]
```

| Condition | behavior |
|---|---|
| Normal | `smooth` |
| reduced-motion | `auto` |
| Rapid clicks (<280ms) | `auto` |

---

## Scroll FPS estimation (DEV)

`useSidebarVirtualizerDebug`:

- Listens `scroll` (passive)
- rAF loop while scrolling
- Rolling avg of 12 frame deltas → `sidebarScrollFps`

| FPS (est.) | Overlay color |
|---|---|
| ≥ 50 | green |
| 30–49 | amber |
| < 30 | red |

**Honest limit:** estimate only active during scroll; not a lab benchmark.

---

## Scroll preservation (unchanged)

| Event | scrollTop |
|---|---|
| Filter URL change | Reset 0 |
| keepPreviousData refetch | Preserved |
| Selection | scrollToIndex only |

---

## scrollend

Hook listens `scrollend` where supported to stop FPS rAF loop.

Fallback: rAF stops when no scroll events (natural idle).

---

## DEV verification

| # | Test | Expected |
|---|---|---|
| 1 | OS reduced motion ON → map select | Instant scroll, no animation |
| 2 | Rapid 10 marker clicks | No scroll jank queue |
| 3 | Fling sidebar on mobile | Map does not pan |
| 4 | `map_debug=1` fling | FPS est appears, ≥30 typical |

---

## Conclusion

Scroll behavior hardened for **accessibility** and **rapid selection** without semantic changes. DEV FPS provides runtime scroll quality signal.
