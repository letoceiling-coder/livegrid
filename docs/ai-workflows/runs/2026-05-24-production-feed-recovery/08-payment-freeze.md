# 08 — Payment feature freeze

**Policy doc:** `docs/architecture/NO_PUBLIC_PAYMENTS.md`

## Iteration 59 + 66 audit

| Check | Result |
|-------|--------|
| Payment gateway SDK | ❌ Not in codebase |
| Public checkout | ❌ None |
| Acquiring webhooks | ❌ None |
| Billing admin | ✅ Internal ops only |
| Promotion API | ✅ Manual fulfillment, swagger notes "no payment gateway" |

## Architecture label

**NO PUBLIC PAYMENT SYSTEM** — billing remains internal operational tooling.

No expansion in iter 66.
