# 02 — Role Model Validation

**Iteration:** 69 · **Date:** 2026-05-24

## Canonical business roles (stated)

client · agent · manager · admin · **director**

## Implemented roles (`UserRole` enum)

```prisma
enum UserRole {
  admin
  editor      // ← not in stated canonical list
  manager
  agent
  client
}
```

**Gap:** `director` role **does not exist** in schema or RBAC.  
**Mapping:** `editor` functions as **content/catalog operations** role (pages, feed import, reference data) — closest to a “director of content/operations” but named `editor`.

## RBAC hierarchy (`roles.guard.ts`)

| Role | Level | Business meaning |
|------|-------|------------------|
| admin | 100 | Full platform |
| editor | 80 | Content, catalog ops, feed import |
| manager | 60 | CRM, moderation, team ops |
| agent | 40 | Own listings, manual objects |
| client | 20 | Public account |

Guard uses **minimum level** — higher roles inherit lower endpoints.

## Route guards (frontend)

- `RequireAuth` — exact role list match (no hierarchy on FE)
- Admin shell: `roles={['admin', 'editor', 'manager', 'agent']}`
- Agent home redirect: `user.role === 'agent'` → `/admin/my-listings`
- Manager/admin/editor → dashboard/requests paths

## API `@Roles()` coverage

- **agent** — listing wizard, promotions (self), CRM conversations, media upload
- **manager** — moderation, promotion admin, CRM automation read
- **editor** — feed import, system diagnostics, sitemap, trust admin
- **admin** — users, destructive ops, billing overrides

## Validation: agent = employee only

All `@Roles('agent')` endpoints operate on:
- `ownerUserId` (human user UUID)
- `AgentProfile` (human public page)
- CRM assignee = `User` row

**No autonomous agent runtime** in any guarded path.

## Recommendation (document only — no schema change this iter)

If business requires explicit **director** role:
- Either alias `editor` → «Директор» in UI, or
- Add `director` enum value with hierarchy between manager and admin

Current state is **internally consistent** with `editor` substituting for director-like duties.

## Verdict

RBAC is **coherent and employee-centric**. Minor **nomenclature gap**: `director` vs `editor`.
