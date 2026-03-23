# Подробный отчёт аудита проекта LiveGrid

**Дата:** 20 марта 2026  
**Версия:** 1.0  
**Область:** Frontend, Backend, Server, Git, Feed и методы разбора/фильтрации

---

## СОДЕРЖАНИЕ

1. [Обзор проекта](#1-обзор-проекта)
2. [Frontend](#2-frontend)
3. [Backend](#3-backend)
4. [Сервер и деплой](#4-сервер-и-деплой)
5. [Git](#5-git)
6. [Feed — импорт данных](#6-feed--импорт-данных)
7. [Методы разбора и фильтрации](#7-методы-разбора-и-фильтрации)
8. [Рекомендации](#8-рекомендации)

---

## 1. ОБЗОР ПРОЕКТА

**LiveGrid** — платформа каталога жилой недвижимости (новостройки). Архитектура: Laravel 10 backend + React 18 frontend.

### Ключевые сущности

| Сущность     | Таблица БД  | Описание                |
|-------------|-------------|-------------------------|
| Complex     | `blocks`    | Жилой комплекс          |
| Building    | `buildings` | Корпус                  |
| Apartment   | `apartments`| Квартира                |
| District    | `regions`   | Район                   |
| Subway      | `subways`   | Станция метро           |
| Builder     | `builders`  | Застройщик              |
| Finishing   | `finishings`| Тип отделки             |

### Стек технологий

- **Backend:** PHP 8.1+, Laravel 10, MySQL, Redis
- **Frontend:** React 18, Vite 5, Tailwind CSS, React Query, React Router
- **Сервер:** Nginx, PHP-FPM 8.2, Let's Encrypt SSL, Supervisor (queue workers)

---

## 2. FRONTEND

### 2.1 Структура

```
frontend/src/
├── redesign/              # Активная архитектура
│   ├── pages/             # RedesignIndex, RedesignCatalog, RedesignComplex, RedesignApartment, RedesignMap
│   ├── components/        # ComplexCard, FilterSidebar, ApartmentTable, MapSearch, ComplexHero
│   └── data/              # mock-data.ts, types.ts
├── components/            # Общие (Header, Footer, UI kit shadcn/ui)
├── pages/                 # Legacy (не используются)
└── shared/config/api.ts
```

### 2.2 Маршруты

| Путь             | Компонент       | Назначение                |
|------------------|-----------------|---------------------------|
| `/`              | RedesignIndex   | Главная                   |
| `/catalog`       | RedesignCatalog | Каталог ЖК                |
| `/complex/:slug` | RedesignComplex | Карточка комплекса        |
| `/apartment/:id` | RedesignApartment | Карточка квартиры      |
| `/map`           | RedesignMap     | Поиск на карте            |
| `/layouts/:complex` | RedesignLayouts | Планировки             |

### 2.3 Зависимости (package.json)

- **React 18.3**, React DOM, React Router DOM 6.30
- **@tanstack/react-query** 5.83 — кэширование API
- **Vite 5**, @vitejs/plugin-react-swc
- **Tailwind CSS 3.4**, tailwindcss-animate
- **shadcn/ui** (Radix UI, class-variance-authority, clsx, tailwind-merge)
- **lucide-react** — иконки
- **axios** (в devDependencies)

### 2.4 Состояние интеграции

- Данные: **mock** (`redesign/data/mock-data.ts`)
- API hooks: **отсутствуют** — нужны `useComplexes`, `useApartment`, `useFilters`
- Пагинация: **нет** — все данные в памяти
- Обработка ошибок: **нет** error boundaries
- Loading states: только lazy loading компонентов

---

## 3. BACKEND

### 3.1 API Endpoints (routes/api.php)

| Метод | Endpoint                          | Контроллер             | Описание              |
|-------|-----------------------------------|------------------------|-----------------------|
| GET   | /api/v1/search/complexes          | SearchComplexesController | Поиск комплексов   |
| GET   | /api/v1/complexes/{slug}          | ComplexController      | Детали комплекса      |
| GET   | /api/v1/complexes/{slug}/apartments | ComplexController    | Квартиры комплекса    |
| GET   | /api/v1/apartments/{id}           | ApartmentController    | Детали квартиры       |
| GET   | /api/v1/map/complexes             | MapController          | Комплексы для карты   |
| GET   | /api/v1/references/districts      | ReferenceController    | Районы                |
| GET   | /api/v1/references/subways        | ReferenceController    | Метро                 |
| GET   | /api/v1/references/builders       | ReferenceController    | Застройщики           |
| GET   | /api/v1/references/finishings     | ReferenceController    | Типы отделки          |

### 3.2 Модели (app/Models/Catalog/)

- `Complex.php` (таблица `blocks`)
- `Building.php`, `Apartment.php`
- `District.php`, `Subway.php`, `Builder.php`, `Finishing.php`
- `Complex.php` (blocks), `BuildingType.php`, `RoomType.php`

### 3.3 База данных

- **complexes_search** — денормализованная таблица поиска (без JOIN)
- Boolean-колонки для комнатности (`rooms_0`..`rooms_4`) и отделки (`finishing_bez_otdelki` и др.)
- Full-text индекс на `name`, `district_name`, `subway_name`, `builder_name`
- Индексы на полях фильтрации

---

## 4. СЕРВЕР И ДЕПЛОЙ

### 4.1 Конфигурация (deployment/deploy.sh)

- **Домен:** dev.livegrid.ru
- **Проект:** /var/www/livegrid
- **PHP:** 8.2
- **Стек:** Nginx, MySQL, Redis, Supervisor, Certbot

### 4.2 Этапы деплоя

1. Установка PHP, Composer, Nginx, MySQL, Redis, Node.js, Supervisor
2. Клонирование репозитория
3. Конфигурация .env (production)
4. Nginx с SSL (Let's Encrypt)
5. Миграции БД
6. Queue workers (2 процесса) через Supervisor
7. Сборка frontend (build-frontend.sh)

### 4.3 Nginx

- Root: `/var/www/livegrid/public`
- PHP-FPM: unix socket
- Gzip, client_max_body_size 20M
- SSL redirect

---

## 5. GIT

### 5.1 Репозиторий

- **Ветка:** main
- **Remote:** origin/main
- **История (последние коммиты):**
  - Add frontend build script
  - Fix Vite build manifest location
  - Configure Vite to resolve from frontend/node_modules
  - Add React Router and React Query
  - Laravel+Vite+React integration
  - Fix FeedImporter, UpsertService, ArchiveService

### 5.2 Изменённые/новые файлы (git status)

**Изменённые:** модели Catalog, deployment скрипты, routes/api.php, package.json, vite.config.js  
**Новые:** API контроллеры, Resources, SearchService, SyncComplexesSearchCommand, миграции, документация (API_IMPLEMENTATION_SUMMARY, BACKEND_API_CONTRACT, FRONTEND_TEMPLATE_ANALYSIS)

---

## 6. FEED — ИМПОРТ ДАННЫХ

### 6.1 Определение

**Feed** — внешний JSON-источник данных о квартирах. Не UI-лента, а **система импорта**.

### 6.2 Конфигурация (config/feed.php)

| Параметр         | Описание                                |
|------------------|-----------------------------------------|
| base_url         | Из FEED_ENDPOINT_PRIMARY или FEED_BASE_URL |
| auth.type        | bearer, basic, query, null               |
| endpoints        | regions, subways, builders, finishings, buildingtypes, rooms, blocks, buildings, apartments |
| storage_path     | feed/raw                                |
| timeout          | 300 сек                                 |

**Пример .env:**
```
FEED_ENDPOINT_PRIMARY=https://dataout.trendagent.ru/msk/about.json
FEED_AUTH_TYPE=null
```

### 6.3 Порядок импорта (критично)

1. **ReferenceImporter** — справочники (regions, subways, builders, finishings, buildingtypes)
2. **BlockImporter** — жилые комплексы (blocks.json)
3. **BuildingImporter** — корпуса (buildings.json)
4. **FeedImporter** — квартиры (apartments.json)

### 6.4 Команды

```bash
php artisan feed:download        # Скачивание JSON
php artisan complexes:sync-search # Синхронизация complexes_search
```

### 6.5 FeedImporter — основные методы

#### `import(array $feedData, int $sourceId, ?Carbon $importStartedAt): array`

- Обработка массива квартир чанками по 100
- Вызов `FeedMapper::map()` для каждой записи
- `UpsertService::bulkUpsert()` для bulk insert/update
- Обновление `last_seen_at` для обработанных
- `ArchiveService::reactivate()` — возврат в активные
- `ArchiveService::archive()` — архивация отсутствующих в фиде

**Возврат:** `['processed', 'created', 'updated', 'unchanged', 'archived', 'errors', 'skipped', 'completed']`

#### `importFullFeed(string $feedDir, int $sourceId): array`

Полный импорт в правильном порядке: references → blocks → buildings → apartments.

#### `importFromFile(string $filePath, int $sourceId): array`

- Файлы <50MB — загрузка в память
- Файлы >50MB — стриминг через json-machine

#### `updateLastSeenAtForProcessed(array $externalIds, int $sourceId, Carbon $importStartedAt): int`

Bulk UPDATE для `last_seen_at` и `is_active` по списку external_id (чанками по 1000).

### 6.6 FeedMapper — маппинг полей

| Feed поле           | ApartmentDTO / БД          |
|---------------------|---------------------------|
| _id                 | external_id               |
| building_id         | building_id               |
| block_id            | block_id                  |
| block_builder       | builder_id                |
| price               | price                     |
| room                | rooms_count               |
| floor, floors       | floor, floors             |
| area_total          | area_total                |
| area_kitchen        | area_kitchen              |
| block_geometry.coordinates | lat, lng          |
| block_name          | blockName                 |
| block_builder_name  | builderName               |
| block_district_name | districtName              |

**Валидация:** `_id`, `building_id`, `block_id`, `price` — обязательны.

### 6.7 ReferenceImporter, BlockImporter, BuildingImporter

- **ReferenceImporter:** upsert по `_id` как primary key
- **BlockImporter:** маппинг district_id, builder_id из справочников; координаты из geometry
- **BuildingImporter:** block_id через `blocks.external_id = feed.block_id`

### 6.8 Архивация

- Квартиры без обновления `last_seen_at` в текущем импорте → `is_active = false`
- Архивация выполняется только при успешном импорте (ошибок <10%)

---

## 7. МЕТОДЫ РАЗБОРА И ФИЛЬТРАЦИИ

### 7.1 Backend — SearchService

**Файл:** `app/Services/Catalog/Search/SearchService.php`

**Источник данных:** таблица `complexes_search` (денормализованная).

#### applyFilters() — применяемые фильтры

| Фильтр      | Поле БД / логика                              | SQL/логика                     |
|-------------|-----------------------------------------------|--------------------------------|
| search      | name, district_name, subway_name, builder_name| MATCH...AGAINST (full-text)    |
| priceMin    | price_to                                      | price_to >= priceMin           |
| priceMax    | price_from                                    | price_from <= priceMax         |
| areaMin     | max_area                                      | max_area >= areaMin            |
| areaMax     | min_area                                      | min_area <= areaMax            |
| floorMin    | max_floor                                     | max_floor >= floorMin          |
| floorMax    | min_floor                                     | min_floor <= floorMax          |
| rooms[]     | rooms_0..rooms_4                              | orWhere(rooms_N, true)         |
| district[]  | district_id                                   | whereIn(district_id)           |
| subway[]    | subway_id                                     | whereIn(subway_id)             |
| builder[]   | builder_id                                    | whereIn(builder_id)            |
| finishing[] | finishing_*                                   | orWhere(finishing_*, true)     |
| deadline[]  | deadline                                      | whereIn(deadline)              |
| status[]    | status                                        | whereIn(status)                |
| bounds      | lat, lng                                      | whereBetween                   |

#### applySorting()

- `price` → orderBy(price_from, asc/desc)
- `area` → orderBy(min_area, asc/desc)
- `name` → orderBy(name, asc/desc)

#### Кэширование

- Ключ: `search:complexes:{md5(filters+page+perPage)}`
- TTL: 60 секунд
- Драйвер: Redis (если настроен) или file

### 7.2 SearchComplexesRequest — валидация

- search: string, max 255
- rooms: array, 0–4
- priceMin/Max: integer, min 0
- areaMin/Max: numeric, min 0
- district, subway, builder, finishing, deadline, status: arrays
- floorMin/Max: integer, min 1
- sort: price|area|name
- order: asc|desc
- page: integer, min 1
- perPage: 1–100
- bounds.north/south/east/west: numeric

### 7.3 Frontend — FilterSidebar и RedesignCatalog

#### Фильтры (FilterSidebar)

- Поиск по тексту
- Комнатность (0–4)
- Цена (от/до)
- Площадь (от/до)
- Район, метро, застройщик (multi-select)
- Отделка (без отделки, черновая, чистовая, под ключ)
- Срок сдачи, статус (building/completed/planned)
- Этаж (от/до)

#### Логика фильтрации (RedesignCatalog)

```typescript
// Сейчас — на mock данных, в памяти
const filtered = useMemo(() => {
  return complexes.filter(c => {
    const q = filters.search.toLowerCase();
    if (q && !c.name.includes(q) && !c.district.includes(q) && ...) return false;
    if (filters.district.length && !filters.district.includes(c.district)) return false;
    if (filters.priceMin && c.priceTo < filters.priceMin) return false;
    if (filters.priceMax && c.priceFrom > filters.priceMax) return false;
    return true;
  });
}, [filters]);
```

#### Ограничения frontend-фильтрации

- **Площадь и этаж** в каталоге не применяются (в mock-логике)
- Референсные данные (districts, subways, builders) берутся из mock, не из API
- Нет пагинации — все комплексы в памяти

### 7.4 Связь frontend ↔ backend

| Frontend фильтр | Backend параметр | API                            |
|-----------------|------------------|--------------------------------|
| filters.search  | search           | GET /api/v1/search/complexes   |
| filters.rooms   | rooms[]          | rooms[]=1&rooms[]=2            |
| filters.priceMin/Max | priceMin, priceMax | priceMin=3000000&priceMax=10000000 |
| filters.areaMin/Max | areaMin, areaMax | areaMin=50&areaMax=100      |
| filters.district | district[]      | district[]=id1&district[]=id2  |
| filters.subway  | subway[]         | subway[]=id1                   |
| filters.builder | builder[]        | builder[]=id1                  |
| filters.finishing | finishing[]    | finishing[]=черновая           |
| filters.deadline | deadline[]      | deadline[]=2025 Q4             |
| filters.status  | status[]         | status[]=building              |
| filters.floorMin/Max | floorMin, floorMax | floorMin=1&floorMax=10    |
| -               | sort, order      | sort=price&order=asc           |
| -               | page, perPage    | page=1&perPage=20              |

---

## 8. РЕКОМЕНДАЦИИ

### Критичные

1. **Интеграция frontend с API**  
   Заменить mock на вызовы `GET /api/v1/search/complexes` и остальных endpoints через React Query.

2. **Пагинация**  
   Добавить пагинацию в каталоге (или infinite scroll) и передавать page/perPage в API.

3. **Синхронизация complexes_search**  
   Запускать `complexes:sync-search` после каждого импорта (cron или queue job).

### Средний приоритет

4. **Loading и ошибки**  
   Добавить skeletons и error boundaries на страницах каталога.

5. **Фильтры по площади и этажу**  
   Убедиться, что на frontend эти фильтры передаются в API и отображаются в UI.

6. **Унификация типов**  
   Привести типы frontend (CatalogFilters, ResidentialComplex) в соответствие с ответами API.

### Низкий приоритет

7. **Facets**  
   Возвращать количество по каждому значению фильтра (например, районы с количеством ЖК).

8. **Документация API**  
   Добавить OpenAPI/Swagger для `/api/v1/*`.

---

**Конец отчёта**
