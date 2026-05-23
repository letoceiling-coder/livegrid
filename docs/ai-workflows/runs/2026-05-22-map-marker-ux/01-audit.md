# Iteration 2 — Marker Rendering Audit

## Mode

READ-ONLY audit before implementation · `@gstack/cso`

**Scope:** `apps/web/src/redesign/components/MapSearch.tsx`, `ListingsMapSearch.tsx`  
**Date:** 2026-05-22

---

## Architecture (pre-change)

```
RedesignMap.tsx
  ├─ blocks mode → MapSearch(complexes, activeSlug, onSelect)
  └─ listings mode → ListingsMapSearch(listings, activeId, onSelect)

MapSearch / ListingsMapSearch
  ├─ useYandexMapsReady() → init ymaps.Map once
  ├─ boundschange → setZoom(raw number)
  ├─ useEffect [complexes/listings, activeSlug/activeId, zoom] → destroy Clusterer, recreate all placemarks
  ├─ templateLayoutFactory.createClass(HTML string) per marker
  └─ active selection → floating React card (not Yandex balloon)
```

---

## MapSearch (blocks) — before

| Aspect | Behavior |
|---|---|
| Color | `#2563EB` normal, `#ef4444` active (red) |
| zoom < 12 | 16px dot (22px active) |
| zoom ≥ 12 | Colored pill with price inside (not white badge below) |
| No price | `${aptCount} кв.` — **not TZ compliant** |
| zoom > 14 | No name mode |
| Rebuild trigger | Every zoom integer change |
| Popup | Link wrapper, "Подробнее →" text |

---

## ListingsMapSearch — before

| Aspect | Behavior |
|---|---|
| Color | Same blue/red pattern |
| zoom ≥ 12 | Price in colored pill |
| No price | `formatPriceShort` → "Цена по запросу" ✓ |
| zoom > 14 | No name mode |
| Cluster preset | `islands#blueCircleClusterIcons` |

---

## Rebuild Triggers (audit finding)

```typescript
useEffect(..., [complexes, ready, activeSlug, onSelect, zoom]);
```

**Problem:** `zoom` in deps → full clusterer rebuild on **every** zoom step (11→12→13…), causing flicker.

**Iteration 2 fix:** bucket zoom into 3 modes (`dot` | `price` | `name`), rebuild only on threshold cross (12, 14).

---

## Clusterer (unchanged)

- Yandex `Clusterer` preserved
- Same presets
- Same click → `onSelect` flow
- Same `activeBlock` / sidebar sync via RedesignMap

---

## Price Formatting (before)

```typescript
// MapSearch — inline
c.priceFrom >= 1e6 ? (c.priceFrom / 1e6).toFixed(1) + ' млн' : ...
// Missing "Цена по запросу" for zero price
```

Shared `formatPrice` in mock-data uses `MIN_REASONABLE_PRICE_RUB = 100_000`.

---

## Popup Flow (before)

| Component | Trigger | UI |
|---|---|---|
| MapSearch | `activeSlug` set on marker click | Absolute bottom card, image + name + price + link |
| ListingsMapSearch | `activeId` toggle on click | Similar card |

No Yandex native balloon — React overlay. **Preserved in Iteration 2.**

---

## Gaps vs TZ

| TZ requirement | Pre-audit status |
|---|---|
| Blue #2563EB | Partial (red active) |
| 12px dot zoom < 12 | 16px |
| 20px dot + white badge zoom ≥ 12 | Colored pill instead |
| Name at zoom > 14 | Missing |
| "Цена по запросу" fallback | Missing on blocks |
| "Подробнее" button | Text link only |

---

## Files Inspected

| File | Role |
|---|---|
| `RedesignMap.tsx` | Data source, active state — **not modified in Iteration 2** |
| `MapSearch.tsx` | Block markers + popup |
| `ListingsMapSearch.tsx` | Listing markers + popup |
| `mock-data.ts` | `formatPrice`, `MIN_REASONABLE_PRICE_RUB` |
