# Iteration 17.5 — UI Truthfulness RFC

## Mode

ARCHITECTURE RFC · honest UX · 2026-05-22

---

## Purpose

Define how the UI **communicates geo approximation** to users — preventing silent fake precision while preserving usable map experiences.

---

## Design principles

1. **Never lie by omission** — approximate coords require visible disclosure
2. **Tier drives UI** — same pin styling must not imply same precision
3. **Progressive disclosure** — badge at pin level, detail at card/popup level
4. **Routing honesty** — disable or qualify navigation for non-EXACT
5. **Consistency** — map, sidebar, detail page use same tier vocabulary

---

## Current UI gaps

| Surface | Issue |
|---|---|
| Secondary listing pins | `fallbackCoords` — no disclosure |
| Apartment detail map | Block centroid — looks like unit location |
| Listing popup (map click) | Price + photo — no geo qualifier |
| `ListingLocationMap` | Geocoded address — no match quality shown |
| Block map | Correct semantics but no "JK center" label |

---

## Tier → UI treatment matrix

| GeoQuality | Pin style | Badge | Tooltip | Popup | Detail page map |
|---|---|---|---|---|---|
| EXACT | Standard blue pin | None | Address | Full address + "На карте" | Pin at coords |
| BUILDING_CENTROID | Blue pin, dashed ring | `≈` corner chip | "Расположение корпуса" | "Корпус на карте, не квартира" | Pin + disclosure |
| BLOCK_CENTROID | Cluster or dot | `JK` chip | "Центр жилого комплекса" | "Примерное расположение в ЖК" | Link to JK map |
| APPROXIMATE_UI_ONLY | **Deprecated** gray pin | `~` warning | "Местоположение не определено" | "Объект без адреса на карте" | No map / address text only |
| MISSING | No pin | — | — | "Нет данных о местоположении" | No map section |

---

## UI components (proposed)

### GeoApproxBadge

Small non-interactive chip on marker layout:

```tsx
// Pseudocode — NOT for implementation this iteration
<GeoApproxBadge tier="BLOCK_CENTROID" />
// Renders: "≈ ЖК" with aria-label="Примерное расположение — центр жилого комплекса"
```

Placement: top-right of marker label box, not obscuring price.

### GeoDisclosureLine

Single line for popups and detail pages:

| Tier | Copy (RU) |
|---|---|
| EXACT | *(none)* |
| BUILDING_CENTROID | «На карте показан корпус, не точка квартиры» |
| BLOCK_CENTROID | «На карте — центр жилого комплекса, не адрес квартиры» |
| APPROXIMATE_UI_ONLY | «Местоположение на карте не подтверждено» |
| MISSING | «Местоположение не указано» |

### MapLegend

Collapsible legend on map views with approximate markers:

```
[●] Точное расположение
[◌] Примерное — корпус
[○] Примерное — жилой комплекс
```

Show when `anyApproximate === true` in viewport meta.

---

## Interaction rules

### Click / select

| Tier | Pan behavior | Zoom target |
|---|---|---|
| EXACT | Pan to pin | 16 |
| BUILDING_CENTROID | Pan to building centroid | 15 |
| BLOCK_CENTROID | Pan to JK OR open JK card | 14 (JK overview) |
| APPROXIMATE_UI_ONLY | Do not pan | — |

Current `ListingsMapSearch` pans all active listings to zoom 15 — **must be tier-gated**.

### Routing / "Построить маршрут"

| Tier | Yandex routing button |
|---|---|
| EXACT | ✓ Enable |
| BUILDING_CENTROID | ✗ Hidden, or "Маршрут к корпусу" with disclaimer |
| BLOCK_CENTROID | ✗ Hidden |
| APPROXIMATE_UI_ONLY | ✗ Hidden |

### Distance display

| Context | BUILDING/BLOCK tier |
|---|---|
| Sidebar "X km from center" | ✗ Hide |
| "X min to metro" (from block_subways) | ✓ OK — not computed from pin |
| Sort by distance | ✗ Disable |

Block subway distances are **attribute data** from feed — not derived from map pin. These remain truth-safe.

---

## Surface-specific recommendations

### RedesignMap — secondary apartments

**Current:** `fallbackCoords()` spiral  
**Target (RFC):**

1. If listing has block FK → show BLOCK_CENTROID pin with badge (no spiral)
2. If no block FK and no EXACT → MISSING (no pin, sidebar only)
3. Remove `fallbackCoords` from map pipeline entirely

### RedesignApartment — detail map

**Current:** `complex.coords` (block centroid) at zoom 15  
**Target:**

- Keep block centroid pin (correct for JK context)
- Add `GeoDisclosureLine`: «Центр жилого комплекса»
- Do not label as "Расположение квартиры"

### ListingLocationMap — geocoded address

**Current:** Client-side Yandex geocode, binary ok/failed  
**Target:**

- Classify result as EXACT (kind=house match) or BUILDING_CENTROID (street match)
- Show match quality: «Адрес найден приблизительно» vs «Точный адрес»
- On failed: keep current "Точный адрес не найден" overlay

### Viewport popup (future)

When viewport markers enabled:

```tsx
<Popup listing={marker}>
  <GeoApproxBadge tier={marker.geoQuality} />
  <GeoDisclosureLine tier={marker.geoQuality} />
  {marker.routingAllowed && <RouteButton coords={[marker.lat, marker.lng]} />}
</Popup>
```

---

## Accessibility

| Element | Requirement |
|---|---|
| Badge | `aria-label` with full tier description |
| Legend | Available via keyboard, not hover-only |
| MISSING | Announce "объект без карты" in sidebar selection |
| Color | Do not rely on color alone — use `≈` symbol + text |

---

## APPROXIMATE_UI_ONLY deprecation UX

Phased removal of spiral fallback:

| Phase | User-visible change |
|---|---|
| 1 | Add gray `~` badge to spiral pins (immediate honesty) |
| 2 | Replace spiral with BLOCK_CENTROID where block FK exists |
| 3 | Remove spiral; MISSING for remainder |
| 4 | Viewport launch with full tier contract |

---

## Non-goals (this iteration)

- No component implementation
- No frontend changes
- No copy deployed to production

This RFC defines **target UX contract** for geo-honest map product.
