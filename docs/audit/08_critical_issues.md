# STEP 8 — Critical issues (production blockers)

**Audit date:** 2026-03-23  
**Definition:** Issues that cause **5xx**, **empty critical public data**, or **persistently wrong user-visible data**.

---

## C-1 — `GET /api/v1/apartments` returns 500

| Field | Value |
|-------|--------|
| **Evidence** | [`routes/api.php`](../../routes/api.php) L27 registers `ApartmentController@index`; [`ApartmentController`](../../app/Http/Controllers/Api/V1/ApartmentController.php) implements **`show` only** |
| **Production** | `https://dev.livegrid.ru/api/v1/apartments` → **500** (sampled 2026-03-23) |
| **Fix direction** | Implement `index()` with pagination/filters **or** remove route until implemented |

---

## C-2 — `ApartmentController@show` fragile / wrong fields

| Field | Value |
|-------|--------|
| **Evidence** | Uses `$apartment->price_per_meter` (no documented column/accessor); `$apartment->building->latitude` without null checks |
| **Risk** | **500** for orphan rows; wrong JSON for clients |
| **Fix direction** | Null-safe building; compute `price_per_meter` from `price`/`area` or add column + migration |

---

## C-3 — Public apartment page uses mock data

| Field | Value |
|-------|--------|
| **Evidence** | [`frontend/src/redesign/pages/RedesignApartment.tsx`](../../frontend/src/redesign/pages/RedesignApartment.tsx) + [`mock-data.ts`](../../frontend/src/redesign/data/mock-data.ts) |
| **Risk** | Users see **non-CRM** prices and content; SEO mismatch |
| **Fix direction** | Wire to `GET /api/v1/apartments/{slug}` after C-1/C-2 stabilized |

---

## C-4 — Districts empty in `/api/v1/filters`

| Field | Value |
|-------|--------|
| **Evidence** | Live `GET /api/v1/filters` → `districts: []` while complexes total ~1292; migration FK `blocks.district_id` → **`regions`**; `Complex::district()` → **`District`** |
| **Risk** | Filters and CRM district UX **broken** |
| **Fix direction** | Align schema + model; backfill `districts` / fix IDs |

---

## C-5 — Map / search APIs empty or zero results

| Field | Value |
|-------|--------|
| **Evidence** | Sampled `map/complexes` and `search/complexes` return empty/zero despite many complexes |
| **Likely cause** | **`complexes_search`** not populated or stale |
| **Fix direction** | Run sync command post-migrate/post-import; add deploy step |

---

## C-6 — CRM MapPicker clears to 0,0

| Field | Value |
|-------|--------|
| **Evidence** | [`frontend/src/crm/components/MapPicker.tsx`](../../frontend/src/crm/components/MapPicker.tsx) |
| **Risk** | Invalid coordinates saved to production |
| **Fix direction** | Use `null` + nullable API or omit field; block save until valid coords |

---

## Summary table

| ID | Component | Severity |
|----|-----------|----------|
| C-1 | API | Blocker |
| C-2 | API | Blocker |
| C-3 | Frontend | Blocker (content) |
| C-4 | DB/API | Blocker |
| C-5 | API/Data | Blocker |
| C-6 | CRM | Blocker (data quality) |
