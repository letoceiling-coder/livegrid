# STEP 9 — Improvement plan (prioritized)

**Audit date:** 2026-03-23  
**Depends on:** `01`–`08` in `docs/audit/`.

---

## Phase 0 — Stabilize production API (immediate)

| # | Task | Owner hint | Acceptance |
|---|------|------------|------------|
| 0.1 | Implement **`ApartmentController::index`** OR unregister `GET /api/v1/apartments` | Backend | No 500; documented query params |
| 0.2 | Harden **`ApartmentController::show`**: null-safe `building`; fix **`price_per_meter`** | Backend | No 500 on orphan; correct JSON |
| 0.3 | Run **`migrate:status`** on prod; apply pending migrations | DevOps | All green |
| 0.4 | Run **complexes search sync**; verify map/search return data | DevOps | Non-empty sample bbox |

---

## Phase 1 — Data model alignment

| # | Task | Acceptance |
|---|------|------------|
| 1.1 | Resolve **`blocks.district_id`**: `regions` vs `districts` + update `Complex::district()` | `/filters` returns districts; CRM dropdowns populated |
| 1.2 | Backfill or migration script for existing rows | No FK violations |
| 1.3 | Document reference data ownership (feed vs manual) | Runbook in `docs/` |

---

## Phase 2 — Frontend truthfulness

| # | Task | Acceptance |
|---|------|------------|
| 2.1 | Replace **mock** in `RedesignApartment.tsx` with API + loading/error states | URL shows CRM-backed apartment |
| 2.2 | Audit other redesign pages for **mock-data** usage | List in PR |
| 2.3 | Move **Yandex key** to `VITE_` env only | No secrets in git |

---

## Phase 3 — CRM quality

| # | Task | Acceptance |
|---|------|------------|
| 3.1 | Fix **MapPicker** clear → null / validation | Cannot save 0,0 accidentally |
| 3.2 | Add **building** / **finishing** to apartment form | Full parity with API |
| 3.3 | **AttributesPage** `save()` try/finally | `saving` always resets |
| 3.4 | Complex dropdown: paginated search or typeahead | Works with 2000+ complexes |
| 3.5 | Optional UI for **restore** / **bulk assign_complex** | Uses existing endpoints |

---

## Phase 4 — Feed & reliability

| # | Task | Acceptance |
|---|------|------------|
| 4.1 | Audit **FeedImporter** all branches for **`$allProcessedExternalIds`** | No undefined variable |
| 4.2 | Post-import hook: always queue/ run search sync | Map matches new complexes |
| 4.3 | Monitoring: 500 rate, feed last success, search row count | Dashboard or logs |

---

## Phase 5 — Hardening (later)

- Rate limiting on public list endpoints
- API contract doc (OpenAPI) generated from routes or maintained manually
- E2E tests: critical paths (catalog load, apartment detail, CRM login + edit)

---

## Suggested order

1. **0.1–0.2** (stop 500s)  
2. **0.4 + 1.1** (visible data: map + filters)  
3. **2.1 + 3.1** (user trust + geo integrity)  
4. Remaining CRM and feed tasks  

---

## Files reference

- Routes: [`routes/api.php`](../../routes/api.php)
- Apartment API: [`app/Http/Controllers/Api/V1/ApartmentController.php`](../../app/Http/Controllers/Api/V1/ApartmentController.php)
- Complex model: [`app/Models/Catalog/Complex.php`](../../app/Models/Catalog/Complex.php)
- Redesign apartment: [`frontend/src/redesign/pages/RedesignApartment.tsx`](../../frontend/src/redesign/pages/RedesignApartment.tsx)
- CRM map: [`frontend/src/crm/components/MapPicker.tsx`](../../frontend/src/crm/components/MapPicker.tsx)
