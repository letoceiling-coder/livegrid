# 08 — Критические проблемы (только факты)

> Источник: прямой аудит кода + БД + prod-тесты. Дата: 2026-03-25.

---

## SEVERITY: CRITICAL

### ISSUE-01: Queue Worker не запущен

**PROBLEM:** `SyncComplexesSearchJob` реализует `ShouldQueue`, но на сервере нет запущенного `php artisan queue:work`.

**EVIDENCE:**
```bash
# На сервере нет supervisor/PM2 для queue:work
# jobs таблица существует, но jobs в ней не обрабатываются
systemctl is-active supervisor → inactive (или не установлен)
```

**FILE:** `app/Jobs/SyncComplexesSearchJob.php`, `app/Listeners/DispatchComplexSearchSync.php`

**IMPACT:** После любого изменения через CRM (создание/редактирование комплекса или квартиры) `complexes_search` НЕ обновляется. Публичный каталог показывает устаревшие данные до ручного запуска `php artisan complexes:sync-search`.

**FIX:** Добавить supervisor config или заменить `ShouldQueue` на синхронное выполнение.

---

### ISSUE-02: blocks.builder_id = NULL для всех записей

**PROBLEM:** Фид не содержит `builder_id` на уровне блока (комплекса). `BlockImporter` не сохраняет builder. Builder доступен только из `apartments.builder_id`.

**EVIDENCE:**
```sql
SELECT COUNT(*) FROM blocks WHERE builder_id IS NULL;
-- → 1297 (все 1297 записей)
```

**FILE:** `app/Services/Catalog/Import/BlockImporter.php`

**IMPACT:**
- `$complex->builder` → всегда `null` (Eloquent relation)
- `CrmDashboardController`: `recentComplexes` показывает builder=null
- `CrmComplexController::show`: builder=null в ответе
- При создании комплекса через CRM builder можно указать, но импортированные данные теряют его при следующем импорте

---

### ISSUE-03: complexes_search.builder_name только у 37% комплексов

**PROBLEM:** `SyncComplexesSearchCommand` берёт builder_id из `apartments` (обходное решение для ISSUE-02), но у 815 комплексов нет квартир с заполненным builder_id.

**EVIDENCE:**
```sql
SELECT COUNT(*) FROM complexes_search WHERE builder_name IS NOT NULL AND builder_name != '';
-- → 482 из 1297 (37%)
```

**FILE:** `app/Console/Commands/SyncComplexesSearchCommand.php`

**IMPACT:** 63% комплексов не видны при фильтрации по застройщику. Фильтр "Застройщик" неполный.

---

## SEVERITY: HIGH

### ISSUE-04: apartment_changes — пустая таблица

**PROBLEM:** `LogsChanges` trait присутствует в `Apartment`, но `apartment_changes` = 0 строк. История изменений не пишется.

**EVIDENCE:**
```sql
SELECT COUNT(*) FROM apartment_changes; -- → 0
```

**FILE:** `app/Models/Concerns/LogsChanges.php`, `app/Models/Catalog/Apartment.php`

**IMPACT:** `GET /api/v1/crm/apartments/{id}/history` всегда возвращает `[]`. Аудит изменений невозможен.

---

### ISSUE-05: apartments.price = 1 для части квартир

**PROBLEM:** Некоторые квартиры в фиде имеют price=0 или отсутствующую цену. При импорте ставится 1 (или DEFAULT).

**EVIDENCE:**
```sql
SELECT COUNT(*) FROM apartments WHERE price <= 1; -- > 0 записей
-- В sample: {"price": 1}
```

**IMPACT:** Фильтр по прицу в SearchService содержит защиту `price_from > 0`, но на уровне apartment это не отфильтровывается. Квартиры с ценой 1 руб. могут показываться в каталоге.

---

### ISSUE-06: apartments.section = NULL для большинства квартир

