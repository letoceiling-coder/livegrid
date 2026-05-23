# Iteration 22.3 — Review API Contract

## Mode

PRODUCTION SAFETY · DEV-only · 2026-05-22

---

## Endpoints

All gated: `NODE_ENV !== production`

### GET `/api/v1/geo/_shadow/legacy-review`

List SHADOW_UNCLASSIFIED rows.

Query params: `cursor`, `limit`, `regionId`

Response:

```json
{
  "shadow": true,
  "readOnly": true,
  "total": 56,
  "pendingReview": 55,
  "items": [...],
  "nextCursor": null
}
```

### GET `/api/v1/geo/_shadow/legacy-review/stats`

Review metrics:

```json
{
  "shadow": true,
  "metrics": {
    "pendingReview": 55,
    "approvedExact": 1,
    "approvedInherit": 0,
    "invalid": 0,
    "skipped": 0,
    "unresolved": 55,
    "shadowUnclassified": 56
  }
}
```

### GET `/api/v1/geo/_shadow/legacy-review/:id`

Single row + immutable decision history.

### POST `/api/v1/geo/_shadow/legacy-review/decision`

Record human decision. **Writes to review table only.**

Request:

```json
{
  "listingId": 109902,
  "reviewStatus": "APPROVED_AS_EXACT",
  "reviewer": "admin@example.com",
  "decisionReason": "manual belgorod house — preserve exact coords"
}
```

Response:

```json
{
  "decision": { "id": 1, "listingId": 109902, ... },
  "intent": {
    "allowed": true,
    "preserveCoords": true,
    "futureGeoSource": "MANUAL_EXACT",
    "futureGeoQuality": "EXACT"
  },
  "listingGeoUnchanged": true
}
```

---

## Review row fields

| Field | Source |
|---|---|
| listingId | listings.id |
| regionId | listings.region_id |
| lat/lng | listings (current) |
| address | listings.address |
| slug | block.slug or `listing-{id}` |
| buildingId / blockId | FK |
| proposedInheritLat/Lng | building/block centroid |
| proposedSource/Quality | resolver shadow suggestion |
| coordDeltaMeters | haversine(stored, inherit) |
| resolverReason | dry-run classification reason |
| reviewStatus | latest decision or PENDING_REVIEW |

Sort: `ORDER BY region_id ASC, id ASC`

---

## Error codes

| Code | HTTP |
|---|---|
| LISTING_NOT_FOUND | 400 |
| NOT_SHADOW_UNCLASSIFIED | 404 |
| ALREADY_MATERIALIZED | 400 |
| INVALID_COORDS | 400 |
| DUPLICATE_FINAL_DECISION | 400 |
| MISSING_BUILDING_FK | 400 |
| MISSING_BLOCK_FK | 400 |
| REVIEWER_REQUIRED | 400 |

---

## CLI equivalent

No separate CLI — use HTTP endpoints or service directly in DEV.
