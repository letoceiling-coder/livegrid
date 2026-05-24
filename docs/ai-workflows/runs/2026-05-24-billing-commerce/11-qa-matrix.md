# 11 — QA Matrix

| Test | Expected | Status |
|------|----------|--------|
| Quota enforcement | FREE cannot order promotion | Unit ✓ |
| Invoice generation | Order creates ISSUED invoice | Manual |
| Promotion ordering | INVOICED status + line item | Manual |
| Subscription change | Admin plan POST creates subscription row | Manual |
| Usage tracking | Summary reflects listing count | Manual |
| Overdue handling | scan/overdue transitions status | Manual |
| Admin billing views | Metrics + accounts load | Manual |
| Mobile rendering | 360px quota bars + swipe | Manual |
| Pagination | invoices per_page capped at 50 | Code ✓ |
| Console errors | Zero on billing pages | Manual |
| Typecheck | `pnpm typecheck` | ✓ |
| Shared tests | 6 billing unit tests | ✓ |

## Commands

```bash
pnpm typecheck
pnpm --filter @lg/shared test
pnpm check:migrations
```
