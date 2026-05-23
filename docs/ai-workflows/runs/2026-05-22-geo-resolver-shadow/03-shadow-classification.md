# Iteration 19.3 — Shadow Classification

## Mode

DATA PLATFORM IMPLEMENTATION · legacy handling · 2026-05-22

---

## Trigger

```
listing.lat IS NOT NULL
AND listing.lng IS NOT NULL
AND listing.geoSource IS NULL
```

Also triggered when `geoSource` set but `geoQuality` null (partial lineage).

**Does not fall through to inherit** — listing row coords take precedence for shadow analysis.

---

## Output shape

```typescript
{
  status: 'SHADOW_UNCLASSIFIED',
  lat, lng,
  suggestedSource: GeoSource,
  suggestedQuality: ResolvedGeoQuality,
  suggestedConfidence: number,
  suggestedGeoEntityId: number | null,
  suggestedGeoEntityKind: GeoEntityKind | null,
  resolutionPath: 'LEGACY_SHADOW',
}
```

---

## Classification algorithm

`classifyLegacyShadow()` in `geo-resolver.utils.ts`:

| Condition | suggestedSource | suggestedQuality |
|---|---|---|
| Coords match building parent | BUILDING_INHERIT | BUILDING_CENTROID |
| Coords match block parent | BLOCK_INHERIT | BLOCK_CENTROID |
| MANUAL, no block/building FK | MANUAL_EXACT | EXACT |
| buildingId, coords don't match | UNKNOWN | BUILDING_CENTROID |
| blockId only, coords don't match | UNKNOWN | BLOCK_CENTROID |
| Else | UNKNOWN | EXACT |

---

## Iter 16 context

56 listings in DB have coords without lineage — shadow path covers these rows.

Example MSK FEED apartments: **no coords** → inherit path (BUILDING/BLOCK), not shadow.

---

## No auto-actions

| Forbidden | Reason |
|---|---|
| Persist suggestion | Iter 19 shadow-only |
| Upgrade to EXACT automatically | Requires admin/review for UNKNOWN |
| Downgrade stored EXACT | Transition safety |
| Write geo fields | No schema migration in Iter 19 |

---

## Materialize stub behavior

`materializeListingGeo()` on SHADOW_UNCLASSIFIED:

```typescript
{
  action: 'STUB_WOULD_WRITE',
  reason: 'legacy_classification_requires_review',
  payload: { ...suggestion fields... }
}
```

Human review required before real write (Iter 21+).

---

## DEV observability

`GEO_RESOLVER_DEBUG=1` + `NODE_ENV !== production`:

```json
{
  "listingId": 123,
  "resolutionPath": "LEGACY_SHADOW",
  "status": "SHADOW_UNCLASSIFIED",
  "source": "UNKNOWN",
  "quality": "BUILDING_CENTROID",
  "shadowClassification": true
}
```

See `geo-resolver-debug.ts`.
