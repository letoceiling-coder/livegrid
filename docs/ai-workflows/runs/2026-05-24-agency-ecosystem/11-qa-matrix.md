# 11 — QA Matrix

| Test | Status |
|------|--------|
| Public agency page | Manual |
| Agent profile | Manual |
| Trust visibility | Unit ✓ |
| Branding moderation | Manual |
| Premium themes | Unit ✓ |
| Discovery rankings | Unit ✓ |
| Mobile 360px | Manual |
| Privacy (phone/email flags) | Code ✓ |
| Pagination cap 24 | Code ✓ |
| `pnpm typecheck` | ✓ |
| Shared tests (7 ecosystem) | ✓ |

```bash
pnpm typecheck
pnpm --filter @lg/shared test
pnpm check:migrations
```
