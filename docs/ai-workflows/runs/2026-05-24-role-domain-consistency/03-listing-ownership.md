# 03 — Listing Ownership Model

**Iteration:** 69 · **Date:** 2026-05-24

## Schema (actual fields)

| Stated in TЗ | Implemented | Notes |
|--------------|-------------|-------|
| `listings.agent_id` | **`owner_user_id`** (`ownerUserId`) | Human employee UUID |
| `listings.source` | **`data_source`** (`FEED` \| `MANUAL`) | |
| `listings.visibility` | **`visibility`** | PUBLIC, REVIEW, REJECTED, etc. |

There is **no** `agent_id` column — ownership is **`User` relation** via `ownerUserId`.

## Business rules (implemented)

### FEED listings (`dataSource: FEED`)

- Shared inventory from TrendAgent feed
- Typically **no** `ownerUserId` (agency-wide)
- Public contact: **agency/builder** via `resolveListingPublicContact()`
- Label: «Контакт агентства»

### MANUAL listings (`dataSource: MANUAL`)

- Created by staff via wizard / manual forms
- **`ownerUserId`** set to responsible employee (agent role enforced on self-create)
- Public contact: **employee** when `ownerUser` present
- Label: «Ответственный агент»

## Core logic

```typescript
// packages/shared/src/listings/listing-contact.ts
if (listing.dataSource === 'MANUAL' && listing.ownerUser) {
  return { kind: 'agent', userId, fullName, phone, ... };
}
return { kind: 'agency', label: builder.name || 'Агентство', phone, ... };
```

## Governance (`listings-governance.service.ts`)

- Agents may only mutate **own** manual listings (`ownerUserId === actor.userId`)
- Feed listings protected by `externalId` prefix guard
- `assignOwner()` — manager/admin assigns human `User` with role agent|manager|editor|admin

## Wizard ownership modes

| `ownerMode` | Behavior |
|-------------|----------|
| `self` | Agent creates for self |
| `agent` | Manager assigns another employee |
| `agency` | No personal agent — agency contact (like feed) |

## UI alignment

| Surface | FEED | MANUAL |
|---------|------|--------|
| `RedesignListingDetail` | Agency contact card | Agent or agency per resolver |
| Wizard `ListingWizardAgentStep` | N/A (manual only) | Agent/agency picker |
| Moderation | — | Shows `ownerUser.fullName` |

## Verdict

Ownership model is **correct and consistent**. Term **`ownerUserId`** preferred over `agent_id` — avoids confusion with AI “agent”.
