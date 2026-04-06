# 07 — Реальная CRM система

> Источник: контроллеры, frontend crm/. Дата: 2026-03-25.

## Что реально есть

### Backend CRM (API)
- ✅ Аутентификация (Sanctum, is_admin check)
- ✅ Dashboard со статистикой
- ✅ CRUD комплексов (blocks)
- ✅ CRUD квартир с расширенными операциями:
  - Soft delete + restore
  - Bulk операции (update_status, delete, restore, assign_complex, до 500 ID)
  - Lock/unlock полей (защита от перезаписи фидом)
  - История изменений (endpoint есть, данных нет)
- ✅ CRUD застройщиков
- ✅ CRUD районов
- ✅ Feed management (status, download, sync)
- ✅ Monitoring endpoint
- ✅ Event/Job система для инвалидации кэша

### Frontend CRM (`/crm/*`)
- ✅ CrmLogin — авторизация
- ✅ CrmDashboard — статистика
- ✅ ComplexList — список с фильтрами
- ✅ ComplexForm — создание/редактирование комплекса
- ✅ ApartmentList — список с фильтрами
- ✅ ApartmentForm — создание/редактирование квартиры
- ✅ AttributesPage — страница атрибутов (UI есть)
- ✅ FeedPage — управление фидом
- ✅ SettingsPage — настройки

---

## Что НЕ работает / пустое

### 1. Queue Worker — КРИТИЧНО
```
Проблема: SyncComplexesSearchJob ставится в очередь, но не выполняется.
Факт: нет supervisor/PM2/cron для queue:work.
Последствие: complexes_search не обновляется после CRM-правок.
Обходной путь: вручную запускать php artisan complexes:sync-search
```

### 2. Застройщик в комплексах — КРИТИЧНО
```
Проблема: blocks.builder_id = NULL для всех 1297 комплексов.
Факт: в CRM GET /crm/complexes/{id} поле builder всегда null.
При создании/редактировании комплекса через CRM можно выбрать builder_id.
Но imported complexes — без builder на уровне block.
```

### 3. История изменений — ПУСТАЯ
```
GET /api/v1/crm/apartments/{id}/history → []
apartment_changes: 0 строк
LogsChanges trait есть в Apartment.php, но не пишет в apartment_changes.
Трейт логирует через стандартный Laravel event observers — нужно проверить регистрацию.
```

### 4. Dynamic Attributes — СХЕМА ЕСТЬ, ДАННЫХ НЕТ
```
Таблицы: attributes (0 строк), apartment_attributes (0 строк)
Frontend: AttributesPage UI существует
Backend: AttributeMapper.php существует
Статус: полностью неактивно. UpsertService явно пропускает атрибуты.
```

### 5. Monitoring — неизвестный статус
```
GET /api/v1/crm/monitoring — endpoint зарегистрирован.
CrmMonitoringController существует, содержимое не проверялось детально.
```

---

## Entity System — анализ

| Вопрос | Ответ | Доказательство |
|---|---|---|
| Есть ли entity system? | Частично | Есть модели Complex, Apartment, Builder, District |
| Есть ли dynamic attributes? | Схема есть, данных нет | `attributes` = 0 строк |
| Есть ли universal CRUD? | Нет | Каждый контроллер пишет свою логику |
| Есть ли schema-driven UI? | Нет | CRM UI hardcoded под конкретные поля |
| Масштабируется ли система? | Ограниченно | Добавление нового entity = новый контроллер + форма |

---

## Механизм Locked Fields (реально работает)

```php
// При CRM-редактировании квартиры:
$editedFields = array_keys($validated);
$validated['locked_fields'] = array_unique(array_merge($apt->locked_fields ?? [], $editedFields));
$validated['source'] = 'manual';

// При импорте из фида (UpsertService):
foreach ($locked_fields as $field) {
    unset($updateData[$field]); // не перезаписываем locked поле
}
```

Это гарантирует, что ручные правки в CRM не будут перезаписаны следующим импортом фида.

---

## Права доступа

```php
// Middleware: ['auth:sanctum', 'crm.admin']
// CrmAuthController::login → проверяет is_admin = 1
// users: 1 пользователь, is_admin=1
```

Поддерживается только один уровень прав: admin/не admin. Нет ролей, нет разграничения по ресурсам.

---

## Feed Management

```
GET  /api/v1/crm/feed/status    → статус последнего импорта
POST /api/v1/crm/feed/download  → запуск feed:download через Artisan
POST /api/v1/crm/feed/sync      → запуск sync через Artisan (пересборка complexes_search)
```

**Реальный pipeline в production:**
1. Вручную или по крону: `php artisan feed:download`
2. Вручную или по крону: `php artisan feed:import` (не видно в route list — возможно другое имя)
3. Вручную: `php artisan complexes:sync-search`
