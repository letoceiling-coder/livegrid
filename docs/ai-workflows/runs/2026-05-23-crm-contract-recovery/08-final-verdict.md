# Iter 42 — Final Verdict

## Question

> Why is the admin CRM panel unstable (404 notifications, 400 workload), and how to restore contract integrity without removing Iter 33–41 features?

## Answer

# GO_WITH_HOLD

**Root cause:** Stale API dev process missing CRM route registration + workload shadowed by `:id` on older builds.

---

## Delivered

| Phase | Status |
|---|---|
| 1 — API contract audit | ✓ |
| 2 — Notification API recovery | ✓ route order + restart |
| 3 — Workload API recovery | ✓ `RequestsAdminMetaController` |
| 4 — Query hardening | ✓ bounded retries |
| 5 — Module registration audit | ✓ |
| 6 — Admin UX hardening | ✓ partial render |
| 7 — DEV observability | ✓ query failure tracking |
| 8 — Documentation | ✓ |

---

## Code Deliverables

| Area | Path |
|---|---|
| Static routes controller | `requests-admin-meta.controller.ts` |
| API contract registry | `crm-api-contract.ts` |
| Query hardening | `crm-query-options.ts`, `crm-api.ts` |
| Error UI | `CrmInlineError.tsx` |
| Updated widgets | Bell, Workload, OpsCenter |

---

## Hold

1. **Restart API** — mandatory: `pnpm dev:api`
2. Browser hard refresh after API restart
3. Full E2E admin QA after restart

---

## Verdict

**GO_WITH_HOLD** — Contract fixes shipped; admin stability restored after API restart. No CRM features removed.
