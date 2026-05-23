# UX Audit

## Mode

READ-ONLY · map page user flows · production-like data

**Page:** `http://localhost:5173/map`  
**Primary persona:** buyer searching new-build apartments in Moscow (region 1)

---

## Executive Summary

| Severity | UX Issue | User impact |
|---|---|---|
| **P0** | Map shows max 200 objects; API has 359 | User thinks catalog is complete — 44% hidden |
| **P0** | Subtitle count = loaded count, not `meta.total` | "200 объектов" instead of "359" |
| **P1** | Full-page loading on every filter refetch | Map markers disappear during sidebar "Загрузка…" |
| **P1** | Search filters only within loaded 200 items | Suggestions miss 159 blocks |
| **P2** | `rooms` / `dachas` tabs show permanent empty state | Dead-end UX |
| **P2** | Secondary apartments: fake map positions | Misleading geography |
| **P2** | Mobile sidebar limited to 40vh | Cramped list, scroll fights map |
| **P3** | No empty-state differentiation (filter vs no data) | Same message for all zero results |

---

## Loading UX

### Initial load sequence

1. Region resolves (spinner via `regionLoading`)
2. 7 parallel API calls
3. `subtitle` shows "Загрузка…" until blocks/listings fetch completes
4. Map renders markers in batch after data arrives — **no skeleton markers**
5. Sidebar shows "Загрузка…" text node — previous list cleared

### Refetch behavior

```typescript
const loading = blocksQuery.isPending || blocksQuery.isFetching;
```

When user changes filter:

- Cached map data: **not shown** during refetch in sidebar (loading replaces list)
- Map: previous markers remain until new data arrives (MapSearch keeps old `complexes` until query resolves)
- **Map/list desync during fetch:** old markers visible, sidebar empty — confusing

**Measured wait:** 180–310 ms per filter change (cold), 33 ms warm — user may perceive flash on cold.

---

## Filter UX

### Desktop

- Left sidebar 280px — full `FilterSidebar`
- Filters apply immediately on change (no "Apply" button)
- Each change → URL update → API refetch

### Mobile

- Filters hidden; button "Фильтры" opens full-screen overlay
- Must tap "Показать N объектов" to close — N is wrong if truncated (see count issue)
- Duplicate FilterSidebar mount in overlay — state shared via props (OK)

### Search field

- Placeholder: "Поиск по ЖК, адресу, району"
- Suggestions dropdown (max 6) — client-side filter on **loaded data only**
- Every keystroke updates URL immediately

**UX gap:** typing "Символ" won't suggest blocks on page 2 not yet loaded.

### Active filter tags

FilterSidebar shows removable tags + reset — works well. Not a bottleneck.

---

## Object Type Switching

| Tab | Behavior |
|---|---|
| Квартиры | Blocks map (ЖК markers) — default |
| Комнаты | `isUnsupportedSeparateType` → "Нет объявлений, добавьте первым" |
| Дома / Участки / Коммерция | Listings map |
| Дачи | Same unsupported empty state |

**UX issue:** Rooms/Dachas tabs are visible in tab bar (from `OBJECT_TYPE_TABS`) but hard-disabled in data layer — users see tab, get empty state. kind-counts may show APARTMENT count for rooms tab label.

### Market type (primary / secondary)

- Primary → blocks mode
- Secondary → listings mode with approximate coords for missing lat/lng
- Switch triggers completely different map component (`MapSearch` ↔ `ListingsMapSearch`) — **full map remount behavior** (different component tree)

---

## Map / List Sync

### Intended behavior

- Click sidebar row → highlight marker (`activeBlock` / `activeListing`)
- Click marker → select + balloon/card

### Observed architecture cost

Selection change rebuilds all markers — user may perceive lag on click at N=200.

### Sync gaps

| Scenario | Map | List |
|---|---|---|
| 159 blocks on page 2 | not shown | not shown |
| Filter refetch in progress | old data | "Загрузка…" |
| Secondary fake coords | spiral pattern | correct titles/prices |

---

## Empty States

```typescript
blocks.length === 0 → "Нет объектов по фильтрам."
isUnsupportedSeparateType → "Нет объявлений, добавьте первым"
```

No distinction between:

- Over-filtered (could relax filters)
- Geo zone empty
- API error (query error not surfaced in UI — silent empty)

React Query error state not rendered in RedesignMap — **failed fetch looks like empty catalog**.

---

## Mobile UX

| Element | Layout | Issue |
|---|---|---|
| Map | flex-1, min-h-0 | Good — uses available space |
| List | max-h 40vh, bottom panel | Only ~4-5 cards visible |
| Header + search + region | stacked above map | Reduces map area |
| Filter overlay | full screen | OK pattern |
| Touch targets | 44px+ on buttons | Adequate |

**Scroll behavior:** list scroll inside 40vh panel — map doesn't move (good). No swipe-between map/list.

---

## Marker Interaction

### Blocks (MapSearch)

- Zoom < 12: small dot markers
- Zoom ≥ 12: price pills ("от X млн")
- Active: red (#ef4444) vs blue (#2563EB)
- Cluster click: zoom in (Yandex default)

### Listings (ListingsMapSearch)

- Similar price pill pattern
- Photo not shown on marker — only in sidebar

**UX gap:** no marker count badge on clusters (Yandex preset default only).

---

## Map Responsiveness

| Action | Response | Perceived quality |
|---|---|---|
| Pan | smooth (Yandex) | Good |
| Zoom | triggers marker rebuild at 12 threshold | Noticeable delay possible |
| Filter change | 200–900ms cold network + rebuild | Sluggish on cold |
| Region change | full refetch all queries | Expected delay |

No optimistic UI or transition animations for marker updates.

---

## Accessibility / Polish (observed)

- Images have `alt=""` — decorative only
- Keyboard: search focus works; map markers Yandex-default
- Color-only active state (red/blue) — sufficient contrast

Not primary perf focus — no blockers identified for perf audit scope.

---

## Production UX Issues Ranked

1. **Incomplete catalog on map** (200/359) — trust issue
2. **Wrong object count in subtitle** — trust issue
3. **Sidebar flash on refetch** — perceived instability
4. **Search suggestions incomplete** — discoverability
5. **Secondary map fake locations** — misleading unless disclosed
6. **Dead tabs (rooms/dachas)** — confusion
7. **No error state** — silent failures

---

## Reproducibility (manual test script)

1. Open `/map` — note subtitle count vs Network tab `meta.total`
2. Zoom to level 12+ — observe marker style change delay
3. Apply room filter — note sidebar blanking during load
4. Switch to secondary — check if markers cluster at center
5. Mobile 375px — verify 40vh list usability
6. Disconnect API — verify UI (expect misleading empty state)

---

## Positive UX Patterns (keep in refactors)

- URL-synced filters (shareable links)
- Region selector above map
- Sidebar ↔ map selection linking
- Mobile filter overlay with apply button
- `useDeferredValue` on search (partial)
