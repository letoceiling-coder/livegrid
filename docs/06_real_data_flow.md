# 06 — Реальный Data Flow

> Источник: код сервисов + команд. Дата: 2026-03-25.

## 1. Feed → Database

```
External Feed (JSON files via FeedDownloader)
        ↓
feed:download  →  FeedDownloader → скачивает blocks.json, apartments.json, 
                                    builders.json, subways.json, regions.json и т.д.
        ↓
feed:import  →  FeedImporter::run()
                ├─ ReferenceImporter::import()
                │   └─ builders, subways (с line), regions, finishings, rooms, building_types, sources
                │       → INSERT OR UPDATE в соответствующие таблицы
                │
                ├─ BlockImporter::import()
                │   └─ FOR EACH block in blocks.json:
                │       ├─ UPSERT в blocks (id=UUID, name, slug, address, lat, lng, status, etc.)
                │       ├─ builder_id НЕ СОХРАНЯЕТСЯ в blocks (приходит в apartments)
                │       └─ block_subway: DELETE old → INSERT new (из item['subway'][])
                │
                ├─ BuildingImporter::import()
                │   └─ UPSERT buildings (block_id, floors, sections, deadline, etc.)
                │
                └─ UpsertService::upsert(ApartmentDTO[])
                    └─ FOR EACH apartment:
                        ├─ Проверка locked_fields (locked поля не перезаписываются)
                        ├─ UPSERT в apartments:
                        │   block_id, building_id, builder_id (из фида), price, rooms_count,
                        │   area_total, floor, status, plan_image, section, etc.
                        └─ AttributeMapper → apartment_attributes (ОТКЛЮЧЕНО, UNUSED)
```

**BREAK POINT #1:** `blocks.builder_id` не сохраняется из фида. Builder хранится только в `apartments.builder_id`.

**BREAK POINT #2:** `UpsertService::upsert` пропускает `apartment_attributes` (закомментировано).

---

## 2. Database → complexes_search (sync)

```
Artisan: complexes:sync-search
        └─ SyncComplexesSearchCommand::handle()
            ├─ Читает все blocks (комплексы)
            ├─ Для каждого блока:
            │   ├─ Считает available_apartments, total_apartments из apartments
            │   ├─ Считает price_from/price_to (MIN/MAX WHERE price > 0)
            │   ├─ Определяет rooms_0..rooms_4 (EXISTS apartments WHERE rooms_count=N)
            │   ├─ Определяет finishing_* (EXISTS apartments WHERE finishing_id=...)
            │   ├─ Берёт builder_id ИЗ APARTMENTS (не из blocks!):
            │   │     SELECT block_id, builder_id FROM apartments WHERE block_id IN (...)
            │   ├─ Берёт subway из block_subway (первый ближайший)
            │   └─ UPSERT в complexes_search
            └─ Логирует результат
```

**BREAK POINT #3:** `complexes_search.builder_name` заполняется только если в `apartments` есть `builder_id`. 815/1297 комплексов (63%) не имеют builder_name в search.

---

## 3. Database → API (запрос)

```
Client → GET /api/v1/search/complexes?...
          └─ SearchComplexesController::index(SearchComplexesRequest)
              └─ SearchService::search($filters)
                  ├─ DB::table('complexes_search')
                  ├─ Применяет фильтры (LIKE, ranges, booleans, whereIn)
                  ├─ Добавляет bounds (lat/lng)
                  ├─ Сортировка
                  ├─ Пагинация
                  └─ CACHE по ключу с версией (CacheInvalidator::searchVersion())
                      └─ Response::json(data + meta)

Client → GET /api/v1/map/complexes?bounds=...
          └─ MapController::complexes()
              ├─ SearchService::searchForMap($filters)
              └─ CACHE по ключу с версией (CacheInvalidator::mapVersion())
```

---

## 4. API → Frontend

```
RedesignCatalog.tsx
  └─ useBlocks(filters, page)
      └─ fetch(`/api/v1/search/complexes?${params}`)
          └─ mapSearchComplexToModel(ApiSearchComplex) → Complex
              └─ adaptComplex(Complex) → ResidentialComplex
                  └─ ComplexCard.tsx (отображение)

RedesignMap.tsx
  └─ useMapComplexes(mapRef, filters)
      └─ [on bounds change OR filter change]:
          ├─ AbortController.abort() (предыдущий запрос)
          └─ fetch(`/api/v1/map/complexes?bounds=...&${filters}`)
              └─ mapMapComplexToModel(ApiMapComplex) → Complex
                  └─ Yandex Maps: markers.add(complex.lat, complex.lng)

RedesignHeader.tsx
  └─ [user types query (debounce 300ms, min 2 chars)]:
      └─ fetch(`/api/v1/search/suggest?q=${query}`)
          └─ Dropdown с типами: complex → /complex/:slug, metro/district → /catalog?search=
```

---

## 5. CRM mutations → Search sync

```
CRM user action (создать/изменить комплекс или квартиру)
  └─ CrmComplexController или CrmApartmentController
      └─ Model::create/update/delete
          └─ event(new ComplexSearchNeedsSync(reason, complexId, changedFields))
              └─ DispatchComplexSearchSync::handle() [synchronous]
                  ├─ CacheInvalidator::bumpSearch()/bumpMap()/all()  ← РАБОТАЕТ
                  └─ SyncComplexesSearchJob::dispatch()  ← СТАВИТСЯ В ОЧЕРЕДЬ
                      └─ jobs table: запись создаётся
                          └─ ⚠️ НО: queue worker НЕ запущен → job НЕ выполняется
                              └─ complexes_search ОСТАЁТСЯ УСТАРЕВШИМ
```

**BREAK POINT #4 (КРИТИЧЕСКИЙ):** Queue worker не запущен. После CRM-изменений `complexes_search` не обновляется автоматически. Требуется ручной запуск `php artisan complexes:sync-search`.

---

## Сводная карта Break Points

| # | Место | Описание | Последствие |
|---|---|---|---|
| 1 | `BlockImporter` | `blocks.builder_id` не сохраняется | `$complex->builder` = null в CRM |
| 2 | `UpsertService` | `apartment_attributes` отключён | Dynamic attributes = 0 данных |
| 3 | `SyncComplexesSearchCommand` | builder берётся из apartments (лишь у 37%) | 63% комплексов в каталоге без застройщика |
| 4 | `SyncComplexesSearchJob` | queue worker не запущен | Search index не синхронизируется после CRM-правок |
| 5 | `apartments.section` | NULL для большинства | Шахматка не полностью работает |
| 6 | `apartments.price = 1` | Плохие данные в фиде | Комплексы с ценой "1 руб." попадают в фильтры |
