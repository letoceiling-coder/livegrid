# 01 — Реальная структура проекта

> Источник: код + сервер. Дата аудита: 2026-03-25.

## Сервер

| Параметр | Значение |
|---|---|
| IP | 85.198.64.93 |
| OS | Ubuntu (nginx/1.24.0) |
| PHP | 8.2-FPM (active) |
| nginx | active |
| Production root | `/var/www/livegrid.ru/public` |
| Dev root | `/var/www/livegrid/public` |
| Last commit | `af3e888 fix: restore default Vite manifest location` |
| Build date | 2026-03-24 09:08 |

**Nginx сайты:** `livegrid.ru` (production), `dev.livegrid.ru` (dev — `/var/www/livegrid`)

## Framework / Stack

| Слой | Технология |
|---|---|
| Backend | Laravel (PHP 8.2) |
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| State | React Query (TanStack) |
| Map | Yandex Maps API 2.1 |
| Auth | Laravel Sanctum |
| DB | MySQL |
| Queue | Laravel sync queue (нет Redis/worker) |
| Cache | File cache |

## Директории проекта (локально: `c:\OSPanel\domains\livegrid`)

```
livegrid/
├── app/
│   ├── Console/Commands/          # 5 команд
│   ├── Events/                    # 1 событие (ComplexSearchNeedsSync)
│   ├── Http/
│   │   ├── Controllers/Api/V1/    # 6 публичных контроллеров
│   │   ├── Controllers/Api/Crm/   # 8 CRM контроллеров
│   │   └── Requests/              # 1 реквест (SearchComplexesRequest)
│   ├── Jobs/                      # 1 job (SyncComplexesSearchJob)
│   ├── Listeners/                 # 1 listener (DispatchComplexSearchSync)
│   ├── Models/
│   │   ├── Catalog/               # 11 моделей
│   │   ├── Geo/                   # 4 модели (unused)
│   │   └── User.php
│   └── Services/
│       ├── CacheInvalidator.php
│       ├── Catalog/Feed/          # FeedDownloader
│       ├── Catalog/Import/        # 8 import-сервисов
│       └── Catalog/Search/        # SearchService
├── database/migrations/           # 53 миграции, все выполнены
├── routes/
│   └── api.php                    # единственный route-файл
├── frontend/
│   └── src/
│       ├── App.tsx                # роутер (SPA)
│       ├── crm/                   # CRM UI
│       │   ├── pages/             # Dashboard, ComplexList/Form, ApartmentList/Form,
│       │   │                      #   AttributesPage, FeedPage, SettingsPage
│       │   ├── components/        # CrmLayout
│       │   └── context/           # AuthContext
│       ├── redesign/              # ОСНОВНОЙ публичный UI
│       │   ├── pages/             # 6 страниц (Index, Catalog, Complex, Apartment, Map, Layouts)
│       │   ├── components/        # 8 компонентов
│       │   └── data/              # types.ts, mappers.ts
│       ├── pages/                 # OLD страницы — доступны через /old/* 
│       ├── admin/                 # Admin UI (CMS) — /admin/*
│       └── hooks/                 # 8 хуков
└── public/build/                  # Vite output (деплоится на сервер)
```

## Два frontend-слоя

| Слой | Маршруты | Статус |
|---|---|---|
| `redesign/` | `/`, `/catalog`, `/complex/:slug`, `/apartment/:id`, `/map`, `/layouts/:complex` | **АКТИВНЫЙ** |
| `pages/` | `/old/*` | Устаревший, только для обратной совместимости |
| `crm/` | `/crm/*` | Активный CRM-интерфейс |
| `admin/` | `/admin/*` | Admin CMS (отдельная система) |

## Окружение: две deployment-точки на одном сервере

```
/var/www/livegrid.ru  ← livegrid.ru (production HTTPS)
/var/www/livegrid     ← dev.livegrid.ru (dev HTTPS)
```

Обе директории синхронизируются при деплое. Обе используют одну БД (MySQL `livegrid`).
