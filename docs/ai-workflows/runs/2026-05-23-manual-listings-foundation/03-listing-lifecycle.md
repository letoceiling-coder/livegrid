# Iter 44 — Phase 3: Listing Lifecycle

## Visibility states (canonical)

| Visibility | status | isPublished | publishedAt | archivedAt |
|------------|--------|-------------|-------------|------------|
| PUBLIC | ACTIVE | true | now | null |
| HIDDEN | ACTIVE | false | null | null |
| ARCHIVED | INACTIVE | false | null | now |
| DRAFT | DRAFT | false | null | null |

Single source of truth: `@lg/shared` → `visibilityToPublication()` / `applyLifecycleAction()`.

## Lifecycle actions

| Action | Result visibility |
|--------|-------------------|
| `publish` | PUBLIC |
| `republish` | PUBLIC |
| `hide` | HIDDEN |
| `archive` | ARCHIVED |
| `draft` | DRAFT |

**Endpoint:** `PATCH /admin/listings/:id/lifecycle`  
**Scope:** MANUAL only. Updates `last_activity_at` on every transition.

## Safe transitions

- No automatic deletion (explicit requirement)
- FEED listings: lifecycle rejected with 400
- Agent: must own listing (ownerUserId or external_id prefix)
- Manager+: any MANUAL listing

## Timestamps

| Field | Set when |
|-------|----------|
| `published_at` | publish/republish → PUBLIC |
| `archived_at` | archive → ARCHIVED |
| `last_activity_at` | create, update, lifecycle, assign |

## Stale governance (30+ days)

```typescript
isListingStale(lastActivityAt) // true if ≥ 30 days
```

- Surfaces **recommendation** in agent cabinet + admin table (`isStale` flag)
- `stale_only=true` admin filter: PUBLIC/HIDDEN + lastActivityAt < 30d
- **No auto-inactivation** from stale flag (distinct from legacy expire job)

## Legacy expire job (unchanged behavior)

`expireOldPublishedListings()` still moves listings with `publishedAt < 30d` to INACTIVE/unpublished.  
Iter 44 `publicationPatch()` now also sets `visibility=ARCHIVED` when status → INACTIVE.

## Public catalog gate

Anonymous queries (no `admin_view`):

```
visibility = PUBLIC
isPublished = true
status IN (ACTIVE, RESERVED)  // default when no status filter
```
