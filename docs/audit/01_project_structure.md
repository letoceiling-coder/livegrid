# STEP 1 — Project structure analysis

**Audit date:** 2026-03-23  
**Scope:** Laravel backend, React frontend, CRM (`/crm`), public API routes.

---

## 1.1 High-level layout

| Area | Path | Role |
|------|------|------|
| Backend | `app/` | Laravel application code |
| HTTP | `app/Http/Controllers/Api/` | Public V1 + CRM JSON API |
| Domain models | `app/Models/Catalog/` | Complexes (blocks), apartments, references |
| Import / search | `app/Services/Catalog/` | Feed import, `SearchService`, map/search |
| Console | `app/Console/Commands/` | Deploy, feed download, sync search, CRM admin |
| Routes | `routes/api.php`, `routes/web.php` | API prefix `api/`, SPA catch-all |
| DB | `database/migrations/` | Schema evolution |
| Frontend | `frontend/src/` | React 18 + Vite + TanStack Query |
| CRM UI | `frontend/src/crm/` | Isolated CRM under `/crm` |
| Public redesign | `frontend/src/redesign/` | `/`, `/catalog`, `/map`, `/complex/:slug`, etc. |
| Build output | `public/build/` | Vite manifest + assets |

---

## 1.2 Backend — key modules

**Models (`app/Models/Catalog/`):**  
`Apartment`, `Building`, `Builder`, `BuildingType`, `Complex` (table `blocks`), `District`, `Finishing`, `Project`, `RoomType`, `Subway`.

**Concerns:**  
`app/Models/Concerns/LogsChanges.php` — audit trail for apartment field updates.

**API controllers:**

- **V1:** `ComplexController`, `ApartmentController`, `MapController`, `ReferenceController`, `SearchComplexesController`
- **CRM:** `CrmAuthController`, `CrmDashboardController`, `CrmComplexController`, `CrmApartmentController`, `CrmBuilderController`, `CrmDistrictController`, `CrmFeedController`

**Services:**

- `app/Services/Catalog/Import/` — `FeedImporter`, `UpsertService`, `BlockImporter`, `BuildingImporter`, `FeedMapper`, etc.
- `app/Services/Catalog/Feed/FeedDownloader.php`
- `app/Services/Catalog/Search/SearchService.php` — `complexes_search` table queries

**Artisan commands:**  
`DeployCommand`, `FeedDownloadCommand`, `SyncComplexesSearchCommand`, `CreateCrmAdminCommand`, `TestImportProductionCommand`

---

## 1.3 Frontend — entry points

| Entry | File | Notes |
|-------|------|--------|
| SPA bootstrap | `frontend/src/main.tsx` | React root |
| Router | `frontend/src/App.tsx` | Public + `/crm/*` + legacy routes |
| API base (public) | `frontend/src/shared/config/api.ts` | `VITE_API_URL` or `/api/v1` |
| CRM API client | `frontend/src/crm/api/client.ts` | Base `/api/v1/crm`, Sanctum token `crm_token` |

**Vite:** [`frontend/vite.config.ts`](../../frontend/vite.config.ts) — `outDir: ../public/build`, `base: "/build/"`, no `server.proxy` for API (same-origin `/api/v1` in production).

---

## 1.4 Laravel entry points

- **HTTP:** `public/index.php` → `bootstrap/app.php` / `Kernel`
- **Route loading:** [`app/Providers/RouteServiceProvider.php`](../../app/Providers/RouteServiceProvider.php) — `api` middleware + prefix `api` → `routes/api.php`; then `web` → `routes/web.php`
- **SPA:** [`routes/web.php`](../../routes/web.php) — `Route::get('/{any?}', …)->where('any', '.*')` returns Blade `app` view for non-API paths

---

## 1.5 Build & deploy flow

**Local / CI build:**

1. `cd frontend && npm install && npm run build` → assets to `public/build/`

**Server (`php artisan deploy`):** [`app/Console/Commands/DeployCommand.php`](../../app/Console/Commands/DeployCommand.php)

1. `git pull` (main, fallback master)
2. `composer install --optimize-autoloader`
3. `npm install --legacy-peer-deps` + `npm run build`
4. `php artisan migrate --force` (unless `--no-migrate`)
5. Further steps in same file: seed, `crm:create-admin`, config/route/view cache, queue, permissions, PHP-FPM reload (see full command for current list)

**Nginx (observed on dev host):** `root /var/www/livegrid/public`; `try_files $uri $uri/ /index.php?$query_string` — Laravel handles `/api/*` and SPA.

---

## 1.6 Documentation map (this audit)

All files live under `docs/audit/`:

| File | Topic |
|------|--------|
| `01_project_structure.md` | This document |
| `02_crm_audit.md` | CRM pages & UX/API |
| `03_backend_audit.md` | Models, controllers, feed |
| `04_api_audit.md` | `/api/v1/*` consistency |
| `05_frontend_audit.md` | Public + CRM frontend |
| `06_data_flow.md` | Feed → DB → API → front |
| `07_database.md` | Tables, indexes, enums |
| `08_critical_issues.md` | Production blockers only |
| `09_improvement_plan.md` | Prioritized next steps |
