# 04 — Реальное API

> Источник: routes/api.php + curl-тесты на production. Дата: 2026-03-25.

## Результаты реального тестирования

```
GET /api/v1/health        → HTTP 200  {"status":"ok","timestamp":"2026-03-25T17:08:13Z"}
GET /api/v1/search/complexes?perPage=1 → HTTP 200  total=482
GET /api/v1/search/suggest?q=ко        → HTTP 200  11 items (complex:5, metro:3, district:3)
GET /api/v1/map/complexes?bounds...    → HTTP 200  381 items
GET /api/v1/filters                    → HTTP 200  districts:181, subways:447, builders:561, finishings:7
GET /api/v1/complexes?perPage=1        → HTTP 200  OK
GET /api/v1/apartments?perPage=1       → HTTP 200  OK
GET /api/v1/complexes/{slug}           → HTTP 200  OK
GET /api/v1/apartments/{id}            → HTTP 200  OK
POST /api/v1/crm/auth/login (bad creds) → HTTP 422 (expected — wrong credentials)
```

---

## Public API v1

### `GET /api/v1/health`
```json
{"status": "ok", "timestamp": "2026-03-25T17:08:13.015304Z"}
```

---

### `GET /api/v1/search/complexes`

**Используется:** каталог `/catalog`, главная страница.  
**Источник данных:** `complexes_search` через `SearchService`.

**Query params:**
| Param | Тип | Описание |
|---|---|---|
| search | string | LIKE по name, address, builder_name, district_name, subway_name |
| priceMin | int | price_to >= priceMin (рубли) |
| priceMax | int | price_from > 0 AND price_from <= priceMax (рубли) |
| rooms[] | int[] | фильтр по rooms_0..rooms_4 boolean |
| district[] | string[] | whereIn(district_name) |
| subway[] | string[] | whereIn(subway_name) — название с суффиксом, напр. "Котельники (11л)" |
| builder[] | string[] | orWhere LIKE builder_name |
| finishing[] | string[] | boolean flags |
| deadline[] | string[] | whereIn(deadline) |
| status[] | string[] | whereIn(status) |
| areaMin/areaMax | decimal | min_area/max_area |
| floorMin/floorMax | int | |
| sort | string | price_from, available_apartments, name |
| sortDir | asc/desc | |
| perPage | int | default 20, max 100 |
| page | int | |

**Response shape:**
```json
{
  "data": [{
    "id": "uuid",
    "slug": "gorodskoi-bor",
    "name": "Городской Бор",
    "description": "...",
    "district": {"id": "...", "name": "Пресненский"},
    "subway": {"id": "...", "name": "Баррикадная (5л)", "line": "5"},
    "subwayDistance": "5 мин",
    "builder": {"id": "...", "name": "ПИК"},
    "address": "...",
    "coords": {"lat": 55.76, "lng": 37.58},
    "status": "building",
    "deadline": "4 кв. 2025",
    "priceFrom": 7500000,
    "priceTo": 25000000,
    "images": ["https://cdn..."],
    "advantages": [],
    "infrastructure": [],
    "totalAvailableApartments": 47,
    "roomsBreakdown": [{"rooms": 1, "count": 20, "minPrice": 7500000, "minArea": 32.5}]
  }],
  "meta": {"total": 482, "page": 1, "perPage": 20, "lastPage": 25}
}
```

---

### `GET /api/v1/search/suggest?q={query}`

**Используется:** заголовок поиска (`RedesignHeader.tsx`).  
**Минимальная длина запроса:** 2 символа.  
**Кэш:** 60 секунд по md5(lowercase query).

**Response:**
```json
[
  {"type": "complex", "id": "uuid", "slug": "...", "name": "...", "district": "...", "subway": "...", "image": "https://..."},
  {"type": "metro", "id": "...", "name": "Котельники (11л)"},
  {"type": "district", "id": "...", "name": "Котловка"}
]
```
Max: 5 комплексов + 3 метро + 3 района = до 11 элементов.

---

### `GET /api/v1/map/complexes`

**Используется:** карта (`RedesignMap.tsx`) через `useMapComplexes` hook.  
**Query params:** bounds[north/south/east/west] + те же фильтры что в search/complexes.

