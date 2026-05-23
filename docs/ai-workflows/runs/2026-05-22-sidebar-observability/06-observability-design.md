# Iteration 14.6 — Observability Design

## Architecture

```
MapSidebarVirtualList
  ├─ useVirtualizer (production)
  └─ useSidebarVirtualizerDebug [DEV + map_debug only]
         ├─ scroll listener → scrollTop, FPS
         ├─ layout effect → virtualizer recalcs, clipping
         └─ recordSidebarMetrics()
                ↓
         map-render-observability (snapshot)
                ↓
         MapDevOverlay → "sidebar" section
```

---

## Gate conditions

| Layer | Condition |
|---|---|
| Build | `import.meta.env.DEV` |
| Runtime | `isMapDebugEnabled()` |
| UI | `MapDevOverlay` mounted on map |

Production: entire probe path dead-code eliminated or no-ops.

---

## Snapshot fields

| Field | Type | Description |
|---|---|---|
| `sidebarActive` | bool | totalRows > 0 |
| `sidebarTotalRows` | number | Catalog loaded count |
| `sidebarRenderedRows` | number | virtualItems.length |
| `sidebarVisibleRows` | number | Est. from clientHeight |
| `sidebarOverscan` | number | Active overscan value |
| `sidebarDomReductionPct` | number | `(1 - rendered/total)×100` |
| `sidebarActiveIndex` | number | Selected row index |
| `sidebarVirtualizerRecalcs` | number | Range signature changes |
| `sidebarScrollTop` | number | px |
| `sidebarScrollFps` | number | Rolling avg |
| `sidebarLastSelectionScrollMs` | number | selection scroll timing |
| `sidebarClippingWarnings` | string | Semicolon-separated |

---

## API surface

```typescript
recordSidebarMetrics(update: SidebarMetricsUpdate): void
incrementSidebarVirtualizerRecalc(): void
recordSidebarSelectionScroll(durationMs: number): void
```

All guarded by `import.meta.env.DEV && isMapDebugEnabled()`.

---

## DEV URL params

| Param | Purpose |
|---|---|
| `map_debug=1` | Enable overlay + sidebar metrics |
| `sidebar_overscan=4\|8\|12` | Overscan A/B (DEV only) |

---

## Overlay section

```
sidebar
rows: 21/200 rendered
visible est: 5
overscan: 8
DOM reduction: 89.5%
active index: 42
virtualizer recalcs: 17
scrollTop: 3192px
scroll fps est: 58
selection scroll: 2.1ms
clip: none
```

---

## Zero production overhead design

| Technique | Effect |
|---|---|
| `import.meta.env.DEV` guards | Vite DCE in prod build |
| `isMapDebugEnabled()` runtime | No work unless flag |
| No extra API calls | ✓ |
| Hook `enabled: sidebarDebug` | Skips effects |
| Passive scroll listeners | Only when debug |

---

## Future extensions (not Iter 14)

- Export metrics to PerformanceObserver
- Automated Playwright scroll FPS
- Wire sidebar recalcs to Sentry breadcrumb (staging)

---

## Conclusion

Observability is **DEV-gated**, **snapshot-based**, and **overlay-visible** — matching existing map_debug patterns from Iter 8–11.
