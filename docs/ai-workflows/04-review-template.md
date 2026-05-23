# LiveGrid — Code Review Template

**Task ID:**  
**Date:**  
**Reviewer:**  
**Status:** pass | pass-with-notes | changes-requested | blocked

**Prerequisite:** Implementation doc — link: `03-implementation-*.md`  
**Diff base:** `main` | `develop` | ___

---

## 1. Review Scope

- Commits / branch: ___
- Files in scope: all planned | list: ___

---

## 2. Architecture Compliance

| Rule | OK? | Notes |
|------|-----|-------|
| Laravel API source of truth | | |
| No NestJS/tmp-lg-work contract drift | | |
| No parallel backend / duplicate state | | |
| Import pipeline protected | | |
| Service layer used (not fat controllers only) | | |

---

## 3. API Review

| Check | OK? | Finding |
|-------|-----|---------|
| Routes registered in `routes/api.php` | | |
| Controller exists + thin delegation | | |
| Validation on mutations | | |
| Pagination/filter naming consistent | | |
| JSON errors (no HTML leaks) | | |
| v1 vs v2 not mixed incorrectly | | |
| Duplicate routes (`/api/requests` vs `/api/v1/requests`) not worsened | | |

**Frontend ↔ API contract:**

| Frontend call | Backend route | Match? |
|---------------|---------------|--------|
| | | |

---

## 4. Backend Code Quality

| Check | OK? | Notes |
|-------|-----|-------|
| No N+1 in hot paths | | |
| Search uses `SearchService` / denormalized tables | | |
| Raw SQL parameterized | | |
| Transactions where needed | | |
| Idempotency (import-related) | | |

---

## 5. Frontend Code Quality

| Check | OK? | Notes |
|-------|-----|-------|
| React Query used (no random fetch in JSX) | | |
| No duplicate hooks / filters | | |
| Component size reasonable | | |
| TypeScript: no unnecessary `any` | | |
| `App.tsx` / routing not broken | | |
| Legacy `/old/*` not regressed unintentionally | | |

---

## 6. Database / Migrations

| Check | OK? | Notes |
|-------|-----|-------|
| Forward-safe migration | | |
| Indexes / FK preserved | | |
| UUID strategy unchanged | | |
| No data-destructive ops | | |

---

## 7. Findings

| ID | Severity | File | Issue | Suggested fix |
|----|----------|------|-------|---------------|
| R-01 | blocker / major / minor / nit | | | |

**Blockers (must fix before merge):**

**Major:**

**Minor / nits:**

---

## 8. Performance Notes

- API / search: ___
- Frontend bundle / list size: ___
- Import (if touched): ___

---

## 9. Test Evidence

| Test | Result |
|------|--------|
| PHPUnit / feature tests | |
| Manual API checks | |
| Frontend build | |
| Staging URLs tested | |

---

## 10. Verdict

- [ ] **Approve** — ready for security + UI gate
- [ ] **Approve with notes** — non-blocking follow-ups logged
- [ ] **Changes requested** — block merge until R-__ fixed
- [ ] **Blocked** — architectural issue; needs new plan

---

## 11. gstack

- [ ] `gstack-review` run
- [ ] `gstack-codex` (optional second opinion)

**Review log path (if used):** `~/.gstack/` / project learnings

---

## 12. Sign-off

| Reviewer | Date |
|----------|------|
