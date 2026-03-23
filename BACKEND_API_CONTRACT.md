# Backend API Contract

**Версия:** 1.0  
**Дата:** 2026-03-18  
**Источник:** Frontend Template Analysis  
**Критическое правило:** Frontend является источником истины. Backend должен точно соответствовать требованиям frontend.

---

## STEP 1 — ENTITIES & MODELS

### Маппинг терминов

| Frontend | Backend DB | Примечание |
|----------|------------|------------|
| Complex | `blocks` | Жилой комплекс |
| Building | `buildings` | Корпус |
| Apartment | `apartments` | Квартира |
| District | `districts` / `regions` | Район |
| Subway | `subways` | Станция метро |
| Builder | `builders` | Застройщик |
| Finishing | `finishings` | Тип отделки |

### Laravel Models

#### 1. Complex (Block)

**Файл:** `app/Models/Catalog/Complex.php`

```php
<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Complex extends Model
{
    protected $table = 'blocks';
    
    protected $fillable = [
        'id',
        'name',
        'slug',
        'description',
        'district_id',
        'builder_id',
        'lat',
        'lng',
        'address',
        'status',
        'deadline',
        'images',
        'advantages',
        'infrastructure',
    ];
    
    protected $casts = [
        'images' => 'array',
        'advantages' => 'array',
        'infrastructure' => 'array',
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
    ];
    
    // Relationships
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class, 'district_id');
    }
    
    public function builder(): BelongsTo
    {
        return $this->belongsTo(Builder::class, 'builder_id');
    }
    
    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class, 'block_id');
    }
    
    public function subways(): BelongsToMany
    {
        return $this->belongsToMany(Subway::class, 'block_subway', 'block_id', 'subway_id')
            ->withPivot('distance_time', 'distance_type')
            ->withTimestamps();
    }
    
    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'block_id');
    }
}
```

#### 2. Building

**Файл:** `app/Models/Catalog/Building.php`

```php
<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Building extends Model
{
    protected $fillable = [
        'id',
        'block_id',
        'name',
        'floors',
        'sections',
        'deadline',
        'building_type_id',
    ];
    
    protected $casts = [
        'deadline' => 'date',
        'floors' => 'integer',
        'sections' => 'integer',
    ];
    
    // Relationships
    public function complex(): BelongsTo
    {
        return $this->belongsTo(Complex::class, 'block_id');
    }
    
    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'building_id');
    }
    
    public function buildingType(): BelongsTo
    {
        return $this->belongsTo(BuildingType::class, 'building_type_id');
    }
}
```

#### 3. Apartment

**Файл:** `app/Models/Catalog/Apartment.php`

```php
<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Apartment extends Model
{
    protected $fillable = [
        'id',
        'building_id',
        'block_id',
        'source_id',
        'external_id',
        'rooms_count',
        'area_total',
        'area_kitchen',
        'floor',
        'floors',
        'price',
        'finishing_id',
        'status',
        'plan_image',
        'section',
        'is_active',
        'last_seen_at',
    ];
    
    protected $casts = [
        'price' => 'integer',
        'area_total' => 'decimal:2',
        'area_kitchen' => 'decimal:2',
        'floor' => 'integer',
        'floors' => 'integer',
        'rooms_count' => 'integer',
        'section' => 'integer',
        'is_active' => 'boolean',
        'last_seen_at' => 'datetime',
    ];
    
    // Relationships
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class, 'building_id');
    }
    
    public function complex(): BelongsTo
    {
        return $this->belongsTo(Complex::class, 'block_id');
    }
    
    public function finishing(): BelongsTo
    {
        return $this->belongsTo(Finishing::class, 'finishing_id');
    }
    
    // Computed
    public function getPricePerMeterAttribute(): float
    {
        return $this->area_total > 0 
            ? round($this->price / $this->area_total, 2) 
            : 0;
    }
}
```

#### 4. District

**Файл:** `app/Models/Catalog/District.php`

```php
<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class District extends Model
{
    protected $table = 'districts';
    
    protected $fillable = [
        'id',
        'name',
    ];
    
    // Relationships
    public function complexes(): HasMany
    {
        return $this->hasMany(Complex::class, 'district_id');
    }
}
```

#### 5. Subway

**Файл:** `app/Models/Catalog/Subway.php`

