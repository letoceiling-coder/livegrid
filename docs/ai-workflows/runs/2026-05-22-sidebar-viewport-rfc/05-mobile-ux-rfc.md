# Iteration 12.5 — Mobile UX RFC

## Scope

Mobile map experience (`< lg` breakpoint) under viewport-driven architecture — audit + recommendations only.

---

## Current mobile layout

From `RedesignMap.tsx`:

| Element | Mobile behavior |
|---|---|
| Filter column | Hidden — overlay via `showFilters` |
| Map | `flex-1` full width |
| Sidebar | Bottom panel `max-h-[40vh]`, scroll inside |
| Search | Full width above map |
| Subtitle | Below search, full width |
| Region selector | Above map |

```
┌────────────────────────┐
│ Header                 │
├────────────────────────┤
│ [Search...........]    │
│ Subtitle    [Фильтры]  │
│ Region pills           │
├────────────────────────┤
│                        │
│        MAP             │
│                        │
├────────────────────────┤
│ Sidebar (≤40vh)        │
│ row row row...         │
└────────────────────────┘
```

---

## Measured pain points (current)

| Issue | Evidence |
|---|---|
| 200 rows in 40vh | No virtualization — long scroll, heavy DOM |
| 200 image loads | Map perf audit — concurrent thumb requests |
| Filter overlay blocks map | Full-screen `z-[60]` — correct pattern |
| «Показать N объектов» button | Uses `catalogTotal` — may exceed loaded |
| No map/list toggle | Map always visible; sidebar always partial |
| Selection off-screen | No scroll-into-view on marker tap |
| Bottom popup overlaps sidebar | Popup `bottom-4` + sidebar compete for space |

---

## Viewport-driven mobile risks

| Risk | Severity | Mitigation |
|---|---|---|
| List resets on pan | **High** | Stale-while-revalidate rows; don't clear until fetch completes |
| Thumb reach for sidebar | Medium | Map/list toggle — full-height list mode |
| Bbox fetch on touch pan | **High** | Keep 450ms debounce; raise to 600ms on mobile |
| Dual-line counts wrap awkwardly | Low | Stack counts vertically on `< sm` |
| Shadow layer (DEV) | Low | Already non-interactive |

---

## Recommended mobile architecture

### 1. Map / List toggle

```
?panel=map | panel=list   (or bottom tab bar)
```

| Mode | Layout |
|---|---|
| **Map** | Current map + compact peek bar (3 visible rows + «Показать все N») |
| **List** | Full-height virtualized list; map hidden or mini-map strip |

Avoids cramming 58–200 rows into 40vh.

**Reference:** Common pattern in Avito/Cian map search — not implemented in LiveGrid today.

### 2. Viewport sidebar on mobile

When hybrid «В области» tab active:

| Behavior | Spec |
|---|---|
| Default panel | Map with peek strip |
| Row count in peek | 3–5 items from viewport fetch |
| «Показать все в области (58)» | Switches to list panel |
| Pan map | Updates peek after debounce; subtle loading indicator |
| Filter change | Resets to map panel; refetch viewport + catalog |

### 3. Selection persistence

| Action | Mobile UX |
|---|---|
| Tap marker | Open **bottom sheet** popup (not card over map) — sheet height 40–50% |
| Tap sidebar row | Same sheet; scroll row into view in list mode |
| Pan away with selection | Sheet stays; «Объект вне области» badge |
| Back gesture | Close sheet before navigating away |

Bottom sheet avoids popup vs 40vh sidebar collision.

### 4. Filter interaction

Keep current overlay pattern. Add:

- Show **both counts** on apply button: `58 в области · 14 917 всего`
- Don't close overlay until counts loaded (skeleton on button)

### 5. Performance guards (mobile)

| Guard | Target |
|---|---|
| Viewport fetch debounce | 600 ms on touch devices |
| Virtualization | Mandatory in list panel |
| Image loading | `loading="lazy"` + intersection observer |
| Max markers rendered | Respect 500 cap; cluster at z < 14 |
| `prefers-reduced-motion` | Disable pan animation on select |

---

## Spatial density on mobile

| Scenario | Expected viewport count | Mobile UX |
|---|---|---|
| Region zoom 11 | 100–180 | **Do not** show all in peek — use count + list toggle |
| Zoom 16 street | 10–40 | Peek strip viable |
| Geo 5 km + filters | 33 (measured) | Full list in panel OK |
| District filter | 3 | Peek shows all |

---

## Filter + geo on mobile

Geo drawing tools (if added) must not trigger sidebar refetch on every vertex — use «Применить область» confirm step.

Current URL-based geo (`geo_lat`, `geo_radius_m`, `geo_polygon`) works; polygon edits should debounce separately from pan bbox.

---

## Accessibility

| Requirement | Current | Target |
|---|---|---|
| Sidebar row focus | Button elements ✓ | Maintain in virtualized list |
| Active item announcement | None | `aria-live` on selection change |
| Map/list toggle | N/A | Toggle with `role="tablist"` |

---

## Rollout sequence (mobile)

1. Virtualize existing 200-row sidebar (no viewport) — low risk
2. Add map/list toggle with same data
3. Wire «В области» tab to viewport fetch behind flag
4. Bottom sheet selection UX
5. Viewport-driven markers (staging only)

---

## Blockers

| Blocker | Notes |
|---|---|
| No bottom sheet component | May use existing sheet primitive or build |
| Viewport count API | Needed for honest peek strip label |
| Listings mode coords | Mobile viewport sidebar blocked same as desktop |

---

## Conclusion

Mobile cannot stay on **40vh × 200 rows** under viewport architecture. Required: **map/list toggle**, **virtualized list panel**, **bottom sheet selection**, and **slower debounce** on touch. Hybrid counts must stack clearly on narrow screens.

No mobile changes in Iter 12.
