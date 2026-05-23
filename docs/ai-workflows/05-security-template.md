# LiveGrid — Security Review Template

**Task ID:**  
**Date:**  
**Reviewer:**  
**Status:** pass | pass-with-notes | fail

**Prerequisite:** Implementation + code review — links: ___

**Mode:** targeted change | comprehensive (monthly-style)

---

## 1. Scope

Security-sensitive areas in this change:

- [ ] Auth / Sanctum
- [ ] CRM RBAC / permissions
- [ ] Public API
- [ ] Telegram auth / bot
- [ ] Lead requests (`lead_requests`)
- [ ] File upload / media
- [ ] CORS / headers
- [ ] Secrets / `.env`
- [ ] Other: ___

---

## 2. Auth & Tokens

| Check | OK? | Finding |
|-------|-----|---------|
| Sanctum middleware on protected routes | | |
| No parallel auth bypass | | |
| Token expiration policy understood | | |
| `POST /auth/telegram/code` rate limit / abuse considered | | |
| CRM token storage (`crm_token`) not logged | | |
| No tokens in frontend bundle | | |

---

## 3. Authorization (RBAC)

| Check | OK? | Finding |
|-------|-----|---------|
| `permission:*` middleware on CRM routes | | |
| Policies used where registered (`LeadPolicy`, `PropertyPolicy`) | | |
| `is_admin` legacy bypass documented if used | | |
| `AccessScope` (team/self) respected | | |
| No admin-only action without check | | |

---

## 4. Input Validation

| Endpoint / form | Validated? | Method | Gap |
|-----------------|------------|--------|-----|
| | | FormRequest / `$request->validate()` | |

| Check | OK? |
|-------|-----|
| No mass assignment of `is_admin`, `role_id` from request | |
| Lead status updates authorized + validated | |
| Filter/query params bounded (no DoS via huge arrays) | |

---

## 5. Data Exposure

| Check | OK? | Finding |
|-------|-----|---------|
| API resources hide internal fields | | |
| No stack traces in JSON responses | | |
| `APP_DEBUG` false on production | | |
| Logs do not contain secrets / PII dumps | | |

---

## 6. Telegram

| Check | OK? | Finding |
|-------|-----|---------|
| Bot token in env / `crm_settings`, not git | | |
| Webhook URL tampering risk (CRM settings) | | |
| Internal token for lead update (`x-internal-token`) consistent with middleware | | |
| Refresh secret (`JWT_SECRET`) rotation documented | | |

---

## 7. API Hardening

| Check | OK? | Finding |
|-------|-----|---------|
| Throttle on public endpoints (`apartments`, global API) | | |
| CORS policy reviewed (`config/cors.php`) | | |
| Duplicate public routes attack surface | | |
| SQL injection (raw queries parameterized) | | |

---

## 8. Frontend Security

| Check | OK? | Finding |
|-------|-----|---------|
| No secrets in `VITE_*` public env | | |
| Yandex API key exposure acceptable? | | |
| Admin routes gated (`RequireRole`) | | |
| XSS: user HTML sanitized where rendered | | |

---

## 9. Dependencies & Secrets Scan (comprehensive only)

| Check | Result |
|-------|--------|
| `.env` not committed | |
| Known CVEs in composer/npm | |
| Hardcoded credentials grep | |

---

## 10. STRIDE / OWASP Quick Map (if applicable)

| Threat | Relevant? | Mitigation in place? |
|--------|-----------|----------------------|
| Spoofing | | |
| Tampering | | |
| Repudiation | | |
| Information disclosure | | |
| Denial of service | | |
| Elevation of privilege | | |

---

## 11. Findings

| ID | Severity | Category | Finding | Remediation |
|----|----------|----------|---------|-------------|
| S-01 | critical / high / medium / low | | | |

**Must fix before release:**

**Accepted risk (documented):**

---

## 12. Verdict

- [ ] **Pass**
- [ ] **Pass with tracked issues**
- [ ] **Fail** — block release

---

## 13. gstack

- [ ] `gstack-cso` (daily or comprehensive) completed

---

## 14. Sign-off

| Security reviewer | Date |
