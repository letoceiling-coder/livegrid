# Iteration 15.4 — Geo + Bbox Semantics

## Formal rule (Iter 15)

```
result = catalog(filters, region) ∩ bbox(envelope)
```

**Symbol:** `catalog_and_bbox` — exposed in `meta.geoComposition`.

**Never:** `catalog OR bbox`  
**Never:** bbox replaces geo filter  
**Never:** geo replaces bbox when both present

---

## Geo filter semantics (unchanged from Iter 10)

1. `GeoSpatialService.resolveGeoBlockIds()` → block ID set (radius / polygon / preset)
2. Intersect with catalog Prisma where → `where.id IN (geoIds)`
3. SQL path: geo IDs embedded in `catalogBlockWhereToSql`

Geo is a **catalog pre-filter**, not a map viewport substitute.

---

## Bbox semantics

```sql
ST_Within(
  ST_MakePoint(longitude, latitude),
  ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
)
```

- Requires non-null lat/lng
- Axis-aligned envelope (not rotated map bounds)
- Matches client `filterByBbox()` for axis-aligned cases

---

## Combined examples (measured)

| Scenario | total | visible | Interpretation |
|---|---|---|---|
| Moscow bbox, no geo | 359 | 181 | 178 blocks off-screen or outside bbox |
| Geo 5 km + same bbox | 33 | 33 | Geo shrinks catalog; bbox further clips |
| Geo 5 km, bbox ⊃ circle | 33 | 33 | All geo results inside bbox |
| Empty world bbox | 0 | 0 | Valid query, empty envelope |
| High zoom tiny bbox (z16) | 359 | **0** | No blocks in 2km window — valid |
| Wrong region | 0 | 0 | Catalog empty |

**Geo + bbox live:** total=visible=returned=**33** — triple equality proves intersection not union.

---

## Priority when both present

| Step | Operation |
|---|---|
| 1 | Apply region + catalog filters (incl. geo ID set) |
| 2 | Count `total` without bbox |
| 3 | Apply bbox envelope |
| 4 | Count `visible` |
| 5 | Apply sort + cursor + limit → `returned` |

No priority override — strict AND.

---

## Empty / invalid cases

| Case | Behavior |
|---|---|
| `sw_lat >= ne_lat` | `reason: invalid_bbox`, empty data |
| `zoom < 10` (client) | Client skips fetch — server accepts any zoom |
| Zoomed-out world | Large visible count, capped by `limit` 500 |
| Geo noMatch | Empty before bbox — `total=0` |

---

## Zoomed-out Moscow

At region zoom (~11), bbox may cover full region:

- `visible` approaches `total` (181 vs 359 — not full region bbox in test)
- `density` ~1207 objects/deg² (high — urban core bbox)

At country zoom — client should not fetch (`VIEWPORT_MIN_ZOOM=10`).

---

## Listings geo

Same AND intent via ID list + bbox SQL.

**Blocker:** listings without lat/lng never enter geoWhere — `total=0` in live test.

---

## Fallback path

When `catalogBlockWhereToSql` returns null:

- Prisma ID enumeration → SQL IN list
- Geo ∩ bbox still AND
- `meta.catalogParity: id-fallback`

---

## Conclusion

Geo+bbox composition is **formally AND-only**, validated by live geo case (33=33=33) and documented edge cases. Client and server both treat bbox as spatial window atop catalog-filtered set.
