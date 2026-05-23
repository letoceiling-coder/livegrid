# Iteration 11.6 — Performance Guard

## Default: OFF

Shadow render adds zero cost when flag absent — hook early-returns, no cluster created.

---

## Cost when enabled (DEV only)

| Operation | Frequency | Impact |
|---|---|---|
| Shadow cluster rebuild | Viewport data change only | O(N) placemarks, N ≤ 500 |
| Legacy cluster rebuild | Unchanged | Independent |
| Viewport API fetch | Same as Iter 8–10 | Unchanged |
| Selection click | Legacy only | Shadow silent |

---

## Guards

| Guard | Implementation |
|---|---|
| DEV-only flag | `import.meta.env.DEV` |
| Requires viewport experimental | No orphan shadow without data |
| Signature dedupe | Skip rebuild if same ID/kind set |
| No zoom-mode rebuild | Shadow dots fixed size |
| No selection rebuild | Shadow ignores `activeId` |
| Silent interactivity | No event handlers |
| Invisible cluster preset | Minimal cluster chrome |

---

## Expected counters (healthy session)

| Action | legacy rebuilds | shadow rebuilds |
|---|---|---|
| Initial load | 1 | 0–1 (after viewport fetch) |
| 20 sidebar clicks | 0 | 0 |
| Pan (debounced viewport) | 0 | 0–1 per settled bbox |
| Toggle shadow off | 0 | 0 (cleanup only) |

---

## Not introduced

- No Web Workers
- No second map instance
- No request storm (inherits viewport debounce)
- No production bundle weight (tree-shaken)

---

## Staging note

If shadow markers exceed ~300 visible, consider limiting overlap rendering to viewport-only only — **not implemented**; current cap from API `limit=500` is acceptable for DEV.
