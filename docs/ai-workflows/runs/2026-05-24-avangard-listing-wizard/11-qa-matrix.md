# 11 — QA Matrix

## Manual checks (pre-deploy)

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Create APARTMENT → publish | Visible in catalog, lifecycle PUBLIC |
| 2 | Create ROOM → draft | DRAFT visibility, my-listings tab |
| 3 | Create HOUSE with geo search | lat/lng + address filled |
| 4 | Create DACHA | Stored as HOUSE kind |
| 5 | Create LAND / COMMERCIAL / PARKING | Correct API endpoint |
| 6 | Agent upload photo in wizard | No 403 on media upload |
| 7 | Manager assign other agent | assign PATCH succeeds |
| 8 | Archive on create | ARCHIVED visibility |
| 9 | Refresh mid-wizard | localStorage v2 restores draft |
| 10 | Reset draft | Clears storage, step 0 |
| 11 | Validation: missing price | Russian error, stay on step |
| 12 | Mobile 360px | Footer visible, no horizontal scroll |
| 13 | Preview card | Matches catalog card layout |
| 14 | CRM / map / feed import | Smoke — no regression |

## Automated

- `pnpm --filter @lg/shared build` ✓
- `apps/web tsc --noEmit` ✓
- `apps/api tsc --noEmit` ✓

## Console

Zero errors expected on wizard path in devtools during happy path.
