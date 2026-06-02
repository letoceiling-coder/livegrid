# LiveGrid

Платформа поиска недвижимости: NestJS API (`apps/api`), React SPA (`apps/web`), Prisma (`packages/database`).

- **Локальная разработка:** `~/livegrid` (`/home/dsc-2/livegrid`)
- **Продакшен:** `https://livegrid.ru`, сервер `85.198.64.93`, каталог `/var/www/lg`

## Локальный запуск

```bash
pnpm install
pnpm --filter @lg/database exec prisma migrate deploy
pnpm --filter @lg/shared build
pnpm --filter @lg/api build
pnpm --filter web dev
```

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
