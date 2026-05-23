# Iteration 25.1 — Frontend Source Switch

## Mode

DEV-ONLY FRONTEND VIEWPORT ACTIVATION · Stage 1 · 2026-05-22

---

## Goal

Enable viewport listings API as the **real map marker source** in DEV only, while sidebar remains on legacy 200-row catalog.

---

## Feature flag

| Guard | Implementation |
|---|---|
| URL param | `?viewport_listings=1` (required) |
| Environment | `import.meta.env.DEV` hard guard |
| localStorage | **Not allowed** — explicit URL only |
| Production | Impossible — flag returns `false` outside DEV |

New exports in `apps/web/src/redesign/lib/viewport-feature-flag.ts`:

- `isViewportListingsSourceEnabled()` — primary map source gate
- `isViewportListingsTrackingEnabled()` — shadow parity + bbox fetch (also true when `viewport_debug=1`)

---

## Hybrid architecture

```
RedesignMap
├── listingsQuery (legacy /listings, per_page=200)  → sidebar + shadow baseline
└── ListingsMapSearch
    ├── effectiveMapListings  → cluster layer (viewport when flag on)
    ├── listings prop         → sidebar sync + legacy parity
    └── useViewportListingsExperimental → bbox fetch + shadow metrics
```

### Activation flow

1. User opens `/map?region_id=1&viewport_listings=1&map_debug=1`
2. Map initially renders legacy 200-row markers (until viewport fetch completes)
3. On `prototype-api` success → `effectiveMapListings` switches to viewport DTOs (~6,533 Moscow bbox)
4. Cluster layer signature changes → full rebuild via existing `useMapClusterLayer`
5. Sidebar unchanged — still `listingItems` from `listingsQuery`

### Rollback

Remove `viewport_listings=1` from URL → instant return to legacy map source. No code deploy required.

---

## Files changed

| File | Change |
|---|---|
| `viewport-feature-flag.ts` | Stage 1 flag + tracking helper |
| `viewport-listings-source.ts` | DTO → `ListingMapItem` converter |
| `ListingsMapSearch.tsx` | `effectiveMapListings` state, hybrid source |
| `useViewportListingsExperimental.ts` | Default `enabled` uses tracking helper |
| `map-render-observability.ts` | `viewportListingsSourceActive`, `shadowStaleLegacyCap` |
| `MapDevOverlay.tsx` | Primary source banner + cap artifact warning |

---

## Explicit non-changes (correct)

- `listingsQuery` in `RedesignMap.tsx` — retained
- `fallbackCoords` — retained
- Legacy `/listings` API — retained
- Cluster layer architecture — retained (signature-gated rebuild only)
- Shadow overlay infrastructure — retained

---

## Manual test URL

```
/map?region_id=1&viewport_debug=1&viewport_listings=1&map_debug=1
```

Expected overlay: `viewport_listings: PRIMARY MAP SOURCE` in green when flag active.
