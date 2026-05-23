# Iteration 14.1 — Virtualization Runtime Audit

## Mode

Post-Iter 13 audit + Iter 14 instrumentation · 2026-05-22

---

## Components inspected

| File | Role |
|---|---|
| `MapSidebarVirtualList.tsx` | Virtual list + selection scroll |
| `map-sidebar-layout.ts` | Row geometry + overscan |
| `map-sidebar-scroll-utils.ts` | **New** — reduced motion + scroll coalesce |
| `useSidebarVirtualizerDebug.ts` | **New** — DEV instrumentation hook |
| `map-render-observability.ts` | Extended snapshot + `recordSidebarMetrics` |
| `MapDevOverlay.tsx` | SIDEBAR section |
| `StableMediaFrame.tsx` | Lazy images, absolute fill |

---

## Runtime risks identified (pre-Iter 14)

| Risk | Severity | Mitigation (Iter 14) |
|---|---|---|
| Rapid marker click scroll queue | Medium | 280ms coalesce → `behavior: auto` |
| `prefers-reduced-motion` ignored | Medium | `sidebarScrollBehavior()` |
| No visibility into rendered row count | High | DEV overlay metrics |
| Row height drift undetected | Medium | Clipping detection in DEV |
| Overscan not tunable for analysis | Low | `?sidebar_overscan=4\|8\|12` DEV param |
| scrollend missing in older Safari | Low | FPS loop stops on scroll idle via rAF |

---

## Virtualizer config (unchanged defaults)

| Param | Value |
|---|---|
| `estimateSize` | 76px stride |
| `overscan` | **8** (default) |
| `gap` | 4px |
| Row box | Fixed 72px |

---

## Observability gate

All sidebar metrics require **both**:

```typescript
import.meta.env.DEV && isMapDebugEnabled()
// ?map_debug=1 OR ?viewport_debug=1
```

Production builds: `recordSidebarMetrics` body eliminated by dead-code elimination.

---

## Data path (unchanged semantics)

```
RedesignMap blocks/listings (200 cap)
  → MapSidebarVirtualList
  → useVirtualizer
  → ~20 DOM rows
```

No API, React Query, or count changes.

---

## New DEV overlay fields

| Field | Source |
|---|---|
| `sidebarRenderedRows` | `virtualItems.length` |
| `sidebarTotalRows` | `count` |
| `sidebarVisibleRows` | `ceil(clientHeight / 76)` |
| `sidebarDomReductionPct` | `1 - rendered/total` |
| `sidebarScrollFps` | rAF rolling avg during scroll |
| `sidebarClippingWarnings` | layout probe on visible rows |

---

## Conclusion

Iter 14 adds **measurable DEV visibility** and **scroll hardening** without altering sidebar semantics or virtualization architecture.
