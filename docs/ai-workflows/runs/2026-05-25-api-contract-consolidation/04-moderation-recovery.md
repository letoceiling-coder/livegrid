# 04 — Moderation Module Recovery

**Iteration:** 82 · **Date:** 2026-05-25

## Symptom

`/admin/moderation/listings` appeared broken in production — queue empty or **403** for admin users.

## Root causes

1. **Role mismatch** — controller had `@Roles('manager')` while frontend nav and service allowed `admin`, `editor`, `manager`.
2. Module was registered (`ListingsModule`) — route existed but rejected non-manager JWTs.

## Fix

`listings-moderation.controller.ts` — all endpoints now:

```typescript
@Roles('admin', 'editor', 'manager')
```

Service `assertModerator()` already accepted all three roles.

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/moderation/listings` | Queue with filters (status, region, agent, page) |
| GET | `/admin/moderation/listings/:id/review` | Review bundle (live vs pending + diff) |
| PATCH | `/admin/moderation/listings/:id` | Approve / reject / request revision |
| GET | `/admin/moderation/stats` | DEV observability metrics |

## Frontend

| Page | Behavior |
|------|----------|
| `AdminModerationListings` | Queue table, region/agent filters, pagination |
| `AdminModerationReview` | Single listing review tabs |

Query: `apiGet(\`/admin/moderation/listings?${qs}\`)`

## Verification

```bash
curl -H "Authorization: Bearer $JWT" \
  "https://livegrid.ru/api/admin/moderation/listings?page=1&per_page=5"
```

Expected: `200` with `{ data, meta }` for admin/editor/manager.

## Files

- `apps/api/src/modules/listings/listings-moderation.controller.ts`
- `apps/api/src/modules/listings/listings-moderation.service.ts`
- `apps/web/src/admin/pages/AdminModerationListings.tsx`
- `apps/web/src/admin/pages/AdminModerationReview.tsx`
