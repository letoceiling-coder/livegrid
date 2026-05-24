# 11 — QA Matrix

| # | Test | Expected |
|---|------|----------|
| 1 | Create draft → server POST | listingId assigned, visibility DRAFT |
| 2 | Autosave after edit | version increments, indicator «Сохранено» |
| 3 | Refresh mid-wizard | Server hydration restores fields |
| 4 | Edit `/wizard/:id/edit` | Full payload loaded |
| 5 | Publish draft | PUBLIC visibility |
| 6 | Edit published listing | isPendingRevision=true, public unchanged |
| 7 | Approve pending revision | Live data updates |
| 8 | Moderation on + agent publish | submit_review or 403 on lifecycle |
| 9 | Manager reject with note | REJECTED + note visible |
| 10 | Version conflict (two tabs) | 409 + conflict UI |
| 11 | Media reorder autosave | Order in snapshot |
| 12 | My-listings DRAFT link | Opens wizard edit |
| 13 | Mobile 360px | Footer + forms usable |
| 14 | Feed/CRM smoke | No regression |

## Automated

- `@lg/shared` build ✓
- `apps/web` tsc ✓
- `apps/api` tsc ✓

## Pre-deploy

Run migration on staging:

```bash
pnpm --filter @lg/database exec prisma migrate deploy
```