```php
<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Subway extends Model
{
    protected $fillable = [
        'id',
        'name',
        'line',
    ];
    
    // Relationships
    public function complexes(): BelongsToMany
    {
        return $this->belongsToMany(Complex::class, 'block_subway', 'subway_id', 'block_id')
            ->withPivot('distance_time', 'distance_type')
            ->withTimestamps();
    }
}
```

#### 6. Builder

**Файл:** `app/Models/Catalog/Builder.php`

```php
<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Builder extends Model
{
    protected $fillable = [
        'id',
        'name',
    ];
    
    // Relationships
    public function complexes(): HasMany
    {
        return $this->hasMany(Complex::class, 'builder_id');
    }
}
```

#### 7. Finishing

**Файл:** `app/Models/Catalog/Finishing.php`

```php
<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Finishing extends Model
{
    protected $fillable = [
        'id',
        'name',
    ];
    
    // Relationships
    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'finishing_id');
    }
}
```

---

## STEP 2 — DATABASE STRUCTURE

### Существующие таблицы (обновление)

#### 1. `blocks` (Complexes)

**Миграция:** `2026_03_18_000001_add_complex_fields_to_blocks_table.php`

```php
Schema::table('blocks', function (Blueprint $table) {
    // Добавить недостающие поля для frontend
    $table->string('slug')->unique()->after('name');
    $table->text('description')->nullable()->after('slug');
    $table->string('address')->nullable()->after('lng');
    $table->enum('status', ['building', 'completed', 'planned'])->default('building')->after('address');
    $table->string('deadline')->nullable()->after('status'); // Строка, не дата
    $table->json('images')->nullable()->after('deadline');
    $table->json('advantages')->nullable()->after('images');
    $table->json('infrastructure')->nullable()->after('advantages');
    
    // Индексы
    $table->index('slug');
    $table->index('status');
    $table->index(['lat', 'lng']); // Для карты
});
```

**Структура:**
- `id` (UUID, PK)
- `name` (string)
- `slug` (string, unique) ← **НОВОЕ**
- `description` (text, nullable) ← **НОВОЕ**
- `district_id` (string, FK → districts.id)
- `builder_id` (string, FK → builders.id)
- `lat` (decimal 10,7)
- `lng` (decimal 10,7)
- `address` (string, nullable) ← **НОВОЕ**
- `status` (enum: building/completed/planned) ← **НОВОЕ**
- `deadline` (string, nullable) ← **НОВОЕ** (формат: "2025 Q4")
- `images` (json, nullable) ← **НОВОЕ** (массив URL)
- `advantages` (json, nullable) ← **НОВОЕ** (массив строк)
- `infrastructure` (json, nullable) ← **НОВОЕ** (массив строк)
- `created_at` (timestamp)

#### 2. `buildings`

**Структура:**
- `id` (UUID, PK)
- `block_id` (UUID, FK → blocks.id)
- `name` (string)
- `floors` (integer) ← **ДОБАВИТЬ** (если нет)
- `sections` (integer) ← **ДОБАВИТЬ** (если нет)
- `deadline` (date, nullable)
- `building_type_id` (string, FK → building_types.id, nullable)
- `created_at` (timestamp)

#### 3. `apartments`

**Миграция:** `2026_03_18_000002_add_apartment_fields_for_frontend.php`

```php
Schema::table('apartments', function (Blueprint $table) {
    // Добавить недостающие поля
    $table->string('finishing_id')->nullable()->after('builder_id');
    $table->enum('status', ['available', 'reserved', 'sold'])->default('available')->after('finishing_id');
    $table->string('plan_image')->nullable()->after('status');
    $table->integer('section')->nullable()->after('plan_image');
    
    // Индексы
    $table->index('finishing_id');
    $table->index('status');
    $table->index(['block_id', 'is_active']);
    $table->index(['price', 'area_total']);
});
```

**Структура:**
- `id` (UUID, PK)
- `source_id` (bigint, FK → sources.id)
- `external_id` (string)
- `building_id` (UUID, FK → buildings.id)
- `block_id` (UUID, FK → blocks.id)
- `builder_id` (string, FK → builders.id, nullable)
- `rooms_count` (integer) → frontend: `rooms`
- `area_total` (decimal 10,2) → frontend: `area`
- `area_kitchen` (decimal 10,2, nullable) → frontend: `kitchenArea`
- `floor` (integer) → frontend: `floor`
- `floors` (integer) → frontend: `totalFloors`
- `price` (bigint) → frontend: `price`
- `finishing_id` (string, FK → finishings.id, nullable) ← **НОВОЕ**
- `status` (enum: available/reserved/sold) ← **НОВОЕ**
- `plan_image` (string, nullable) ← **НОВОЕ** → frontend: `planImage`
- `section` (integer, nullable) ← **НОВОЕ**
- `is_active` (boolean)
- `last_seen_at` (timestamp, nullable)
- `created_at`, `updated_at` (timestamps)

