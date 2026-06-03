# LiveGrid

Платформа поиска недвижимости: NestJS API (`apps/api`), React SPA (`apps/web`), Prisma (`packages/database`).

- **Локальная разработка:** `~/livegrid` (`/home/dsc-2/livegrid`)
- **Продакшен:** `https://livegrid.ru`, сервер `85.198.64.93`, каталог `/var/www/lg`

## Локальный запуск

```bash
cd C:\Users\dsc-2\projects\livegrid   # или ~/livegrid на Linux
pnpm install
docker compose up -d                  # PostgreSQL (PostGIS) + Redis
pnpm --filter @lg/database exec prisma migrate deploy
pnpm --filter @lg/shared build
pnpm dev:web                          # http://localhost:5173
pnpm dev:api                          # http://localhost:3000
```

**`.env`:** для локальной разработки укажите `DATABASE_URL=postgresql://lg_admin:lg_dev_password@localhost:5432/lg_development` (как в `docker-compose.yml`). Не используйте production-пароль и `NODE_ENV=production` локально.

### База с продакшена (полный снимок)

Только **read-only** `pg_dump` на сервере, затем восстановление в `lg_development`:

```powershell
# Windows (ключ Beget)
.\scripts\sync-prod-db-windows.ps1

# Повторное восстановление из уже скачанного дампа:
.\scripts\restore-prod-db-local.ps1 -DumpPath "$env:USERPROFILE\livegrid-snapshots\lg_production_YYYYMMDD.dump"
```

Дампы хранятся в `%USERPROFILE%\livegrid-snapshots\` (в git не коммитить). После restore скрипт очищает токены/лиды (`scripts/sanitize-local-map-snapshot.sql`) и создаёт локального админа через `pnpm db:seed`.

API по умолчанию: `http://localhost:3000`. Фронт: Vite dev server.

## Деплой на production

Деплой **только через Git** — не используйте `rsync --delete` с локальной машины на прод.

### 1. Локально: коммит и push

```bash
cd ~/livegrid
git status
git add <нужные файлы>
git commit -m "описание изменений"
git push origin main
```

### 2. На сервере: pull и полный деплой

SSH (ключ Beget):

```bash
ssh -i ~/.ssh/id_ed25519_beget root@85.198.64.93
cd /var/www/lg
bash deploy/deploy-from-git.sh
```

Скрипт `deploy/deploy-from-git.sh` делает `git pull`, затем `deploy/deploy-full.sh`:

1. `pnpm install`
2. `prisma generate` + `prisma migrate deploy`
3. сборка `@lg/shared`, `@lg/api`, фронта (`pnpm build:web`)
4. перезапуск API через PM2 (`lg-api`)
5. обновление nginx и `nginx -s reload`

Удалённо одной командой:

```bash
ssh -i ~/.ssh/id_ed25519_beget root@85.198.64.93 'cd /var/www/lg && bash deploy/deploy-from-git.sh'
```

### 3. Проверка после деплоя

```bash
curl -s https://livegrid.ru/api/v1/health
curl -s https://livegrid.ru/api/v1/stats/counters
pm2 status lg-api
```

### Откат

На сервере:

```bash
cd /var/www/lg
git log -5 --oneline
git checkout <предыдущий-commit>
bash deploy/deploy-full.sh
```

Миграции БД откатываются вручную только при необходимости — предпочитайте forward-safe migrations.

## Структура монорепо

| Путь | Назначение |
|------|------------|
| `apps/api` | NestJS REST API |
| `apps/web` | React + Vite (в т.ч. `src/redesign/`) |
| `packages/database` | Prisma schema и миграции |
| `packages/shared` | Общие типы и утилиты |
| `deploy/` | Скрипты деплоя, PM2, nginx |

Legacy Laravel-код в корне (`app/`, `routes/`) не является активным production API.
