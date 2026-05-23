# Iteration 26.4 — Memory Analysis

## Mode

Memory growth estimation under viewport density · 2026-05-22

---

## Instrumentation

| Metric | Method | Overlay |
|---|---|---|
| JS heap used | `performance.memory` (Chrome) | `heap: XMB` |
| Heap limit | `performance.memory.jsHeapSizeLimit` | `/ YMB` |
| Placemark estimate | 2048 bytes × count | `est placemark mem` |
| Layout cache | `layoutClassCache.size` | `layout cache` |

**Note:** `performance.memory` unavailable in Firefox/Safari — overlay shows `—`.

---

## Thresholds

| Level | Heap used | Interpretation |
|---|---:|---|
| **GREEN** | ≤ 150 MB | Normal SPA |
| **YELLOW** | 151–350 MB | Monitor on long sessions |
| **RED** | > 350 MB | Risk of tab pressure |

Placemark estimate at 6533: **~12.8 MB** (DOM/Yandex overhead likely higher).

---

## Detached marker risk

Cluster rebuild path:
```typescript
map.geoObjects.remove(clustererRef.current);
placemarksRef.current.clear();
```

Old clusterer removed from map — Yandex GC dependent. **Scenario F** (100 popup open/close) validates no runaway heap.

---

## Scenario F — Popup stress

100 open/close cycles:
1. Click marker → close popup → repeat
2. Monitor `heap` trend in overlay
3. `layout cache` should plateau (bounded by label combos)

---

## Memory checklist

- [ ] Initial heap at 6533 markers
- [ ] Heap after 10 zoom storms
- [ ] Heap after 100 popup cycles
- [ ] Layout cache entries stable (not growing unbounded)

---

## Classification preview

| Item | Expected class |
|---|---|
| Layout cache | SAFE FOR STAGING |
| 6533 placemark heap | **MEASURE** — likely NEEDS OPTIMIZATION or ARCHITECTURAL LIMIT |
| Sidebar virtualization | SAFE (200 rows) |