#### 4. `districts`

**Структура:**
- `id` (string, PK)
- `name` (string, indexed)

#### 5. `subways`

**Миграция:** `2026_03_18_000003_add_line_to_subways_table.php`

```php
Schema::table('subways', function (Blueprint $table) {
    $table->string('line')->nullable()->after('name');
});
```

**Структура:**
- `id` (string, PK)
- `name` (string, indexed)
- `line` (string, nullable) ← **НОВОЕ** (линия метро)

#### 6. `builders`

**Структура:**
- `id` (string, PK)
- `name` (string, indexed)

#### 7. `finishings`

**Структура:**
- `id` (string, PK)
- `name` (string) → значения: 'без отделки', 'черновая', 'чистовая', 'под ключ'

#### 8. `block_subway` (pivot)

**Структура:**
- `block_id` (UUID, PK, FK → blocks.id)
- `subway_id` (string, PK, FK → subways.id)
- `distance_time` (integer) → время в минутах
- `distance_type` (tinyint) → тип расстояния (пешком/транспорт)

---

## STEP 3 — SEARCH TABLE (DENORMALIZED)

### `complexes_search`

**Миграция:** `2026_03_18_000010_create_complexes_search_table.php`

**Назначение:** Denormalized таблица для быстрого поиска без JOIN. Обновляется триггерами или через queue.

```php
Schema::create('complexes_search', function (Blueprint $table) {
    $table->uuid('complex_id')->primary();
    
    // Основные данные
    $table->string('name');
    $table->string('slug');
    $table->text('description')->nullable();
    
    // Денормализованные справочники
    $table->string('district_id');
    $table->string('district_name'); // Денормализовано
    $table->string('builder_id')->nullable();
    $table->string('builder_name')->nullable(); // Денормализовано
    $table->string('subway_id')->nullable();
    $table->string('subway_name')->nullable(); // Денормализовано
    $table->string('subway_line')->nullable(); // Денормализовано
    $table->string('subway_distance')->nullable(); // "7 мин"
    
    // Геолокация
    $table->decimal('lat', 10, 7)->nullable();
    $table->decimal('lng', 10, 7)->nullable();
    $table->string('address')->nullable();
    
    // Статус и сроки
    $table->enum('status', ['building', 'completed', 'planned'])->default('building');
    $table->string('deadline')->nullable();
    
    // Агрегаты из apartments (обновляются триггерами)
    $table->unsignedBigInteger('price_from')->default(0);
    $table->unsignedBigInteger('price_to')->default(0);
    $table->integer('total_apartments')->default(0);
    $table->integer('available_apartments')->default(0);
    
    // Минимальные/максимальные значения для фильтрации
    $table->decimal('min_area', 10, 2)->nullable();
    $table->decimal('max_area', 10, 2)->nullable();
    $table->integer('min_floor')->nullable();
    $table->integer('max_floor')->nullable();
    $table->json('available_rooms')->nullable(); // [0, 1, 2, 3, 4]
    $table->json('available_finishings')->nullable(); // ['без отделки', 'черновая', ...]
    
    // Медиа
    $table->json('images')->nullable();
    
    // Индексы (критично для производительности)
    $table->index('slug');
    $table->index('status');
    $table->index('district_id');
    $table->index('builder_id');
    $table->index('subway_id');
    $table->index(['price_from', 'price_to']);
    $table->index(['lat', 'lng']); // Spatial index для карты
    $table->fullText(['name', 'district_name', 'subway_name', 'builder_name']); // Full-text search
});
```

**Обновление данных:**

1. **При создании/обновлении комплекса** → INSERT/UPDATE в `complexes_search`
2. **При создании/обновлении квартиры** → UPDATE агрегатов в `complexes_search`
3. **При изменении справочников** → UPDATE денормализованных полей

**Пример SQL для обновления агрегатов:**

