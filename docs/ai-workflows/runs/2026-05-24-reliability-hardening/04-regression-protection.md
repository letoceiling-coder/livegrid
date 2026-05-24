# 04 — Regression Protection

## Shared Contracts

`packages/shared/src/reliability/contracts.ts`

Protected invariants:
- Quality score 0–100
- SLA state enum stability
- Listing visibility enum
- Promotion tiers (STANDARD, PREMIUM, VIP)
- Automation cooldown minimum

## Tests

- `packages/shared/src/reliability/contracts.test.ts`
- Existing: `request-sla.test.ts`, map/viewport tests in web

## Command

```bash
pnpm test:reliability
```
