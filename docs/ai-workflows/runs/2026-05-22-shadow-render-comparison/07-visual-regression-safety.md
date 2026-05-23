# Iteration 11.7 — Visual Regression Safety

## Requirement

Legacy cluster must look **identical** when shadow flag is OFF.

---

## Isolation guarantees

| Layer | Owner | Modified in Iter 11? |
|---|---|---|
| Legacy cluster | `useMapClusterLayer` | **No** |
| Legacy descriptors | `map-marker-cache` | **No** |
| Legacy data source | React Query `/blocks` | **No** |
| Shadow cluster | `useShadowViewportRender` | **New, separate** |

---

## Interaction safety

- Shadow placemarks: `interactivityModel: 'default#silent'`
- HTML: `pointer-events: none`
- No `pm.events.add('click')` on shadow
- Legacy popup / sidebar / selection unchanged

---

## Visual overlap zones

Where green shadow dot overlaps blue legacy marker:

- User sees both (intentional diff)
- Click targets legacy marker beneath
- Selection highlight applies to legacy only

---

## Flag-off verification

1. Load `/map?region_id=1` (no debug flags)
2. Confirm: blue markers only, no green/orange
3. Confirm: no shadow section in overlay
4. Compare screenshot to pre-Iter-11 baseline — must match

---

## Flag-on verification

1. Load with `viewport_debug=1&viewport_shadow_render=1&map_debug=1`
2. Confirm: blue legacy + green/orange shadow
3. Sidebar click → legacy highlight only
4. `cluster rebuilds` unchanged by shadow toggling mid-session

---

## Production build

`isViewportShadowRenderEnabled()` → always **false**

Shadow hook `enabled=false` → no geoObjects added.

**Zero production visual regression risk.**