```sql
UPDATE complexes_search cs
SET 
    price_from = (
        SELECT MIN(price) 
        FROM apartments 
        WHERE block_id = cs.complex_id AND is_active = 1
    ),
    price_to = (
        SELECT MAX(price) 
        FROM apartments 
        WHERE block_id = cs.complex_id AND is_active = 1
    ),
    total_apartments = (
        SELECT COUNT(*) 
        FROM apartments 
        WHERE block_id = cs.complex_id
    ),
    available_apartments = (
        SELECT COUNT(*) 
        FROM apartments 
        WHERE block_id = cs.complex_id AND is_active = 1 AND status IN ('available', 'reserved')
    ),
    min_area = (
        SELECT MIN(area_total) 
        FROM apartments 
        WHERE block_id = cs.complex_id AND is_active = 1
    ),
    max_area = (
        SELECT MAX(area_total) 
        FROM apartments 
        WHERE block_id = cs.complex_id AND is_active = 1
    ),
    min_floor = (
        SELECT MIN(floor) 
        FROM apartments 
        WHERE block_id = cs.complex_id AND is_active = 1
    ),
    max_floor = (
        SELECT MAX(floor) 
        FROM apartments 
        WHERE block_id = cs.complex_id AND is_active = 1
    ),
    available_rooms = (
        SELECT JSON_ARRAYAGG(DISTINCT rooms_count) 
        FROM apartments 
        WHERE block_id = cs.complex_id AND is_active = 1
    ),
    available_finishings = (
        SELECT JSON_ARRAYAGG(DISTINCT f.name) 
        FROM apartments a
        JOIN finishings f ON a.finishing_id = f.id
        WHERE a.block_id = cs.complex_id AND a.is_active = 1
    )
WHERE cs.complex_id = ?;
```

---

## STEP 4 — API ENDPOINTS

### Base URL

Все endpoints начинаются с `/api/v1`

### Request DTO

**Файл:** `app/Http/Requests/SearchComplexesRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SearchComplexesRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'search' => 'nullable|string|max:255',
            'rooms' => 'nullable|array',
            'rooms.*' => 'integer|in:0,1,2,3,4',
            'priceMin' => 'nullable|integer|min:0',
            'priceMax' => 'nullable|integer|min:0',
            'areaMin' => 'nullable|numeric|min:0',
            'areaMax' => 'nullable|numeric|min:0',
            'district' => 'nullable|array',
            'district.*' => 'string',
            'subway' => 'nullable|array',
            'subway.*' => 'string',
            'builder' => 'nullable|array',
            'builder.*' => 'string',
            'finishing' => 'nullable|array',
            'finishing.*' => 'string',
            'deadline' => 'nullable|array',
            'deadline.*' => 'string',
            'status' => 'nullable|array',
            'status.*' => 'string|in:building,completed,planned',
            'floorMin' => 'nullable|integer|min:1',
            'floorMax' => 'nullable|integer|min:1',
            'sort' => 'nullable|string|in:price,area,name',
            'order' => 'nullable|string|in:asc,desc',
            'page' => 'nullable|integer|min:1',
            'perPage' => 'nullable|integer|min:1|max:100',
            'bounds.north' => 'nullable|numeric',
            'bounds.south' => 'nullable|numeric',
            'bounds.east' => 'nullable|numeric',
            'bounds.west' => 'nullable|numeric',
        ];
    }
}
```

---

### Endpoint 1: GET /api/v1/search/complexes

**Назначение:** Поиск и фильтрация жилых комплексов (основной endpoint для каталога)

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `search` | string | Текстовый поиск (name, district, subway, builder) |
| `rooms[]` | int[] | Комнатность: [0, 1, 2, 3, 4] |
| `priceMin` | int | Минимальная цена |
| `priceMax` | int | Максимальная цена |
| `areaMin` | float | Минимальная площадь квартир |
| `areaMax` | float | Максимальная площадь квартир |
| `district[]` | string[] | ID районов |
| `subway[]` | string[] | ID станций метро |
| `builder[]` | string[] | ID застройщиков |
| `finishing[]` | string[] | Типы отделки |
| `deadline[]` | string[] | Сроки сдачи |
| `status[]` | string[] | Статусы: building, completed, planned |
| `floorMin` | int | Минимальный этаж квартир |
| `floorMax` | int | Максимальный этаж квартир |
| `sort` | string | Сортировка: price, area, name |
| `order` | string | Направление: asc, desc |
| `page` | int | Номер страницы (default: 1) |
| `perPage` | int | Размер страницы (default: 20, max: 100) |
| `bounds[north]` | float | Границы карты (север) |
| `bounds[south]` | float | Границы карты (юг) |
| `bounds[east]` | float | Границы карты (восток) |
| `bounds[west]` | float | Границы карты (запад) |

