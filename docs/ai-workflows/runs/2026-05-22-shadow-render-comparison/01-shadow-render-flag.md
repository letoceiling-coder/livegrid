# Iteration 11.1 — Shadow Render Flag

## Mode

DEV-only · opt-in · disabled by default · no production impact

---

## Enable conditions (ALL required)

| Gate | Requirement |
|---|---|
| Build | `import.meta.env.DEV` |
| Viewport experimental | `?viewport_debug=1` OR `localStorage lg_viewport_experimental=1` |
| Shadow render | `?viewport_shadow_render=1` OR `localStorage lg_viewport_shadow_render=1` |

**Recommended URL:**

```
http://localhost:5173/map?region_id=1&map_debug=1&viewport_debug=1&viewport_shadow_render=1
```

---

## API

**File:** `apps/web/src/redesign/lib/viewport-feature-flag.ts`

```typescript
isViewportShadowRenderEnabled(): boolean
enableViewportShadowRenderLocal()
disableViewportShadowRenderLocal()
```

`isViewportShadowRenderEnabled()` returns **false** unless viewport experimental is already on.

---

## Production safety

| Guard | Effect |
|---|---|
| DEV build only | Tree-shaken in production |
| Requires viewport_debug | No accidental shadow layer |
| Separate flag | Default off even in DEV |
| No URL param in prod builds | N/A — DEV gate first |

---

## Toggle path

| Action | Result |
|---|---|
| Remove `viewport_shadow_render=1` | Shadow cluster removed; legacy unchanged |
| Remove `viewport_debug=1` | Shadow + viewport fetch disabled |
| `disableViewportShadowRenderLocal()` | Clears localStorage persistence |

Legacy cluster rebuild count unaffected when toggling shadow flag.

---

## Relationship to other flags

| Flag | Purpose |
|---|---|
| `map_debug=1` | Overlay visibility |
| `viewport_debug=1` | Viewport fetch + parity metrics |
| `viewport_shadow_render=1` | **Visual shadow cluster layer** |
| `viewport_stress=404` | Fallback testing (Iter 9) |

Shadow render does **not** require `map_debug=1` for the layer to render — but overlay stats need `map_debug` or `viewport_debug`.
