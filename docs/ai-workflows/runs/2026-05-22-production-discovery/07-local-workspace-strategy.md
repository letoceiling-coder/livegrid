# 07 — Local Workspace Strategy

**Problem:** Current workspace `/home/dsc-2/livegrid` is primarily the **Laravel monolith**, but production `livegrid.ru` runs the **Nest monorepo** at `/var/www/lg`.

**Goal:** Align local development with real production architecture.

---

## Recommendation: Switch Primary Workspace to Nest Monorepo

### Option A — **Recommended:** Nest as primary repo

Clone or promote Nest monorepo to dedicated workspace root.

```
~/livegrid/                    # OR ~/livegrid/ — PRIMARY workspace
├── apps/api/
├── apps/web/
├── packages/database/
├── deploy/
├── package.json
└── pnpm-workspace.yaml
```

**Laravel monolith:** separate repo/path, read-only archive or migration lab — not daily driver.

### Option B — Keep both repos (dual workspace)

Only if Laravel migration is actively planned with timeline.

```
~/livegrid/                          # Production Nest — PRIMARY for livegrid.ru work
~/livegrid-laravel/            # Archive / migration experiment
```

**Risk:** Continued drift, wrong-target PRs (R2.2b pattern).

### Not recommended

- Continue treating Laravel root as main workspace for map/catalog production fixes
- Symlink `deployment/tmp-lg-work` without full git clone — nested copy drifts from `/var/www/lg`

---

## Immediate Alignment Steps

### 1. Clone production repo (if not already primary)

```bash
git clone https://github.com/letoceiling-coder/lg.git ~/livegrid
cd ~/livegrid
pnpm install
```

Local mirror exists at `deployment/tmp-lg-work` but should be **replaced or synced** with top-level clone for Cursor workspace root.

### 2. Cursor / WSL workspace

Open **`~/livegrid`** as Cursor workspace folder (not Laravel root).

`.cursor/rules/` should be copied/rewritten for Nest:
- API truth = Nest controllers + Swagger
- tmp-lg-work rule inverted — Nest repo IS production
- Map work = `apps/web/RedesignMap` + `/blocks`

### 3. Local dev commands

```bash
# Terminal 1 — API
cd ~/livegrid && pnpm dev:api          # :3000

# Terminal 2 — Web
cd ~/livegrid && pnpm dev:web          # Vite :5173, proxies /api → 3000
```

Requires local PostgreSQL + Redis (see `.env.example`, `docker-compose.yml`).

### 4. Environment files

- Copy `.env.example` → `.env` at monorepo root
- Set `DATABASE_URL` (PostgreSQL)
- Set `REDIS_URL`
- Optional: `MEILI_HOST` for search hints parity

**Do not** point local Nest dev at production DB (read-only audit rule).

---

## Git Workflow

| Item | Recommendation |
|------|----------------|
| Remote | `origin` → `github.com/letoceiling-coder/lg` |
| Main branch | `main` (deploy default) |
| Feature branches | `feat/map-viewport`, `fix/blocks-cache`, etc. |
| Deploy | Server runs `deploy-from-git.sh` — no manual scp |
| Laravel repo | Freeze or branch `archive/laravel-monolith` |

### Branch strategy

```
main          → production deploy
develop       → optional integration (if team uses)
feat/*        → short-lived feature branches
hotfix/*      → production fixes
```

---

## Deployment Workflow (developer)

1. Develop on `feat/*` against local PG + Redis
2. PR to `main`
3. On server: `bash /var/www/lg/deploy/deploy-from-git.sh`
4. Verify: `verify-on-server.sh runtime`
5. Smoke: `curl https://livegrid.ru/api/v1/health`

**Never** deploy Laravel `frontend/build` to livegrid.ru nginx root.

---

## Folder Structure (WSL)

```
/home/dsc-2/
├── lg/                        # ← PRIMARY Cursor workspace (Nest)
│   └── (clone of letoceiling-coder/lg)
├── livegrid/                  # Laravel archive — secondary or remove from default workspace
│   └── deployment/tmp-lg-work/  # deprecate nested copy after lg clone
└── .cursor/
    └── rules/                 # update for Nest production truth
```

---

## What to Do With Laravel Workspace

| Action | Rationale |
|--------|-----------|
| Stop map reconciliation on Laravel `frontend/` | Wrong target for prod |
| Preserve Laravel repo for reference | SearchService, complexes_search design may inform Nest |
| Update docs | PROJECT_FULL_CONTEXT.md, .cursor/rules |
| Do not delete yet | May contain CRM2 entity work not in Nest |

---

## SSH Access (blocker)

Production server discovery incomplete without SSH key to `root@85.198.64.93`.

**Action item:** Add deploy key → re-run server discovery checklist:
- `pm2 list`, `git log -1` on `/var/www/lg`
- Compare server SHA vs local `main`

---

## Cursor Rules Update (recommended content)

1. Production API = Nest `/api/v1/*`
2. Map = `/blocks` + `/listings`, not `/map/complexes`
3. Frontend = `apps/web`
4. Deploy = `deploy-from-git.sh`
5. Laravel monolith = archived / migration candidate only

---

## Verification Checklist After Alignment

- [ ] Cursor opens `~/livegrid` not Laravel root
- [ ] `pnpm dev:api` + `pnpm dev:web` run locally
- [ ] `/map` loads against local Nest API
- [ ] No imports from `frontend/` Laravel path in daily work
- [ ] `.cursor/rules` reflect Nest production truth
- [ ] SSH access restored for server SHA verification
