# LiveGrid — Release Template

**Release ID:**  
**Date:**  
**Owner:**  
**Status:** planned | staging | production | rolled-back

**Prerequisite:** Review + Security + UI audits passed — links: ___

---

## 1. Release Summary

One paragraph: what ships in this release.

**Version / tag:**  
**Branch:**  
**PR:**  

---

## 2. Change Log (user-facing)

- 
- 

---

## 3. Technical Change Summary

| Area | Summary |
|------|---------|
| API | |
| DB migrations | |
| Frontend | |
| Import / cron | |
| Config / env | |

---

## 4. Pre-Release Checklist

### Code quality gates

- [ ] Code review passed (`04-review-*.md`)
- [ ] Security review passed (`05-security-*.md`)
- [ ] UI audit passed (`06-ui-audit-*.md`)
- [ ] Plan acceptance criteria met (`02-plan-*.md`)

### Repository

- [ ] Branch rebased / merged with `main`
- [ ] No unintended files in PR
- [ ] `npm run build` succeeds (frontend)
- [ ] No secrets in diff

### Database

- [ ] Migrations reviewed (forward-safe)
- [ ] Backup taken before prod migrate (if migrations)
- [ ] `php artisan migrate:status` documented

### Environment

| Variable | Changed? | Documented? |
|----------|------------|---------------|
| | | |

---

## 5. Deployment Plan

**Target:** dev.livegrid.ru | livegrid.ru | both

| Step | Command / action | Owner | Done |
|------|------------------|-------|------|
| 1 | `git pull` on server | | |
| 2 | `composer install --no-dev` (if needed) | | |
| 3 | `php artisan migrate --force` (if any) | | |
| 4 | `php artisan optimize:clear` | | |
| 5 | Frontend build + deploy to `public/build` | | |
| 6 | Queue worker restart (if queue changed) | | |
| 7 | `complexes:sync-search` (if search schema changed) | | |

**Forbidden:** `scp` code deploy, `migrate:fresh`, manual file overwrite.

---

## 6. Post-Deploy Verification

| Check | URL / command | Expected | OK? |
|-------|---------------|----------|-----|
| Health | `GET /api/v1/health` | 200 | |
| Catalog | `/catalog` | loads complexes | |
| Map | `/map` | map + API | |
| Complex | `/complex/{slug}` | | |
| CRM login | `/crm/login` | | |
| Import smoke (if feed touched) | `import:test-production` | stats OK | |

**Logs:** `storage/logs/laravel.log` — errors? ___

---

## 7. Rollback Plan

| Trigger | Action | ETA |
|---------|--------|-----|
| Critical API failure | `git revert` + redeploy previous build | |
| Bad migration | restore DB backup + revert migration | |
| Frontend only | redeploy previous `public/build` artifact | |

**Rollback commander:**  
**Last known good commit:**  

---

## 8. Monitoring (first 24h)

- [ ] Error rate / logs monitored
- [ ] `gstack-canary` or manual browse checks
- [ ] Lead / Telegram notifications working (if CRM settings changed)
- [ ] Import cron not broken (if import area touched)

---

## 9. Communication

| Audience | Message sent? | Channel |
|----------|---------------|---------|
| Team | | |
| Stakeholders | | |

---

## 10. Known Issues / Post-Release Follow-ups

| Issue | Severity | Target release |
|-------|----------|----------------|
| | | |

---

## 11. gstack Release Skills

| Step | Skill | Done |
|------|-------|------|
| Pre-merge | `gstack-ship` | |
| Post-merge deploy | `gstack-land-and-deploy` | |
| Post-deploy watch | `gstack-canary` | |
| Docs | `gstack-document-release` | |

---

## 12. Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering | | | |
| Release owner | | | |

**Production deploy executed:** yes / no — time (UTC): ___