**Пример запроса:**

```
GET /api/v1/search/complexes?search=новостройка&rooms[]=1&rooms[]=2&priceMin=3000000&priceMax=10000000&district[]=district-1&subway[]=subway-5&sort=price&order=asc&page=1&perPage=20
```

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "zhk-solnechny",
      "name": "ЖК Солнечный",
      "description": "Современный жилой комплекс...",
      "district": {
        "id": "district-1",
        "name": "Центральный район"
      },
      "subway": {
        "id": "subway-5",
        "name": "Парк Победы",
        "line": "Арбатско-Покровская"
      },
      "subwayDistance": "7 мин",
      "builder": {
        "id": "builder-1",
        "name": "СтройГрупп"
      },
      "address": "ул. Ленина, д. 10",
      "coords": {
        "lat": 55.7558,
        "lng": 37.6173
      },
      "status": "building",
      "deadline": "2025 Q4",
      "priceFrom": 3500000,
      "priceTo": 8500000,
      "images": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "advantages": [
        "Парковка",
        "Детская площадка"
      ],
      "infrastructure": [
        "Школа",
        "Детский сад"
      ],
      "totalAvailableApartments": 45
    }
  ],
  "meta": {
    "total": 156,
    "page": 1,
    "perPage": 20,
    "lastPage": 8
  }
}
```

**Логика фильтрации (критично):**

```php
// Фильтр по площади/этажу работает через EXISTS
if ($request->has('areaMin')) {
    $query->whereExists(function ($subquery) use ($request) {
        $subquery->select(DB::raw(1))
            ->from('apartments')
            ->whereColumn('apartments.block_id', 'complexes_search.complex_id')
            ->where('apartments.is_active', 1)
            ->where('apartments.area_total', '>=', $request->areaMin);
    });
}

if ($request->has('rooms')) {
    $query->whereJsonContains('available_rooms', $request->rooms);
}
```

**Производительность:**

- ✅ Используется `complexes_search` (denormalized)
- ✅ NO JOIN в runtime
- ✅ NO Eloquent (только `DB::table()`)
- ✅ Индексы на всех фильтруемых полях

---

### Endpoint 2: GET /api/v1/complexes/{slug}

**Назначение:** Получить детальную информацию о комплексе

**Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "zhk-solnechny",
    "name": "ЖК Солнечный",
    "description": "Современный жилой комплекс...",
    "district": {
      "id": "district-1",
      "name": "Центральный район"
    },
    "subway": {
      "id": "subway-5",
      "name": "Парк Победы",
      "line": "Арбатско-Покровская"
    },
    "subwayDistance": "7 мин",
    "builder": {
      "id": "builder-1",
      "name": "СтройГрупп"
    },
    "address": "ул. Ленина, д. 10",
    "coords": {
      "lat": 55.7558,
      "lng": 37.6173
    },
    "status": "building",
    "deadline": "2025 Q4",
    "priceFrom": 3500000,
    "priceTo": 8500000,
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ],
    "advantages": [
      "Парковка",
      "Детская площадка"
    ],
    "infrastructure": [
      "Школа",
      "Детский сад"
    ],
    "buildings": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Корпус 1",
        "floors": 25,
        "sections": 3,
        "deadline": "2025-12-31",
        "apartments": [
          {
            "id": "770e8400-e29b-41d4-a716-446655440002",
            "rooms": 1,
            "area": 45.5,
            "kitchenArea": 12.0,
            "floor": 5,
            "totalFloors": 25,
            "price": 4500000,
            "pricePerMeter": 98901,
            "finishing": "чистовая",
            "status": "available",
            "planImage": "https://example.com/plan1.jpg",
            "section": 1
          }
        ]
      }
    ]
  }
}
```

---

### Endpoint 3: GET /api/v1/complexes/{slug}/apartments

**Назначение:** Получить квартиры комплекса с фильтрацией и сортировкой

**Query параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `rooms` | int | Фильтр по комнатности |
| `areaMin` | float | Минимальная площадь |
| `areaMax` | float | Максимальная площадь |
| `floorMin` | int | Минимальный этаж |
| `floorMax` | int | Максимальный этаж |
| `priceMin` | int | Минимальная цена |
| `priceMax` | int | Максимальная цена |
| `finishing[]` | string[] | Типы отделки |
| `status[]` | string[] | Статусы: available, reserved, sold |
| `sort` | string | Сортировка: price, area, floor, rooms |
| `order` | string | Направление: asc, desc |

