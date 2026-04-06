# 03 — Реальное состояние БД

> Источник: `php tmp_audit.php` на сервере. Дата: 2026-03-25. БД: MySQL.

## Статус миграций

Все 53 миграции выполнены (Batch 1–13). Pendng миграций нет.

## Таблицы БД (26 таблиц)

```
apartment_attributes, apartment_changes, apartments, attributes,
block_subway, blocks, builders, building_types, buildings,
cities, complexes_search, countries, districts,
failed_jobs, finishings, geo_districts, geo_regions,
jobs, migrations, password_reset_tokens, personal_access_tokens,
regions, rooms, sources, subways, users
```

---

## Ключевые таблицы

### `blocks` — комплексы (1297 строк)

| Поле | Тип | Примечание |
|---|---|---|
| id | char(36) PK | UUID |
| name | varchar(255) | |
| slug | varchar(255) | уникальный |
| description | text NULL | |
| district_id | varchar(255) NULL → regions.id | |
| **builder_id** | varchar(255) NULL → builders.id | **NULL для всех записей** |
| source_id | bigint → sources.id | |
| external_id | varchar(255) | ID из фида |
| lat, lng | decimal(10,7) | |
| address | varchar(255) NULL | |
| status | enum('building','completed','planned','selling') NULL | |
| deadline | varchar(255) NULL | |
| images | JSON NULL | массив URL |
| advantages | JSON NULL | |
| infrastructure | JSON NULL | |
| seo_title | varchar(255) NULL | |
| seo_description | text NULL | |

**→ ROWS: 1297**

---

### `buildings` — здания (9274 строк)

| Поле | Тип |
|---|---|
| id | char(36) UUID |
| block_id | char(36) → blocks.id |
| source_id, external_id | импорт |
| building_type_id | → building_types.id NULL |
| name | varchar |
| deadline | date NULL |
| floors | smallint |
| sections | smallint |

**→ ROWS: 9274** (avg ~7 зданий на комплекс)

---

### `apartments` — квартиры (63674 строк)

| Поле | Тип | Примечание |
|---|---|---|
| id | varchar(255) PK | external_id из фида (MongoDB ObjectId) |
| source_id | → sources.id | |
| external_id | varchar | |
| building_id | char(36) → buildings.id | |
| block_id | char(36) → blocks.id | |
| builder_id | varchar NULL → builders.id | |
| finishing_id | varchar NULL → finishings.id | |
| status | enum('available','reserved','sold') | |
| plan_image | varchar NULL | |
| **section** | int NULL | **NULL для большинства записей** |
| price | bigint | в рублях |
| rooms_count | int | crm_id из rooms, нестандартные значения (23 = studio?) |
| floor | int | |
| floors | int | |
| area_total | decimal(10,2) | |
| area_kitchen | decimal(10,2) NULL | |
| area_rooms_total | decimal(10,2) NULL | |
| area_balconies | decimal(10,2) NULL | |
| lat, lng | decimal(10,7) NULL | |
| is_active | tinyint | все 63674 = active |
| last_seen_at | timestamp | |
| block_name | varchar | денормализованное имя комплекса |
| builder_name | varchar | денормализованное имя застройщика |
| district_name | varchar | денормализованное имя района |
| locked_fields | JSON NULL | поля, защищённые от перезаписи фидом |
| deleted_at | timestamp NULL | soft delete |
| source | varchar(20) | 'feed' или 'manual' |

**→ ROWS: 63674** (все is_active=1, все status='available')

---

### `complexes_search` — поисковый индекс (1297 строк)

Денормализованная таблица для быстрого поиска/каталога.

