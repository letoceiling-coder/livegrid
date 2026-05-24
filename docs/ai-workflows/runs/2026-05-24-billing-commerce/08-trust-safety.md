# 08 — Trust + Safety

## Rules enforced in code

| Rule | Implementation |
|------|----------------|
| Unpaid invoice ≠ auto-delete | No listing status mutation on OVERDUE |
| Moderation independent | No billing checks in moderation service |
| Trust independent of tier | Trust scan unchanged |
| Promotion quota bounded | `assertWithinQuota` on order create only |
| No destructive financial enforcement | Plan change never archives listings |

## Fulfillment gate

Promotion applies only after invoice PAID + explicit fulfill action.