**PROBLEM:** Поле `section` (секция/подъезд) в большинстве квартир = NULL.

**EVIDENCE:** В sample apartment: `"section": null`

**FILE:** `app/Services/Catalog/Import/UpsertService.php` (mapping section)

**IMPACT:** Компонент `Chessboard.tsx` (шахматка) не может правильно отображать корпус, если секции отсутствуют.

---

### ISSUE-07: Dynamic Attributes — не работает

**PROBLEM:** Схема (`attributes`, `apartment_attributes`) и код (`AttributeMapper`, `AttributesPage`) существуют, но система не активна.

**EVIDENCE:**
```sql
SELECT COUNT(*) FROM attributes; -- → 0
SELECT COUNT(*) FROM apartment_attributes; -- → 0
```

**FILE:** `app/Services/Catalog/Import/AttributeMapper.php`, `app/Services/Catalog/Import/UpsertService.php`

**IMPACT:** Dynamic attributes для квартир недоступны. `CrmAttributes` страница показывает пустой список.

---

## SEVERITY: MEDIUM

### ISSUE-08: Geo-таблицы пустые

**PROBLEM:** Таблицы `cities`, `countries`, `geo_districts`, `geo_regions` созданы (batch 13), но без данных. Модели в `app/Models/Geo/` существуют.

**IMPACT:** Функционал по гео-иерархии (города, страны, регионы) не работает.

---

### ISSUE-09: Устаревшие страницы (`/old/*`) в production-бандле

**PROBLEM:** 12 старых страниц (`frontend/src/pages/`) импортируются в `App.tsx` как синхронные imports (не lazy!) и добавляются в бандл.

**FILE:** `frontend/src/App.tsx` строки 20, 29–39

**IMPACT:** Увеличенный bundle size. Технический долг.

**FIX:** Перевести на lazy loading или удалить маршруты.

---

### ISSUE-10: Admin система (`/admin/*`) не связана с backend

**PROBLEM:** Frontend `admin/` pages существуют (AdminPages, AdminMedia, AdminUsers, etc.), но в `routes/api.php` нет соответствующих admin API endpoints.

**IMPACT:** Admin раздел либо использует другой API (не `api/v1/`), либо работает только с mock данными.

---

### ISSUE-11: rooms_count — нестандартные значения

**PROBLEM:** В sample apartment `rooms_count: 23`. Это crm_id из `rooms` таблицы, не количество комнат.

**FILE:** `app/Models/Catalog/Apartment.php` — roomType() relation: `belongsTo(RoomType::class, 'rooms_count', 'crm_id')`

**IMPACT:** Если фронтенд использует `rooms_count` напрямую как число комнат — показывает некорректные данные. Нужно использовать `room_category` из `RoomType`.

---

## Сводная таблица

| # | Проблема | Severity | Статус | Impact |
|---|---|---|---|---|
| 01 | Queue worker не запущен | CRITICAL | Открыта | CRM правки не синхронизируются |
| 02 | blocks.builder_id всегда NULL | CRITICAL | Открыта | Builder в API = null |
| 03 | builder_name только у 37% | HIGH | Открыта | Фильтр застройщика неполный |
| 04 | apartment_changes пустая | HIGH | Открыта | История изменений недоступна |
| 05 | price = 1 для части данных | HIGH | Частично | Фильтр цен с защитой в complexes_search |
| 06 | section = NULL | HIGH | Открыта | Шахматка неполная |
| 07 | Dynamic attributes = 0 | HIGH | Открыта | Нет расширенных атрибутов |
| 08 | Geo-таблицы пустые | MEDIUM | Открыта | Гео-иерархия недоступна |
| 09 | Устаревший код в бандле | MEDIUM | Открыта | Bundle bloat |
| 10 | Admin без API | MEDIUM | Открыта | Admin UI нефункциональна |
| 11 | rooms_count = crm_id | MEDIUM | Частично | Нужен roomType для корректного отображения |