| Поле | Тип | Примечание |
|---|---|---|
| complex_id | char(36) PK → blocks.id | |
| name, slug | varchar | |
| description | text NULL | |
| district_id, district_name | varchar NULL | |
| builder_id, **builder_name** | varchar NULL | **ЗАПОЛНЕНО только у 482/1297 (37%)** |
| subway_id, **subway_name** | varchar NULL | **ЗАПОЛНЕНО у 1295/1297 (99.8%)** |
| subway_line, subway_distance | varchar NULL | |
| lat, lng | decimal | |
| address | varchar NULL | |
| status | enum | |
| deadline | varchar NULL | |
| price_from, price_to | bigint | в рублях |
| total_apartments | int | |
| available_apartments | int | |
| min_area, max_area | decimal | |
| min_floor, max_floor | int | |
| rooms_0..rooms_4 | tinyint(1) | boolean flags |
| finishing_* | tinyint(1) | 4 boolean flags |
| images, advantages, infrastructure | JSON NULL | |
| updated_at | timestamp | |

**→ ROWS: 1297**  
**→ builder_name populated: 482 (37%)**  
**→ subway_name populated: 1295 (99.8%)**  
**→ FULLTEXT INDEX:** name, district_name, subway_name, builder_name

---

### `block_subway` — пивот комплекс ↔ метро (2498 строк)

| Поле | Тип |
|---|---|
| block_id | varchar PK → blocks.id |
| subway_id | varchar PK → subways.id |
| distance_time | int (минуты) |
| distance_type | tinyint (1=пешком, 2=транспорт) |

**→ ROWS: 2498** (avg ~1.9 метро на комплекс)

---

### `subways` — станции метро (447 строк)

| Поле | Пример значения |
|---|---|
| id | '6449472b1d8e103d38514be8' |
| name | 'Котельники (11л)' — **С суффиксом линии** |
| line | varchar NULL |

---

### `regions` — районы (181 строка)

| Поле |
|---|
| id, name |

---

### `builders` — застройщики (561 строка)

---

### `attributes` — динамические атрибуты (0 строк)

**ТАБЛИЦА СУЩЕСТВУЕТ, НО ПУСТАЯ.** Схема готова к использованию, данные не наполнялись.

Схема: `id, code, name, type, created_at, updated_at`

---

### `apartment_attributes` — значения атрибутов (0 строк)

**ПУСТАЯ.** Зависит от `attributes`.

Схема: `apartment_id, attribute_id, value_int, value_float, value_string, value_bool, value_json`

---

### `apartment_changes` — история изменений квартир (0 строк)

**ПУСТАЯ.** `LogsChanges` trait присутствует в `Apartment`, но, судя по 0 строкам, логирование не срабатывало (или срабатывало только для manual-изменений через CRM, которых ещё не было).

---

### `users` (1 строка)

1 пользователь, is_admin=1.

---

### Geo-таблицы (города, страны, регионы, гео-районы)

`cities`, `countries`, `geo_districts`, `geo_regions` — созданы в batch 13, **данных нет**, модели в `app/Models/Geo/` существуют но не интегрированы в бизнес-логику.

---

## Foreign Keys (ключевые)

```
apartments.block_id    → blocks.id
apartments.building_id → buildings.id
apartments.builder_id  → builders.id
apartments.finishing_id → finishings.id
apartments.source_id   → sources.id
buildings.block_id     → blocks.id
blocks.district_id     → regions.id
blocks.builder_id      → builders.id  ← всегда NULL
block_subway.block_id  → blocks.id
block_subway.subway_id → subways.id
```

## Индексы

- `apartments`: 22 индекса (composite по price+rooms, block+status+active и т.д.)
- `complexes_search`: FULLTEXT(name, district_name, subway_name, builder_name) + 19 обычных
- `blocks`: lat/lng composite для spatial запросов

## Критические несоответствия данных

| Проблема | Факт |
|---|---|
| `blocks.builder_id = NULL` для всех | 1297/1297 блоков без builder на уровне блока |
| `complexes_search.builder_name` частично | 482/1297 (37%) — builder берётся из apartments |
| `apartments.section = NULL` для большинства | Шахматка не полностью заполнена |
| `apartments.price = 1` для части записей | Данные о цене в фиде отсутствуют → ставится 1 |
| `attributes` = 0 строк | Dynamic attributes не работает |
| `apartment_changes` = 0 строк | История изменений не пишется |
| Geo-таблицы пустые | `cities`, `countries`, etc. без данных |
