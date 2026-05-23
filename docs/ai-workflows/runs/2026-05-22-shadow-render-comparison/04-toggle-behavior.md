# Iteration 11.4 — Toggle Behavior

## Verification matrix

| State | Legacy cluster | Shadow cluster | Viewport fetch |
|---|---|---|---|
| Default production | ✓ normal | ✗ | ✗ |
| `viewport_debug=1` only | ✓ normal | ✗ | ✓ metrics |
| `+ viewport_shadow_render=1` | ✓ **identical** | ✓ diff dots | ✓ |
| Remove shadow flag | ✓ normal | removed | ✓ |
| Remove viewport_debug | ✓ normal | ✗ | ✗ |

---

## Legacy regression safety

When `viewport_shadow_render` is **absent**:

- `useShadowViewportRender` `enabled=false`
- Effect cleanup removes any existing shadow cluster
- `useMapClusterLayer` code path **untouched**
- Cluster rebuild deps unchanged

**Measured expectation:** `cluster rebuilds` counter identical with/without shadow flag on same session (shadow hook does not call `recordClusterRebuild`).

---

## Enable sequence

1. Map loads → legacy cluster builds (1 rebuild)
2. Viewport fetch completes → parity metrics update
3. Shadow flag on → shadow cluster builds (separate counter `shadowLayerRebuilds`)
4. Pan map → viewport refetch → shadow signature update → 1 shadow rebuild (legacy unchanged if data same)

---

## Disable sequence

1. Remove URL param or `disableViewportShadowRenderLocal()`
2. Shadow effect cleanup → `geoObjects.remove(shadowCluster)`
3. `setShadowRenderEnabled(false)` → overlay clears shadow stats

---

## localStorage helpers

```javascript
// DevTools
enableViewportShadowRenderLocal()   // requires viewport experimental
disableViewportShadowRenderLocal()
```

---

## Rollback

Single commit revert of Iter 11 files restores pre-shadow behavior. No API or legacy hook changes required for rollback.