**Пример запроса:**

```
GET /api/v1/complexes/zhk-solnechny/apartments?rooms=2&areaMin=50&areaMax=80&sort=price&order=asc
```

**Response:**

```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "complexId": "550e8400-e29b-41d4-a716-446655440000",
      "buildingId": "660e8400-e29b-41d4-a716-446655440001",
      "rooms": 2,
      "area": 65.5,
      "kitchenArea": 15.0,
      "floor": 10,
      "totalFloors": 25,
      "price": 6500000,
      "pricePerMeter": 99237,
      "finishing": "чистовая",
      "status": "available",
      "planImage": "https://example.com/plan2.jpg",
      "section": 2
    }
  ],
  "meta": {
    "total": 234
  }
}
```

---

### Endpoint 4: GET /api/v1/apartments/{id}

**Назначение:** Получить детальную информацию о квартире

**Response:**

```json
{
  "data": {
    "apartment": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "complexId": "550e8400-e29b-41d4-a716-446655440000",
      "buildingId": "660e8400-e29b-41d4-a716-446655440001",
      "rooms": 2,
      "area": 65.5,
      "kitchenArea": 15.0,
      "floor": 10,
      "totalFloors": 25,
      "price": 6500000,
      "pricePerMeter": 99237,
      "finishing": "чистовая",
      "status": "available",
      "planImage": "https://example.com/plan2.jpg",
      "section": 2
    },
    "complex": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "ЖК Солнечный",
      "slug": "zhk-solnechny",
      "address": "ул. Ленина, д. 10",
      "district": "Центральный район",
      "subway": "Парк Победы",
      "subwayDistance": "7 мин",
      "builder": "СтройГрупп"
    },
    "building": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Корпус 1",
      "deadline": "2025-12-31"
    }
  }
}
```

---

### Endpoint 5: GET /api/v1/map/complexes

**Назначение:** Получить комплексы для карты (с координатами)

**Query параметры:** Те же, что в `/api/v1/search/complexes`, плюс `bounds`

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "zhk-solnechny",
      "name": "ЖК Солнечный",
      "coords": [55.7558, 37.6173],
      "images": [
        "https://example.com/image1.jpg"
      ],
      "priceFrom": 3500000,
      "district": "Центральный район",
      "subway": "Парк Победы",
      "builder": "СтройГрупп"
    }
  ]
}
```

**Примечание:** Формат `coords` — массив `[lat, lng]` для совместимости с frontend.

---

### Endpoint 6: GET /api/v1/references/districts

**Назначение:** Справочник районов

**Response:**

```json
{
  "data": [
    {
      "id": "district-1",
      "name": "Центральный район"
    },
    {
      "id": "district-2",
      "name": "Северный район"
    }
  ]
}
```

---

### Endpoint 7: GET /api/v1/references/subways

**Назначение:** Справочник станций метро

**Response:**

```json
{
  "data": [
    {
      "id": "subway-1",
      "name": "Парк Победы",
      "line": "Арбатско-Покровская"
    },
    {
      "id": "subway-2",
      "name": "Киевская",
      "line": "Кольцевая"
    }
  ]
}
```

---

### Endpoint 8: GET /api/v1/references/builders

**Назначение:** Справочник застройщиков

**Response:**

```json
{
  "data": [
    {
      "id": "builder-1",
      "name": "СтройГрупп"
    },
    {
      "id": "builder-2",
      "name": "ДомСтрой"
    }
  ]
}
```

---

### Endpoint 9: GET /api/v1/references/finishings

**Назначение:** Справочник типов отделки

**Response:**

```json
{
  "data": [
    {
      "value": "без отделки",
      "label": "Без отделки"
    },
    {
      "value": "черновая",
      "label": "Черновая"
    },
    {
      "value": "чистовая",
      "label": "Чистовая"
    },
    {
      "value": "под ключ",
      "label": "Под ключ"
    }
  ]
}
```

---

## STEP 5 — FILTER LOGIC (CRITICAL)

### Правило фильтрации по квартирам

**ВАЖНО:** В каталоге фильтруются **комплексы**, но фильтры по площади/этажу/комнатности применяются к **квартирам**.

**Пример:**

```
areaMin = 50
→ Вернуть комплексы, где EXISTS квартира с area >= 50
```

**SQL реализация:**

```php
// В SearchComplexesController
$query = DB::table('complexes_search');

