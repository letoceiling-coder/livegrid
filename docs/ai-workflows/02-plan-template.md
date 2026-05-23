# LiveGrid — Plan Template

**Task ID:**  
**Date:**  
**Author:**  
**Status:** draft | approved | superseded

**Prerequisite:** Audit completed — link: `01-audit-*.md` or audit summary

---

## 1. Goal

One paragraph: what we will achieve and why.

---

## 2. Scope

### In scope

- 

### Out of scope

- 

### Non-goals

- 

---

## 3. Constraints (LiveGrid rules)

- [ ] Laravel `routes/api.php` is API source of truth
- [ ] No NestJS contracts from `tmp-lg-work` unless explicit port to Laravel
- [ ] Import pipeline unchanged unless explicitly approved
- [ ] Forward-safe migrations only
- [ ] Minimal, incremental change

---

## 4. Affected Files (planned)

| Path | Change type | Risk |
|------|-------------|------|
| | add / modify / delete | low / medium / high |

---

## 5. API Impact

| Endpoint | Method | Change | Breaking? | Consumers |
|----------|--------|--------|-----------|-----------|
| | | | yes / no | |

**New routes required?** yes / no — list with controller + service plan.

---

## 6. Database Impact

| Table / column | Migration? | Risk | Rollback |
|----------------|------------|------|----------|
| | | | |

**Forbidden:** `migrate:fresh`, drop tables, UUID strategy change.

---

## 7. Frontend Impact

| Route | Component | Hook / API | Mobile |
|-------|-------------|------------|--------|
| | | | |

**Reuse:** existing hooks (`useBlocks`, `useComplex`, `useFilters`, etc.) — yes / no

---

## 8. Security Impact

- Auth / middleware: ___
- Permissions / policies: ___
- Validation approach: FormRequest / inline `validate()`
- Secrets / env: ___

---

## 9. Import / Search Impact (if any)

- [ ] No import changes
- [ ] Import change — requires separate approval + rollback plan
- [ ] `complexes_search` / queue sync impact: ___

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| | | | |

---

## 11. Rollback Strategy

1. Git revert: ___
2. Migration down (if any): ___
3. Data recovery: ___
4. Config / env revert: ___

---

## 12. Implementation Plan (ordered steps)

### Iteration 1

- [ ] Step 1 — 
- [ ] Step 2 — 

### Iteration 2 (if needed)

- [ ] 

---

## 13. Verification Plan

- [ ] API: routes exist, response shape matches frontend
- [ ] DB: FK integrity, no duplicates (import rules if applicable)
- [ ] Frontend: catalog / map / complex / apartment flows
- [ ] CRM / auth (if touched)
- [ ] `php artisan` / tests on server per project policy
- [ ] Manual QA URL: `https://dev.livegrid.ru` — paths: ___

---

## 14. Acceptance Criteria

- [ ] 
- [ ] 

---

## 15. gstack Workflow (recommended)

| Phase | Skill |
|-------|--------|
| Plan | `gstack-office-hours`, `gstack-autoplan`, `gstack-plan-eng-review` |
| After plan | User approval before IMPLEMENT |

---

## 16. Approval

| Approver | Date | Notes |
|----------|------|-------|
| | | |
