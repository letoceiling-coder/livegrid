# STEP 5 — Frontend audit (public + CRM)

**Audit date:** 2026-03-23

---

## 5.1 Tech stack

- React 18, TypeScript, Vite, TanStack Query, React Router v6
- UI: Radix + Tailwind (`frontend/src/shared/ui`, `components/ui`)
- CRM: separate tree under `frontend/src/crm/`
- Public redesign: `frontend/src/redesign/`

---

## 5.2 Public app routing

[`frontend/src/App.tsx`](../../frontend/src/App.tsx): legacy routes + redesign routes under `/`, `/catalog`, `/map`, `/complex/:slug`, `/apartment/:slug`, etc.; CRM under `/crm/*`.

---

## 5.3 API integration — public redesign

| Area | File(s) | Integration |
|------|---------|-------------|
| Config | `frontend/src/shared/config/api.ts` | `VITE_API_URL` or `/api/v1` |
| Hooks | `frontend/src/redesign/hooks/useCatalogApi.ts` | `fetchComplexes`, `fetchComplexBySlug`, `fetchApartmentsByComplexSlug`, `fetchFilters`, `fetchMapComplexes`, `searchComplexes` |
| Catalog page | `frontend/src/redesign/pages/RedesignCatalog.tsx` | Uses hooks + `catalogStore` (Zustand) for UI state |
| Map page | `frontend/src/redesign/pages/RedesignMap.tsx` | Map complexes API + filters |
| Apartment page | `frontend/src/redesign/pages/RedesignApartment.tsx` | **Uses `mock-data.ts`**, not `GET /api/v1/apartments/:slug` |
| Layouts / similar | `RedesignLayouts.tsx` etc. | Partial mock usage |

**Gap:** Apartment detail and some layout flows **do not** consume live apartment API — SEO and content diverge from CRM.

---

## 5.4 State management

- **`catalogStore`** (`frontend/src/redesign/store/catalogStore.ts`) — filters, favorites, compare; used in catalog/map flows.
- **TanStack Query** — server state for complexes list, map, filters, search.
- **Not fully wired:** compare/favorites may be local-only; verify persistence requirements.

---

## 5.5 CRM frontend

See **`02_crm_audit.md`** for routes, API mapping, and CRM-specific issues.

---

## 5.6 Security / config

- **Yandex Maps API key** hardcoded in multiple files (e.g. CRM `MapPicker`, redesign map-related components) — should be env-only (`VITE_*`) and rotated.
- No `console.log` in `crm/` (good). Check `redesign/` for stray logs in production builds.

---

## 5.7 Build

[`frontend/vite.config.ts`](../../frontend/vite.config.ts): `outDir: ../public/build`, `base: "/build/"`, single `index.html` entry — standard Laravel+Vite SPA.

---

## 5.8 Issues by severity

### [CRITICAL]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| C1 | Apartment public page uses **mock data** | `RedesignApartment.tsx` + `mock-data.ts` | Wrong prices/SEO vs CRM |

### [HIGH]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| H1 | API key in source | Map components | Leak + abuse |
| H2 | `/api/v1/apartments` list **500** | Any future list UI | Broken catalog features |

### [MEDIUM]

| # | Description | Location | Impact |
|---|-------------|----------|--------|
| M1 | Mixed mock vs API across redesign | Various pages | Inconsistent UX |
| M2 | No Vite proxy for API in dev | `vite.config.ts` | Devs must run same origin or set `VITE_API_URL` |

---

## 5.9 Positive findings

- Catalog and map paths **do** call public API hooks.
- Shared UI components and TypeScript types reduce duplication.
- CRM is **modular** (pages, api, components).