// Фильтр по площади (через EXISTS)
if ($request->has('areaMin')) {
    $query->whereExists(function ($subquery) use ($request) {
        $subquery->select(DB::raw(1))
            ->from('apartments')
            ->whereColumn('apartments.block_id', 'complexes_search.complex_id')
            ->where('apartments.is_active', 1)
            ->where('apartments.area_total', '>=', $request->areaMin);
    });
}

if ($request->has('areaMax')) {
    $query->whereExists(function ($subquery) use ($request) {
        $subquery->select(DB::raw(1))
            ->from('apartments')
            ->whereColumn('apartments.block_id', 'complexes_search.complex_id')
            ->where('apartments.is_active', 1)
            ->where('apartments.area_total', '<=', $request->areaMax);
    });
}

// Фильтр по этажу
if ($request->has('floorMin')) {
    $query->whereExists(function ($subquery) use ($request) {
        $subquery->select(DB::raw(1))
            ->from('apartments')
            ->whereColumn('apartments.block_id', 'complexes_search.complex_id')
            ->where('apartments.is_active', 1)
            ->where('apartments.floor', '>=', $request->floorMin);
    });
}

// Фильтр по комнатности (через JSON)
if ($request->has('rooms')) {
    $rooms = $request->rooms;
    $query->where(function ($q) use ($rooms) {
        foreach ($rooms as $room) {
            $q->orWhereJsonContains('available_rooms', $room);
        }
    });
}

// Фильтр по отделке
if ($request->has('finishing')) {
    $finishings = $request->finishing;
    $query->where(function ($q) use ($finishings) {
        foreach ($finishings as $finishing) {
            $q->orWhereJsonContains('available_finishings', $finishing);
        }
    });
}
```

**Альтернатива (более производительная):**

Использовать предвычисленные поля в `complexes_search`:

```php
// Фильтр по площади (через предвычисленные min/max)
if ($request->has('areaMin')) {
    $query->where('max_area', '>=', $request->areaMin);
}

if ($request->has('areaMax')) {
    $query->where('min_area', '<=', $request->areaMax);
}

