# STEP 2 — CRM audit (`/crm`)

**Audit date:** 2026-03-23  
**Routes source:** [`frontend/src/App.tsx`](../../frontend/src/App.tsx) (lines ~108–121)

---

## 2.1 Routing

| Path | Component | Create vs edit |
|------|-----------|----------------|
| `/crm/login` | `Login` | N/A |
| `/crm` | `CrmLayout` + `Dashboard` | — |
| `/crm/complexes` | `ComplexList` | List |
| `/crm/complexes/new` | `ComplexForm` | Create |
| `/crm/complexes/:id/edit` | `ComplexForm` | Edit (`useParams().id`) |
| `/crm/apartments` | `ApartmentList` | List |
| `/crm/apartments/new` | `ApartmentForm` | Create |
| `/crm/apartments/:id/edit` | `ApartmentForm` | Edit |
| `/crm/attributes` | `AttributesPage` | Builders + districts CRUD |
| `/crm/feed` | `FeedPage` | Feed actions |
| `/crm/settings` | `SettingsPage` | Read-only-ish settings display |

**Invalid IDs:** No literal `/complexes/0` in code; links use `c.id` / `a.id` from API. If user navigates manually to invalid UUID, backend returns 404 and forms may show generic load error depending on error handling.

---

## 2.2 API usage (CRM client)

**Base:** [`frontend/src/crm/api/client.ts`](../../frontend/src/crm/api/client.ts) — `/api/v1/crm`

| Page | Endpoints (relative to CRM base) |
|------|-----------------------------------|
| Login | `POST /auth/login` |
| Dashboard | `GET /dashboard` |
| Complex list/form | `GET/POST/PUT/DELETE /complexes`, `GET /complexes/:id` |
| Apartment list | `GET /apartments` (+ query filters), `DELETE /apartments/:id`, `POST /apartments/bulk` |
| Apartment form | `GET/POST/PUT /apartments/:id` |
| Attributes | `GET/POST/PUT/DELETE /builders`, `/districts` |
| Feed | `GET /feed/status`, `POST /feed/download`, `POST /feed/sync` |
| Settings | `GET /dashboard` (stats only) |

**Missing / unused in UI (backend may exist):**

- `GET /apartments/:id/history` — defined in [`frontend/src/crm/api/apartments.ts`](../../frontend/src/crm/api/apartments.ts); **not used** in `ApartmentForm.tsx`
- `POST /apartments/:id/restore` — imported in `ApartmentList.tsx` as `restoreApartment` but **unused**
- Bulk `assign_complex` — API supports in `CrmApartmentController::bulk`; **no UI**

---

## 2.3 Forms — gaps

| Issue | Location | Detail |
|-------|----------|--------|
| SEO via cast | [`frontend/src/crm/pages/complexes/ComplexForm.tsx`](../../frontend/src/crm/pages/complexes/ComplexForm.tsx) | `seo_title` / `seo_description` read with `(c as any)` — types in `types.ts` incomplete |
| Map clear → 0,0 | [`frontend/src/crm/components/MapPicker.tsx`](../../frontend/src/crm/components/MapPicker.tsx) | Clearing coordinates calls `onChange(0, 0)` — can persist invalid geo |
| Missing apartment fields | [`frontend/src/crm/pages/apartments/ApartmentForm.tsx`](../../frontend/src/crm/pages/apartments/ApartmentForm.tsx) | No `building_id`, `finishing_id` in form though types/API support them |
| Complex dropdown cap | Same + `ApartmentList` | `listComplexes({ per_page: 100 })` or `200` — **not all 1292+ complexes** selectable when list grows |
| Geocode errors silent | `MapPicker.tsx` | Empty `catch` on geocode — no user feedback |

---

## 2.4 Features — CRUD / filters / bulk

- **Complexes:** Full CRUD + filters (search, builder, district, status) on list.
- **Apartments:** List filters: complex, rooms, status, source, price range, search; bulk **status** + bulk **delete** only; **no** bulk restore / assign complex in UI.
- **Attributes:** Full CRUD; **inline save** path weak (see below).
- **Feed:** Download + sync + status; no server log stream in UI (client-side log state only).
- **Settings:** Mostly static labels + one stats fetch; not a real settings mutation surface.

---

## 2.5 Issues by severity

### [CRITICAL]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| C1 | Clearing map sets lat/lng to **0,0** | `frontend/src/crm/components/MapPicker.tsx` (clear handler) | Wrong coordinates saved to `blocks`; map shows Gulf of Guinea |
| C2 | Apartment form omits **building** / **finishing** | `frontend/src/crm/pages/apartments/ApartmentForm.tsx` | CRM cannot fully manage relations; data inconsistent with backend capabilities |

### [HIGH]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| H1 | Inline edit save without try/finally | `frontend/src/crm/pages/attributes/AttributesPage.tsx` (`AttributeRow.save`) | On API failure `saving` may stay true; UI stuck |
| H2 | Dead imports / state | `frontend/src/crm/pages/apartments/ApartmentList.tsx` | `ChevronDown`, `Unlock`, `RotateCcw`, `restoreApartment`, `bulkOpen` unused — confusion; missing restore UI |
| H3 | Public `/api/v1/filters` returns **0 districts** | Not CRM-only; affects CRM district filter if data empty | `ComplexList` / `ComplexForm` district dropdowns empty on production (see `03_backend_audit`, `08_critical_issues`) |
| H4 | Yandex API key in repo / UI | `MapPicker.tsx`, `SettingsPage.tsx` | Secret exposure; key rotation pain |

### [MEDIUM]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| M1 | Builders/districts load errors swallowed | `ComplexList.tsx` — `.catch(() => null)` | Silent empty filters |
| M2 | Settings stats failure silent | `SettingsPage.tsx` — `.catch(() => null)` | Shows “—” with no explanation |
| M3 | Feed initial status hidden on error | `FeedPage.tsx` | Poor UX when `getFeedStatus` fails |
| M4 | `roomOptions` in form vs list filter range | `ApartmentForm` vs `ApartmentList` | Minor inconsistency (e.g. 5+ rooms in form, list filter 0–4) |
| M5 | No `console.log` in `crm/` (good) | — | — |

---

## 2.6 Evidence summary

- CRM routing and API wiring are **largely complete** for complexes/apartments/attributes/feed.
- **Data** issues (empty districts, broken public apartment index) are documented in `04_api_audit.md` and `08_critical_issues.md`.
- **Geo** and **apartment relation** gaps are the highest CRM-specific product risks.
