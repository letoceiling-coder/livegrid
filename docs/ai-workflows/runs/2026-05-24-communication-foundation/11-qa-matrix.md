# 11 — QA Matrix

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Submit LeadForm | Request + thread + buyerToken in response/localStorage | Manual |
| 2 | Open request communication tab | Thread loads, messages visible | Manual |
| 3 | Assign manager | AGENT participant synced | Manual |
| 4 | Add manager note | NOTE in thread + timeline event | Manual |
| 5 | Schedule callback past time | Overdue chip in panel | Manual |
| 6 | Unread state | Inbox highlights until mark read on open | Manual |
| 7 | `@uuid` mention | MANAGER_MENTIONED notification | Manual |
| 8 | Anonymous buyer inquiry | GET/POST by token works | Manual |
| 9 | Buyer reply | BUYER_REPLY to assignee | Manual |
| 10 | Mobile 360px | Tabs + sticky bar usable | Manual |
| 11 | Stale thread | 48h+ chip on inactive open request | Manual |
| 12 | Timeline linkage | Contact/callback/note in events | Manual |
| 13 | Console errors | Zero on admin + profile flows | Manual |
| 14 | `pnpm typecheck` | Pass | **PASS** |

## Regression guards

- CRM list/detail/SLA unchanged
- Moderation, listings, retention routes load
- Existing notes endpoint still works

## Pre-deploy

```bash
pnpm --filter @lg/database migrate deploy  # staging first
```

Migration: `20260524400000_crm_communication`
