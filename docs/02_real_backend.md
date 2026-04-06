# 02 — Реальный Backend

> Источник: код в `app/`. Дата аудита: 2026-03-25.

## Модели (app/Models/Catalog/)

| Модель | Таблица | Ключевые поля | Связи |
|---|---|---|---|
| `Complex` | `blocks` | id(UUID), name, slug, district_id, builder_id(NULL!), lat, lng, status, deadline, images(JSON), seo_title, seo_description | builder, district, buildings, subways, apartments |
| `Building` | `buildings` | id(UUID), block_id, source_id, external_id, floors, sections, deadline | complex |
| `Apartment` | `apartments` | id(string=external_id), block_id, building_id, builder_id, price, rooms_count, floor, area_total, status, plan_image, section, locked_fields(JSON), source | complex, building, finishing, roomType |
| `Builder` | `builders` | id(string), name | - |
| `Region` | `regions` | id(string), name | - |
| `District` | `regions` | extends Region | - |
| `Subway` | `subways` | id(string), name, line | - |
| `Finishing` | `finishings` | id(string), name | - |
| `RoomType` | `rooms` | id(string), crm_id, name, room_category | - |
| `BuildingType` | `building_types` | id, name | - |
| `Project` | `projects` | - | (не используется) |

**ВАЖНО:** `Complex.$table = 'blocks'` — таблица называется `blocks`, модель — `Complex`.

**ВАЖНО:** `blocks.builder_id = NULL` для всех 1297 записей. `$complex->builder` всегда вернёт `null`. Builder хранится на уровне apartment (`apartments.builder_id`, `apartments.builder_name`).

## Контроллеры Public API (app/Http/Controllers/Api/V1/)

| Контроллер | Метод | Endpoint | Описание |
|---|---|---|---|
| `ComplexController` | index | `GET /api/v1/complexes` | Список комплексов (Eloquent, старый) |
| `ComplexController` | show | `GET /api/v1/complexes/{slug}` | Детальная страница комплекса |
| `ComplexController` | apartments | `GET /api/v1/complexes/{slug}/apartments` | Квартиры комплекса |
| `ApartmentController` | index | `GET /api/v1/apartments` | Список квартир |
| `ApartmentController` | show | `GET /api/v1/apartments/{id}` | Квартира для страницы |
| `MapController` | complexes | `GET /api/v1/map/complexes` | Пины для карты (flat response) |
| `SearchComplexesController` | index | `GET /api/v1/search/complexes` | Каталог с фильтрами (SearchService) |
| `SuggestController` | index | `GET /api/v1/search/suggest?q=` | Саджест поиска |
| `ReferenceController` | filters | `GET /api/v1/filters` | Все справочники |

## Контроллеры CRM (app/Http/Controllers/Api/Crm/)

| Контроллер | Методы |
|---|---|
| `CrmAuthController` | login, logout, me |
| `CrmDashboardController` | index (stats + recent_complexes) |
| `CrmComplexController` | CRUD + event `ComplexSearchNeedsSync` |
| `CrmApartmentController` | CRUD + bulk + lock/unlock + restore + history |
| `CrmBuilderController` | CRUD |
| `CrmDistrictController` | CRUD |
| `CrmFeedController` | status, runDownload, runSync |
| `CrmMonitoringController` | index |

### CRM Auth — детально

```php
// login: validates email+password, checks is_admin=true, returns Sanctum token
// logout: deletes current token
// me: returns current user info
```

Все CRM роуты защищены `['auth:sanctum', 'crm.admin']` middleware.

## Сервисы (app/Services/)

| Сервис | Назначение |
|---|---|
| `SearchService` | Поиск по `complexes_search` с фильтрами (LIKE, ranges, boolean flags) |
| `CacheInvalidator` | Версионированная инвалидация кэша (versioned keys) |
| `FeedDownloader` | Скачивание JSON-фида |
| `FeedImporter` | Оркестрация импорта: refs → blocks → buildings → apartments |
| `BlockImporter` | Импорт блоков (комплексов) + заполнение `block_subway` |
| `BuildingImporter` | Импорт зданий |
| `FeedMapper` | Raw JSON → ApartmentDTO |
| `UpsertService` | Bulk upsert квартир (с проверкой `locked_fields`) |
| `ReferenceImporter` | Импорт справочников (subways, regions, builders, finishings, rooms) |
| `Normalizer` | Нормализация данных фида |
| `AttributeMapper` | Атрибуты квартир (UNUSED) |
| `ArchiveService` | Архивация старых квартир |

## Artisan Commands

| Команда | Описание |
|---|---|
| `complexes:sync-search` | Перестройка `complexes_search` из `blocks`+`apartments` |
| `feed:download` | Скачивание JSON-фида |
| `crm:create-admin {email} {password}` | Создание admin-пользователя |
| `deploy` | Деплой на сервер (SCP + build) |
| `test:import-production` | Тест импорта |

## Event/Job система

```
CRM CRUD
  └─ event(ComplexSearchNeedsSync($reason, $complexId, $changedFields))
       └─ DispatchComplexSearchSync::handle()
            ├─ CacheInvalidator::[bumpSearch|bumpMap|references|all]()
            └─ SyncComplexesSearchJob::dispatch()
                 └─ Artisan::call('complexes:sync-search')
```

**ПРОБЛЕМА:** `SyncComplexesSearchJob implements ShouldQueue` — требует запущенный queue worker. На продакшене worker **не запущен** (нет PM2/supervisor). Задачи ставятся в очередь, но не выполняются. `complexes_search` не перестраивается автоматически после CRM изменений.

## SearchService — фильтры

```php
// search: LIKE по name, address, builder_name, district_name, subway_name
// priceMin: price_to >= priceMin
// priceMax: price_from > 0 AND price_from <= priceMax
// rooms: boolean columns rooms_0..rooms_4
// district: whereIn('district_name', [...])
// subway: whereIn('subway_name', [...])  — DB stores "Котельники (11л)"
// builder: orWhere LIKE
// finishing: boolean columns
// deadline: whereIn
// status: whereIn
// bounds: lat/lng range
```

## CacheInvalidator — стратегия

Версионированные ключи (не flush). Ключи кэша содержат текущую версию (int). При инвалидации версия инкрементируется, старые ключи "становятся невидимыми" и истекают естественно.
