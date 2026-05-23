# LiveGrid — Implementation Template

**Task ID:**  
**Date:**  
**Author:**  
**Status:** in-progress | blocked | ready-for-review

**Prerequisite:** Approved plan — link: `02-plan-*.md`

---

## 1. Implementation Summary

What was implemented (2–5 sentences).

---

## 2. Scope Delivered vs Plan

| Planned item | Status | Notes |
|--------------|--------|-------|
| | done / partial / deferred | |

**Deferred items (with reason):**

---

## 3. Files Changed

| File | Change summary |
|------|----------------|
| | |

```bash
# Reference only — run locally
git diff --stat main...HEAD
```

---

## 4. API Changes

### Routes added/modified

| Route | Controller | Notes |
|-------|------------|-------|
| | | |

### Request / response notes

- Pagination: ___
- Filter params: ___
- Breaking changes: none / list ___

---

## 5. Database Changes

| Migration file | Purpose | Ran on dev? | Ran on prod? |
|----------------|---------|-------------|--------------|
| | | | |

**Data backfill required?** yes / no — script: ___

---

## 6. Frontend Changes

| Route | Component | Hook / API used |
|-------|-------------|-----------------|
| | | |

- [ ] Reused existing hooks (no duplicate API layer)
- [ ] URL / filter state preserved
- [ ] Mobile checked: 360 / 768 / 1280

---

## 7. Import / Search (if applicable)

- [ ] Not touched
- [ ] Touched — stats from last import test: ___
- [ ] `complexes:sync-search` run: yes / no

---

## 8. Deviations from Plan

| Deviation | Reason | Risk accepted? |
|-----------|--------|----------------|
| | | yes / no |

---

## 9. Known Issues / Follow-ups

| Issue | Severity | Ticket / next step |
|-------|----------|-------------------|
| | | |

---

## 10. Self-Check (before review)

- [ ] No invented API routes (verified in `routes/api.php`)
- [ ] No `tmp-lg-work` endpoints assumed on frontend
- [ ] Import critical files untouched (unless approved)
- [ ] No secrets in code / logs
- [ ] No `migrate:fresh` / destructive SQL
- [ ] Types: minimized new `any`

---

## 11. Commands Run (evidence)

```bash
# Examples — paste actual output summaries
# php artisan migrate:status
# php artisan route:list --path=api/v1
# npm run build (frontend)
```

---

## 12. Handoff to Review

**Reviewer focus areas:**

1. 
2. 

**Suggested gstack:** `gstack-review`, `gstack-cso` (if auth/API), `gstack-design-review` / `gstack-qa` (if UI)
