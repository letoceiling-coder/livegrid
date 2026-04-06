# 09 — Roadmap (новый, по факту)

> Построен на основе реального аудита. Дата: 2026-03-25.

---

## PHASE 1 — Stabilization (1–2 недели)

**Цель:** исправить критические баги, сделать систему надёжной.

### 1.1 Queue Worker (ISSUE-01) — КРИТИЧНО
```bash
# Вариант A: supervisor (рекомендуется)
apt install supervisor
# /etc/supervisor/conf.d/livegrid-queue.conf:
[program:livegrid-queue]
command=php /var/www/livegrid.ru/artisan queue:work --sleep=3 --tries=3 --timeout=300
autostart=true
autorestart=true
user=www-data

# Вариант B (быстрый): заменить ShouldQueue на синхронное выполнение
# В SyncComplexesSearchJob удалить implements ShouldQueue,
# В DispatchComplexSearchSync заменить dispatch() на Artisan::call()
```

### 1.2 Builder в импорте (ISSUE-02 + 03)
Два варианта:
- **A (правильный):** Найти builder_id в feeds/blocks.json и сохранять в `blocks.builder_id`
- **B (обходной, уже частично сделан):** Продолжать брать из apartments, дополнительно парсить `builder_name` из `blocks.name` (heuristic)

### 1.3 Логирование изменений (ISSUE-04)
```php
// Проверить и зарегистрировать ApartmentObserver в AppServiceProvider
// LogsChanges trait должен писать в apartment_changes при updated/created events
```

### 1.4 Фильтр цен — квартиры с price=1 (ISSUE-05)
```sql
-- Обнаружить масштаб проблемы:
SELECT COUNT(*) FROM apartments WHERE price <= 100;
-- Добавить в PublicController filter: WHERE price > 1000
```

### 1.5 Устаревший код (ISSUE-09)
```tsx
// App.tsx: перевести старые страницы на lazy + удалить синхронные import
```

---

## PHASE 2 — Data Consistency (2–4 недели)

**Цель:** полнота данных в каталоге.

### 2.1 builder_name для всех комплексов
- Запустить аудит: у каких из 815 комплексов нет builder — добавить вручную или из альтернативного источника
- Рассмотреть: парсить застройщика из `blocks.address` или связанных источников

### 2.2 section для шахматки (ISSUE-06)
- Проверить, приходит ли `section` в фиде для apartments
- Если нет — рассчитывать section из `apartment_number` (по маске)

### 2.3 Geo-иерархия (ISSUE-08)
- Наполнить `cities`, `countries`, `geo_regions`, `geo_districts`
- Связать `regions` → `cities` → `geo_regions` → `countries`
- Возможность фильтрации по городу/региону

### 2.4 price=1 cleanup
- Регулярный job: помечать квартиры с price < 1000 как is_active=false
- Или: исключать при импорте (`ApartmentDTO::isValid()` check)

---

## PHASE 3 — CRM Core (4–8 недель)

**Цель:** полностью функциональная CRM для работы с данными.

### 3.1 История изменений (ISSUE-04)
- Зарегистрировать `ApartmentObserver`
- Добавить UI в ApartmentForm (отображение `apartment_changes`)

### 3.2 Полный CRUD застройщиков с логотипами
- Добавить поле `logo_url` в builders
- Поддержка загрузки изображений

### 3.3 Управление subway-связями
- CRM UI для привязки metro к комплексу
- Визуальный редактор расстояний (time, type)

### 3.4 Bulk operations UI
- ApartmentList: checkbox selection
- Кнопки: изменить статус, удалить, восстановить, переназначить комплекс

### 3.5 Queue monitoring в CRM
- FeedPage: показывать статус queue jobs
- Оповещение при застрявших jobs

---

## PHASE 4 — Dynamic System (8–16 недель)

**Цель:** масштабируемая система, не требующая изменений кода для добавления новых типов данных.

### 4.1 Активация Dynamic Attributes
```sql
-- Пример заполнения attributes:
INSERT INTO attributes (code, name, type) VALUES 
  ('ceiling_height', 'Высота потолков', 'float'),
  ('parking', 'Парковка', 'bool'),
  ('view', 'Вид из окна', 'string');
```
- Активировать `AttributeMapper` в `UpsertService`
- CRM: AttributesPage показывает реальные атрибуты
- Поиск: фильтрация по атрибутам

### 4.2 Schema-driven CRM UI
- Generic `EntityList` и `EntityForm` компоненты на основе schema
- Добавление нового поля = изменение schema, не кода

### 4.3 Universal search
- Добавить атрибуты в `complexes_search` (JSON column или отдельные колонки)
- Расширить `SearchService` для фильтрации по атрибутам

### 4.4 Roles & Permissions
- Добавить роли: admin, manager, analyst
- Разграничение доступа к ресурсам

### 4.5 Webhooks / Real-time
- Webhook при изменении статуса квартиры
- WebSocket для real-time обновлений в каталоге

---

## Быстрые победы (Quick Wins)

Можно сделать немедленно, не затрагивая архитектуру:

| Задача | Время | Impact |
|---|---|---|
| Запустить queue worker (supervisor) | 30 мин | CRM mutations → auto-sync |
| Добавить `WHERE price > 1000` в каталог | 15 мин | Убрать мусорные данные |
| Перевести `/old/*` страницы на lazy | 30 мин | Уменьшить bundle |
| `complexes:sync-search` в cron (daily) | 15 мин | Резервная синхронизация |
| Заполнить `rooms` таблицу корректно | 1 час | rooms_count отображается правильно |
