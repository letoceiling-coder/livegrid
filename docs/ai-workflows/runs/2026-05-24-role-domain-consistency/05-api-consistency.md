# 05 — API + DB Consistency

**Iteration:** 69 · **Date:** 2026-05-24

## Single business language map

| Concept | DB | API/DTO | Frontend |
|---------|----|---------|----------|
| Human employee role | `users.role = agent` | JWT `role`, `@Roles('agent')` | `UserRole` |
| Listing owner | `listings.owner_user_id` | `ownerUserId`, `assign` | `ownerUserId`, `ownerMode` |
| Feed vs manual | `listings.data_source` | `dataSource` | wizard / badges |
| Public visibility | `listings.visibility` | `visibility` | catalog filters |
| Public contact kind | — (computed) | `publicContact.kind` | `agent` \| `agency` |
| Realtor profile | `agent_profiles` | `/ecosystem/agents/:slug` | `PublicAgentPage` |
| CRM assignment | `requests.assigned_to` | assignee user UUID | AdminRequests |
| Task assignment | `crm_followup_tasks.assignee_id` | User UUID | AdminTasks |

## No `agent_id` on listings

API consistently uses **`ownerUserId`** — aligns with “owner employee” semantics and avoids AI confusion.

## DTO consistency

- `listing-wizard.dto.ts` — `ownerMode: 'self' | 'agent' | 'agency'` (human modes)
- `ListingPublicContact` — shared package type with `kind: 'agent'` = human
- Ecosystem DTOs — `UpsertAgentProfileDto` for human public profile

## RBAC middleware

- Global `RolesGuard` on API (hierarchy)
- `@Public()` for catalog, ecosystem public pages
- Listing detail enriches `publicContact` in governance layer — single source

## Admin filters

- Moderation: filter by agent (`owner_user_id`)
- Requests: assign to manager/agent users
- Listings admin: `owner_user_id` query param

## Verdict

**Single business language** across Prisma, NestJS, shared package, and React. No dual agent/AI vocabulary in API surface.