**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "slug": "...",
    "name": "...",
    "coords": [55.76, 37.58],
    "images": ["..."],
    "priceFrom": 7500000,
    "district": "Пресненский",
    "subway": "Баррикадная (5л)",
    "builder": "ПИК",
    "available": 47
  }]
}
```

---

### `GET /api/v1/complexes/{slug}`

**Используется:** страница комплекса (`RedesignComplex.tsx`).

**Response:** `{"data": {полный объект комплекса с buildings, apartments по корпусам}}`

---

### `GET /api/v1/apartments/{id}`

**Используется:** страница квартиры (`RedesignApartment.tsx`).

**Response shape (keys):**
```
id, complexId, buildingId, rooms, roomCategory, roomName, area, kitchenArea,
floor, totalFloors, price, pricePerMeter, finishing, status, planImage, section
```

---

### `GET /api/v1/filters`

**Используется:** FilterSidebar (каталог + карта).  
**Кэш:** 1800 секунд.

```json
{
  "districts": [{"id": "...", "name": "Хамовники"}, ...],
  "subways": [{"id": "...", "name": "Котельники (11л)", "line": "11"}, ...],
  "builders": [{"id": "...", "name": "ПИК"}, ...],
  "finishings": [{"id": "...", "name": "без отделки"}, ...]
}
```

---

## CRM API (требует Sanctum token)

Все маршруты: `POST /api/v1/crm/auth/login` → получить token → `Authorization: Bearer {token}`.

### Полный список CRM endpoints (36 маршрутов)

```
POST   /api/v1/crm/auth/login
POST   /api/v1/crm/auth/logout         [auth]
GET    /api/v1/crm/auth/me             [auth]

GET    /api/v1/crm/dashboard           [auth]

GET    /api/v1/crm/complexes           [auth]  ?search, builder_id, district_id, status, per_page, page
POST   /api/v1/crm/complexes           [auth]
GET    /api/v1/crm/complexes/{id}      [auth]
PUT    /api/v1/crm/complexes/{id}      [auth]
DELETE /api/v1/crm/complexes/{id}      [auth]
GET    /api/v1/crm/complexes/{id}/buildings [auth]

GET    /api/v1/crm/apartments          [auth]  ?complex_id, rooms, status, source, search, price_min/max, floor_min/max
POST   /api/v1/crm/apartments          [auth]
GET    /api/v1/crm/apartments/{id}     [auth]
PUT    /api/v1/crm/apartments/{id}     [auth]
DELETE /api/v1/crm/apartments/{id}     [auth]  (soft delete)
POST   /api/v1/crm/apartments/bulk     [auth]  action: update_status|delete|restore|assign_complex
GET    /api/v1/crm/apartments-deleted  [auth]  трэш
POST   /api/v1/crm/apartments/{id}/restore [auth]
GET    /api/v1/crm/apartments/{id}/history [auth]  ← всегда пустой (0 строк в apartment_changes)
POST   /api/v1/crm/apartments/{id}/lock   [auth]
POST   /api/v1/crm/apartments/{id}/unlock [auth]

GET    /api/v1/crm/builders            [auth]  CRUD
POST   /api/v1/crm/builders
GET    /api/v1/crm/builders/{id}
PUT    /api/v1/crm/builders/{id}
DELETE /api/v1/crm/builders/{id}

GET    /api/v1/crm/districts           [auth]  CRUD (→ regions table)
POST   /api/v1/crm/districts
GET    /api/v1/crm/districts/{id}
PUT    /api/v1/crm/districts/{id}
DELETE /api/v1/crm/districts/{id}

GET    /api/v1/crm/monitoring          [auth]
GET    /api/v1/crm/feed/status         [auth]
POST   /api/v1/crm/feed/download       [auth]
POST   /api/v1/crm/feed/sync           [auth]
GET    /api/v1/crm/finishings-list     [auth]
```

---

## Известные проблемы API

| Проблема | Endpoint | Описание |
|---|---|---|
| `builder` всегда null в CRM | `GET /crm/complexes/{id}` | `blocks.builder_id = NULL`, поэтому `$complex->builder` = null |
| История пустая | `GET /crm/apartments/{id}/history` | `apartment_changes` = 0 строк |
| Queue jobs не работают | Все CRM мутации | `SyncComplexesSearchJob` не выполняется (нет queue worker) |
| `search/complexes` total=482 (не 1297) | `GET /search/complexes` | Показывает только комплексы с available_apartments > 0 |
