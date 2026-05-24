# 08 — RBAC Validation

**Iteration:** 69 · **Date:** 2026-05-24

## Matrix: role × capability

| Capability | client | agent | manager | editor | admin |
|------------|--------|-------|---------|--------|-------|
| Public catalog | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin shell | ❌ | ✅ | ✅ | ✅ | ✅ |
| Own manual listings | ❌ | ✅ | ✅ | ✅ | ✅ |
| Assign listing owner | ❌ | ❌ | ✅ | ✅ | ✅ |
| Listing wizard | ❌ | ✅ | ✅ | ✅ | ✅ |
| Moderation | ❌ | ❌ | ✅ | ❌ | ✅* |
| CRM requests | ❌ | partial | ✅ | ✅ | ✅ |
| Feed import | ❌ | ❌ | ❌ | ✅ | ✅ |
| User management | ❌ | ❌ | ❌ | ❌ | ✅ |
| System diagnostics | ❌ | ❌ | ❌ | ✅ | ✅ |

*Moderation controller `@Roles('manager')` — admin inherits via hierarchy on API.

## Agent isolation (employee scope)

Verified in `listings-governance.service.ts`:

- `assertAgentOwnsListing` — agent cannot edit others’ manual listings
- Wizard create — auto-sets `ownerUserId` for agent role
- Promotion purchase — owner or elevated role only

## Frontend vs API

| Layer | Model |
|-------|-------|
| API | Hierarchy (admin ≥ editor ≥ manager ≥ agent) |
| Frontend | Explicit role arrays per route |

Frontend is **stricter** in places (exact match) — acceptable defense in depth.

## Profile routing

| Role | Default admin landing |
|------|----------------------|
| agent | `/admin/my-listings` |
| manager | `/admin/requests` (via index redirect) |
| editor/admin | `/admin` dashboard |

## Request assignment

- `requests.assigned_to` → human `User` (typically manager)
- Assignee picker filters roles: manager, agent, editor, admin

## Issues found

| Issue | Severity |
|-------|----------|
| `director` role absent | Doc/naming only |
| Internal `*Intelligence*` service names | Low — staff-only |

## Verdict

RBAC **validates agent = human employee** with proper ownership boundaries. **Pass.**
