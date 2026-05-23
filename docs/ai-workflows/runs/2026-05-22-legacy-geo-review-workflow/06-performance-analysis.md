# Iteration 22.6 — Performance Analysis

## Mode

PRODUCTION SAFETY · 2026-05-22

---

## Query strategy

### Candidate fetch (single query)

```sql
SELECT ... FROM listings
WHERE lat IS NOT NULL AND lng IS NOT NULL AND geo_source IS NULL
ORDER BY region_id ASC, id ASC
```

Uses partial index `listings_legacy_geo_review_idx`.

**Result set: 56 rows** — full table scan avoided via partial index on legacy predicate.

---

## No N+1

Single `findMany` with JOIN:

```typescript
block: { select: { slug, latitude, longitude } }
building: { select: { latitude, longitude } }
```

Decision lookup: one batch query for all listing IDs.

---

## Classification cost

56 rows × resolver classify = **< 10ms** in-process. Negligible.

---

## Pagination

Keyset cursor on `listingId` after deterministic sort. Default page size: 100.

With 56 total rows, single page returns all.

---

## Decision write cost

Single INSERT per decision. No listing UPDATE.

Verified: POST decision ~3ms excluding network.

---

## Production overhead

**Zero** — all endpoints return 503 in production.

Review table empty in production until DEV/staging review session.

---

## Scalability note

If legacy row count grows beyond 56:

- Partial index scales with legacy predicate cardinality
- Batch decision lookup O(n) single query
- In-memory classify acceptable up to ~10k legacy rows
- For larger sets: SQL-side filter + paginated classify

Current 56 rows: no optimization needed.

---

## Index recommendations (applied)

| Index | Status |
|---|---|
| `listings_legacy_geo_review_idx` (partial) | ✓ applied |
| `listing_geo_review_decisions_listing_id_created_at_idx` | ✓ applied |
| `listing_geo_review_decisions_status_idx` | ✓ applied |

No additional indexes required at current scale.