// Фильтр по комнатности (через JSON поле)
if ($request->has('rooms')) {
    $query->where(function ($q) use ($request) {
        foreach ($request->rooms as $room) {
            $q->orWhereJsonContains('available_rooms', $room);
        }
    });
}
```

**Рекомендация:** Использовать предвычисленные поля для простых фильтров, EXISTS — для сложных комбинаций.

---

## STEP 6 — PERFORMANCE RULES

### Строгие правила производительности

1. **NO Eloquent для поиска**
   - Использовать только `DB::table()` для `complexes_search`
   - Eloquent допустим только для детальных страниц (single record)

2. **NO JOIN в runtime search**
   - Все данные денормализованы в `complexes_search`
   - JOIN только для детальных страниц

3. **Индексы обязательны**
   - Все фильтруемые поля должны быть проиндексированы
   - Composite indexes для частых комбинаций

4. **Пагинация обязательна**
   - Default: 20 записей на страницу
   - Max: 100 записей на страницу
   - Использовать `LIMIT` и `OFFSET`

5. **Кэширование справочников**
   - `districts`, `subways`, `builders`, `finishings` кэшируются на 1 час

6. **Full-text search**
   - Использовать `MATCH() AGAINST()` для текстового поиска
   - Индекс `FULLTEXT` на `name`, `district_name`, `subway_name`, `builder_name`

### Пример оптимизированного запроса

```php
// SearchComplexesController@index
public function index(SearchComplexesRequest $request)
{
    $query = DB::table('complexes_search')
        ->where('status', '!=', 'deleted'); // Базовый фильтр
    
    // Текстовый поиск (full-text)
    if ($request->has('search')) {
        $search = $request->search;
        $query->whereRaw(
            "MATCH(name, district_name, subway_name, builder_name) AGAINST(? IN BOOLEAN MODE)",
            [$search]
        );
    }
    
    // Фильтры (используя предвычисленные поля)
    if ($request->has('priceMin')) {
        $query->where('price_to', '>=', $request->priceMin);
    }
    
    if ($request->has('priceMax')) {
        $query->where('price_from', '<=', $request->priceMax);
    }
    
    if ($request->has('district')) {
        $query->whereIn('district_id', $request->district);
    }
    
    if ($request->has('subway')) {
        $query->whereIn('subway_id', $request->subway);
    }
    
    if ($request->has('builder')) {
        $query->whereIn('builder_id', $request->builder);
    }
    
    if ($request->has('status')) {
        $query->whereIn('status', $request->status);
    }
    
    // Фильтры по квартирам (через EXISTS или предвычисленные поля)
    if ($request->has('areaMin')) {
        $query->where('max_area', '>=', $request->areaMin);
    }
    
    if ($request->has('rooms')) {
        $query->where(function ($q) use ($request) {
            foreach ($request->rooms as $room) {
                $q->orWhereJsonContains('available_rooms', $room);
            }
        });
    }
    
    // Сортировка
    $sort = $request->get('sort', 'price');
    $order = $request->get('order', 'asc');
    
    if ($sort === 'price') {
        $query->orderBy('price_from', $order);
    } elseif ($sort === 'name') {
        $query->orderBy('name', $order);
    }
    
    // Пагинация
    $perPage = min($request->get('perPage', 20), 100);
    $page = $request->get('page', 1);
    
    $total = $query->count();
    $complexes = $query
        ->skip(($page - 1) * $perPage)
        ->take($perPage)
        ->get();
    
    // Форматирование ответа
    return response()->json([
        'data' => $this->formatComplexes($complexes),
        'meta' => [
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
            'lastPage' => ceil($total / $perPage),
        ],
    ]);
}
```

---

## STEP 7 — RESPONSE FORMATTING

### Форматирование данных для frontend

**Файл:** `app/Http/Resources/ComplexResource.php`

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ComplexResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->complex_id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'district' => [
                'id' => $this->district_id,
                'name' => $this->district_name,
            ],
            'subway' => $this->subway_id ? [
                'id' => $this->subway_id,
                'name' => $this->subway_name,
                'line' => $this->subway_line,
            ] : null,
            'subwayDistance' => $this->subway_distance,
            'builder' => $this->builder_id ? [
                'id' => $this->builder_id,
                'name' => $this->builder_name,
            ] : null,
            'address' => $this->address,
            'coords' => [
                'lat' => (float) $this->lat,
                'lng' => (float) $this->lng,
            ],
            'status' => $this->status,
            'deadline' => $this->deadline,
            'priceFrom' => (int) $this->price_from,
            'priceTo' => (int) $this->price_to,
            'images' => json_decode($this->images, true) ?? [],
            'advantages' => json_decode($this->advantages, true) ?? [],
            'infrastructure' => json_decode($this->infrastructure, true) ?? [],
            'totalAvailableApartments' => (int) $this->available_apartments,
        ];
    }
}
```

**Для карты (упрощенный формат):**

```php
public function toMapArray(): array
{
    return [
        'id' => $this->complex_id,
        'slug' => $this->slug,
        'name' => $this->name,
        'coords' => [(float) $this->lat, (float) $this->lng], // Массив для frontend
        'images' => json_decode($this->images, true) ?? [],
        'priceFrom' => (int) $this->price_from,
        'district' => $this->district_name,
        'subway' => $this->subway_name,
        'builder' => $this->builder_name,
    ];
}
```

---

## STEP 8 — MIGRATION CHECKLIST

### Необходимые миграции

1. ✅ `add_complex_fields_to_blocks_table.php` — добавить slug, description, address, status, deadline, images, advantages, infrastructure
2. ✅ `add_apartment_fields_for_frontend.php` — добавить finishing_id, status, plan_image, section
3. ✅ `add_line_to_subways_table.php` — добавить поле line
4. ✅ `add_floors_sections_to_buildings_table.php` — добавить floors, sections (если нет)
5. ✅ `create_complexes_search_table.php` — создать denormalized таблицу
6. ✅ `create_complexes_search_update_trigger.php` — триггеры для обновления (опционально)

---

## STEP 9 — SUMMARY

### Ключевые моменты

1. **Frontend — источник истины:** Все поля и структуры соответствуют требованиям frontend
2. **Denormalization:** `complexes_search` для быстрого поиска без JOIN
3. **Производительность:** NO Eloquent, NO JOIN в runtime, только `DB::table()`
4. **Фильтрация:** Фильтры по квартирам работают через EXISTS или предвычисленные поля
5. **Масштабируемость:** Готово для 1M+ квартир

### Следующие шаги

1. Создать миграции для недостающих полей
2. Создать таблицу `complexes_search`
3. Реализовать контроллеры и ресурсы
4. Настроить обновление `complexes_search` (триггеры или queue)
5. Добавить индексы
6. Протестировать производительность

---

**Конец документа**
