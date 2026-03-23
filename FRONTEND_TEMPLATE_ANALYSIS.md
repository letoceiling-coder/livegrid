# Frontend Template Analysis

**Дата анализа:** 2026-03-18  
**Версия:** 1.0  
**Цель:** Полное понимание структуры frontend-шаблона для интеграции с реальным backend

---

## STEP 1 — STRUCTURE ANALYSIS

### Полная структура проекта

```
frontend/src/
├── pages/                    # Основные страницы (legacy)
│   ├── Index.tsx
│   ├── Catalog.tsx
│   ├── CatalogZhk.tsx
│   ├── ObjectDetail.tsx
│   ├── ZhkDetail.tsx
│   ├── News.tsx
│   ├── NewsDetail.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   └── NotFound.tsx
│
├── redesign/                 # НОВАЯ АРХИТЕКТУРА (активная)
│   ├── pages/                # Страницы redesign
│   │   ├── RedesignIndex.tsx
│   │   ├── RedesignCatalog.tsx
│   │   ├── RedesignComplex.tsx
│   │   ├── RedesignApartment.tsx
│   │   ├── RedesignMap.tsx
│   │   └── RedesignLayouts.tsx
│   ├── components/          # Компоненты redesign
│   │   ├── RedesignHeader.tsx
│   │   ├── ComplexCard.tsx
│   │   ├── ComplexHero.tsx
│   │   ├── FilterSidebar.tsx
│   │   ├── ApartmentTable.tsx
│   │   ├── LayoutGrid.tsx
│   │   ├── Chessboard.tsx
│   │   └── MapSearch.tsx
│   └── data/                 # Mock данные
│       ├── mock-data.ts
│       └── types.ts
│
├── components/               # Общие компоненты
│   ├── Header.tsx
│   ├── FooterSection.tsx
│   ├── PropertyCard.tsx
│   ├── PropertyGridSection.tsx
│   ├── CategoryTiles.tsx
│   ├── QuizSection.tsx
│   ├── AboutPlatform.tsx
│   ├── LatestNews.tsx
│   ├── ContactsSection.tsx
│   ├── catalog/              # Компоненты каталога (legacy)
│   │   ├── CatalogFilters.tsx
│   │   ├── CatalogGrid.tsx
│   │   ├── CatalogList.tsx
│   │   ├── CatalogMapView.tsx
│   │   └── ViewToggle.tsx
│   └── ui/                   # UI компоненты (shadcn/ui)
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       └── ... (49 файлов)
│
├── admin/                    # Админ-панель
│   ├── pages/
│   ├── components/
│   ├── layout/
│   ├── models/
│   └── store/
│
├── shared/                   # Общие утилиты
│   └── config/
│       └── api.ts
│
├── hooks/                    # React hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
│
├── lib/                      # Библиотеки
│   └── utils.ts
│
└── assets/                   # Статические ресурсы
    ├── building1.jpg
    ├── building2.jpg
    ├── building3.jpg
    ├── building4.jpg
    └── ... (категории, иконки)
```

### Назначение каждого слоя

1. **`pages/`** — Legacy страницы (старая версия, не используется в активных маршрутах)
2. **`redesign/pages/`** — Основные страницы приложения (активная версия)
3. **`redesign/components/`** — Специфичные компоненты для redesign
4. **`components/`** — Переиспользуемые компоненты (общие для всего приложения)
5. **`components/ui/`** — UI-кит (shadcn/ui компоненты)
6. **`redesign/data/`** — Mock данные и типы
7. **`admin/`** — Админ-панель (CMS для управления контентом)
8. **`shared/`** — Общие конфигурации и утилиты
9. **`hooks/`** — Кастомные React hooks
10. **`lib/`** — Вспомогательные функции
11. **`assets/`** — Статические изображения

---

## STEP 2 — PAGES ANALYSIS

### Активные страницы (redesign)

#### 1. **RedesignIndex** (`/`)
- **Путь:** `/`
- **Назначение:** Главная страница
- **Отображает:**
  - Hero секция с поиском
  - Выбор региона
  - Быстрые фильтры
  - Категории недвижимости
  - Популярные комплексы (6 штук)
  - Переключение между карточками и картой
  - Горячие предложения
  - Старт продаж
  - Квиз-секция
  - О платформе
  - Последние новости
  - Контакты
  - Footer
- **Компоненты:**
  - `RedesignHeader`
  - `ComplexCard` (6 штук)
  - `MapSearch` (опционально)
  - `CategoryTiles`
  - `PropertyGridSection` (2 раза: hot, start)
  - `QuizSection`
  - `AboutPlatform`
  - `LatestNews`
  - `ContactsSection`
  - `FooterSection`

#### 2. **RedesignCatalog** (`/catalog`)
- **Путь:** `/catalog`
- **Назначение:** Каталог жилых комплексов
- **Отображает:**
  - Заголовок с количеством найденных объектов
  - Переключатель вида: grid / list / map
  - Боковая панель фильтров (desktop)
  - Мобильный drawer с фильтрами
  - Список комплексов (grid/list) или карта
- **Компоненты:**
  - `RedesignHeader`
  - `FilterSidebar`
  - `ComplexCard` (grid или list вариант)
  - `MapSearch` (если выбран режим map)
- **Фильтры:**
  - Поиск по тексту
  - Комнатность (0, 1, 2, 3, 4+)
  - Цена (от/до)
  - Площадь (от/до)
  - Район (multi-select)
  - Метро (multi-select)
  - Застройщик (multi-select)
  - Отделка (multi-select)
  - Срок сдачи (multi-select)
  - Статус (building/completed/planned)
  - Этаж (от/до)

#### 3. **RedesignComplex** (`/complex/:slug`)
- **Путь:** `/complex/:slug`
- **Назначение:** Страница жилого комплекса
- **Отображает:**
  - Hero секция с галереей
  - Информационная панель (цена, застройщик, сдача, квартиры)
  - Преимущества комплекса
  - Табы:
    - Квартиры (таблица с сортировкой)
    - Планировки (сетка)
    - Шахматка (по корпусам)
    - О комплексе
    - Инфраструктура
    - Карта
- **Компоненты:**
  - `RedesignHeader`
  - `ComplexHero`
  - `ApartmentTable`
  - `LayoutGrid`
  - `Chessboard` (по корпусам)
  - Yandex Maps (встроенная)
- **Фильтры:**
  - Фильтр по комнатности (все / студия / 1к / 2к / 3к / 4к)
  - Сортировка: price, area, floor, rooms (asc/desc)

#### 4. **RedesignApartment** (`/apartment/:id`)
- **Путь:** `/apartment/:id`
- **Назначение:** Страница квартиры
- **Отображает:**
  - Breadcrumb навигация
  - Планировка (изображение)
  - Описание квартиры
  - Цена и цена за м²
  - Детали: комнаты, площадь, кухня, этаж, отделка, сдача, район, метро
  - Кнопки CTA: позвонить, записаться на просмотр, рассчитать ипотеку
  - Информация о застройщике
- **Компоненты:**
  - `RedesignHeader`
  - Карточка с планировкой
  - Карточка с информацией
  - CTA блок

#### 5. **RedesignMap** (`/map`)
- **Путь:** `/map`
- **Назначение:** Поиск на карте
- **Отображает:**
  - Боковая панель с фильтрами
  - Карта Yandex Maps с маркерами
  - Список комплексов справа (на desktop)
  - Мобильный drawer с фильтрами
- **Компоненты:**
  - `RedesignHeader`
  - `FilterSidebar`
  - `MapSearch`
- **Фильтры:** Те же, что в каталоге

#### 6. **RedesignLayouts** (`/layouts/:complex`)
- **Путь:** `/layouts/:complex`
- **Назначение:** Страница планировок комплекса
- **Отображает:**
  - Breadcrumb
  - Сетка планировок
- **Компоненты:**
  - `RedesignHeader`
  - `LayoutGrid`

---

## STEP 3 — COMPONENT TREE

### Главная страница (RedesignIndex)

```
RedesignIndex
├── RedesignHeader
│   ├── Logo
│   ├── Navigation (desktop)
│   ├── Search (desktop/mobile)
│   ├── Favorites
│   ├── Phone
│   └── Login
├── Hero Section
│   ├── Region Selector
│   ├── Search Input
│   └── Quick Filters
├── CategoryTiles
│   └── CategoryCard (×9)
├── Featured Complexes
│   ├── View Toggle (cards/map)
│   ├── ComplexCard (×6) [grid mode]
│   └── MapSearch [map mode]
├── PropertyGridSection (hot)
│   └── PropertyCard (×4)
├── PropertyGridSection (start)
│   └── PropertyCard (×4)
├── QuizSection
├── AboutPlatform
├── Map CTA
├── CTA Section
├── AdditionalFeatures
├── LatestNews
├── ContactsSection
└── FooterSection
```

### Каталог (RedesignCatalog)

```
RedesignCatalog
├── RedesignHeader
├── Toolbar
│   ├── Title + Count
│   └── View Toggle (grid/list/map)
├── FilterSidebar (desktop)
│   ├── Search Input
│   ├── Active Tags
│   ├── Rooms Filter
│   ├── Price Range
│   ├── Area Range
│   ├── District (multi-select)
│   ├── Subway (multi-select)
│   ├── Builder (multi-select)
│   ├── Finishing (multi-select)
│   ├── Deadline (multi-select)
│   ├── Status (multi-select)
│   ├── Floor Range
│   └── Actions (Show / Reset)
├── Content Area
│   ├── ComplexCard (×N) [grid mode]
│   ├── ComplexCard (×N) [list mode]
│   └── MapSearch [map mode]
└── Mobile Filters Drawer
    └── FilterSidebar
```

### Страница комплекса (RedesignComplex)

```
RedesignComplex
├── RedesignHeader
├── Breadcrumb
├── ComplexHero
│   ├── Image Gallery
│   ├── Status Badge
│   ├── Title + Address
│   ├── Info Bar (price, builder, deadline, apartments)
│   ├── Advantages Tags
│   └── CTA Buttons
├── Tabs
│   ├── Apartments Tab
│   │   ├── Room Filter Buttons
│   │   └── ApartmentTable
│   │       └── TableRow (×N)
│   ├── Layouts Tab
│   │   └── LayoutGrid
│   │       └── LayoutCard (×N)
│   ├── Chessboard Tab
│   │   └── Chessboard (×N buildings)
│   ├── About Tab
│   │   └── Info Grid
│   ├── Infrastructure Tab
│   │   └── Infrastructure List
│   └── Map Tab
│       └── Yandex Maps
```

### Страница квартиры (RedesignApartment)

```
RedesignApartment
├── RedesignHeader
├── Breadcrumb
├── Plan Section
│   └── Plan Image
├── Description Card
└── Info Sidebar
    ├── Price Card
    │   ├── Title
    │   ├── Address
    │   ├── Price + Price/m²
    │   └── Details List
    ├── CTA Card
    │   ├── Call Button
    │   ├── Viewing Button
    │   └── Mortgage Button
    └── Builder Card
```

---

## STEP 4 — DATA SOURCES

### Mock данные

**Файл:** `frontend/src/redesign/data/mock-data.ts`

#### Структура данных

1. **ResidentialComplex** (6 комплексов)
   - Генерируются функцией `makeBuildings()` для каждого комплекса
   - Каждый комплекс содержит 2-4 корпуса

2. **Building** (генерируются динамически)
   - Каждый корпус содержит 2-5 секций
   - Каждый корпус имеет 12-25 этажей
   - Генерируются функцией `makeBuildings()`

3. **Apartment** (генерируются динамически)
   - Генерируются функцией `makeApartments()` для каждого корпуса
   - Формула: `sections × floors` квартир
   - Случайные значения: rooms, area, price, finishing, status

#### Импорт данных

```typescript
// В компонентах
import { complexes, formatPrice, getComplexBySlug, getApartmentById } from '@/redesign/data/mock-data';
import type { ResidentialComplex, Apartment, CatalogFilters } from '@/redesign/data/types';
```

#### Функции доступа к данным

- `complexes` — массив всех комплексов
- `getComplexBySlug(slug)` — получить комплекс по slug
- `getApartmentById(id)` — получить квартиру по ID
- `getAllApartments()` — получить все квартиры
- `getLayoutGroups(complexId)` — получить группы планировок
- `searchComplexes(query)` — поиск комплексов
- `formatPrice(n)` — форматирование цены

#### Референсные данные (извлекаются из комплексов)

- `districts` — уникальные районы
- `subways` — уникальные станции метро
- `builders` — уникальные застройщики
- `deadlines` — уникальные сроки сдачи

---

## STEP 5 — DATA FLOW

### Поток данных: Mock → Component

```
mock-data.ts
    ↓
types.ts (интерфейсы)
    ↓
Component (импорт)
    ↓
useState / useMemo (локальное состояние)
    ↓
Props → Child Components
    ↓
UI Rendering
```

### Структура props

#### ComplexCard
```typescript
interface Props {
  complex: ResidentialComplex;
  variant?: 'grid' | 'list';
}
```

#### FilterSidebar
```typescript
interface Props {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
  totalCount: number;
}
```

#### ApartmentTable
```typescript
interface Props {
  apartments: Apartment[];
  sort: { field: SortField; dir: SortDir };
  onSort: (field: SortField) => void;
}
```

### Ключевые интерфейсы

#### ResidentialComplex
```typescript
{
  id: string;
  slug: string;
  name: string;
  description: string;
  builder: string;
  district: string;
  subway: string;
  subwayDistance: string;
  address: string;
  deadline: string;
  status: 'building' | 'completed' | 'planned';
  priceFrom: number;
  priceTo: number;
  images: string[];
  coords: [number, number];
  advantages: string[];
  infrastructure: string[];
  buildings: Building[];
}
```

#### Building
```typescript
{
  id: string;
  complexId: string;
  name: string;
  floors: number;
  sections: number;
  deadline: string;
  apartments: Apartment[];
}
```

#### Apartment
```typescript
{
  id: string;
  complexId: string;
  buildingId: string;
  rooms: number;
  area: number;
  kitchenArea: number;
  floor: number;
  totalFloors: number;
  price: number;
  pricePerMeter: number;
  finishing: 'без отделки' | 'черновая' | 'чистовая' | 'под ключ';
  status: 'available' | 'reserved' | 'sold';
  planImage: string;
  section: number;
}
```

#### CatalogFilters
```typescript
{
  priceMin?: number;
  priceMax?: number;
  rooms: number[];
  areaMin?: number;
  areaMax?: number;
  district: string[];
  subway: string[];
  builder: string[];
  finishing: string[];
  deadline: string[];
  floorMin?: number;
  floorMax?: number;
  status: string[];
  search: string;
}
```

---

## STEP 6 — UI → DATA MAPPING

### ComplexCard (карточка комплекса)

**Требуемые данные из backend:**

```typescript
{
  // Основные
  id: string;                    // UUID
  slug: string;                   // URL-friendly имя
  name: string;                   // Название ЖК
  
  // Локация
  district: string;                // Район (из справочника)
  subway: string;                 // Станция метро (из справочника)
  subwayDistance: string;         // Расстояние до метро
  address: string;                // Полный адрес
  coords: [number, number];       // [lat, lng]
  
  // Застройщик
  builder: string;                // Название застройщика (из справочника)
  
  // Цены
  priceFrom: number;              // Минимальная цена
  priceTo: number;                // Максимальная цена
  
  // Статус
  status: 'building' | 'completed' | 'planned';
  deadline: string;                // Срок сдачи (например, "2025 Q4")
  
  // Медиа
  images: string[];                // Массив URL изображений
  
  // Дополнительно
  advantages: string[];            // Преимущества (массив строк)
  infrastructure: string[];        // Инфраструктура (массив строк)
  
  // Агрегаты (вычисляются)
  buildings: Building[];           // Корпуса
  totalAvailableApartments: number; // Количество доступных квартир
}
```

### ApartmentTable (таблица квартир)

**Требуемые данные из backend:**

```typescript
{
  apartments: [
    {
      id: string;                 // UUID
      rooms: number;               // 0 = студия, 1-4
      area: number;                // Общая площадь (м²)
      kitchenArea: number;         // Площадь кухни (м²)
      floor: number;               // Этаж
      totalFloors: number;         // Всего этажей
      price: number;               // Цена (руб)
      pricePerMeter: number;       // Цена за м² (вычисляется)
      finishing: string;           // Тип отделки
      status: 'available' | 'reserved' | 'sold';
      planImage: string;           // URL планировки
      section: number;             // Номер секции
    }
  ]
}
```

### ApartmentCard (детальная страница квартиры)

**Требуемые данные из backend:**

```typescript
{
  apartment: {
    // Все поля из ApartmentTable +
    planImage: string;             // Планировка (обязательно)
  },
  complex: {
    name: string;
    address: string;
    subway: string;
    subwayDistance: string;
    district: string;
    builder: string;
  },
  building: {
    name: string;
    deadline: string;
  }
}
```

### FilterSidebar (фильтры)

**Требуемые данные из backend:**

```typescript
{
  // Референсные данные (для выпадающих списков)
  districts: string[];             // Список районов
  subways: string[];               // Список станций метро
  builders: string[];               // Список застройщиков
  deadlines: string[];              // Список сроков сдачи
  finishingOptions: string[];      // Типы отделки
  
  // Текущие фильтры (state)
  filters: CatalogFilters;
}
```

### MapSearch (карта)

**Требуемые данные из backend:**

```typescript
{
  complexes: [
    {
      id: string;
      slug: string;
      name: string;
      coords: [number, number];    // [lat, lng] - ОБЯЗАТЕЛЬНО
      images: string[];             // Первое изображение для маркера
      priceFrom: number;
      district: string;
      subway: string;
      builder: string;
    }
  ]
}
```

---

## STEP 7 — FILTERS ANALYSIS

### Где реализованы фильтры

**Основной компонент:** `frontend/src/redesign/components/FilterSidebar.tsx`

### Структура фильтров

#### 1. **Поиск по тексту**
- **Поле:** `filters.search`
- **Тип:** `string`
- **Применяется к:** name, district, subway, builder

#### 2. **Комнатность**
- **Поле:** `filters.rooms`
- **Тип:** `number[]`
- **Значения:** `[0, 1, 2, 3, 4]` (0 = студия, 4 = 4+)
- **UI:** Кнопки-переключатели

#### 3. **Цена**
- **Поля:** `filters.priceMin`, `filters.priceMax`
- **Тип:** `number | undefined`
- **UI:** Два input поля (от/до)
- **Применяется к:** `complex.priceFrom` и `complex.priceTo`

#### 4. **Площадь**
- **Поля:** `filters.areaMin`, `filters.areaMax`
- **Тип:** `number | undefined`
- **UI:** Два input поля (от/до)
- **Применяется к:** `apartment.area` (НО в каталоге фильтруется по комплексам, не квартирам)

#### 5. **Район**
- **Поле:** `filters.district`
- **Тип:** `string[]`
- **UI:** Checkbox список
- **Источник данных:** `districts` из mock-data

#### 6. **Метро**
- **Поле:** `filters.subway`
- **Тип:** `string[]`
- **UI:** Checkbox список
- **Источник данных:** `subways` из mock-data

#### 7. **Застройщик**
- **Поле:** `filters.builder`
- **Тип:** `string[]`
- **UI:** Checkbox список
- **Источник данных:** `builders` из mock-data

#### 8. **Отделка**
- **Поле:** `filters.finishing`
- **Тип:** `string[]`
- **Значения:** `['без отделки', 'черновая', 'чистовая', 'под ключ']`
- **UI:** Checkbox список

#### 9. **Срок сдачи**
- **Поле:** `filters.deadline`
- **Тип:** `string[]`
- **UI:** Checkbox список
- **Источник данных:** `deadlines` из mock-data

#### 10. **Статус**
- **Поле:** `filters.status`
- **Тип:** `string[]`
- **Значения:** `['building', 'completed', 'planned']`
- **UI:** Checkbox список

#### 11. **Этаж**
- **Поля:** `filters.floorMin`, `filters.floorMax`
- **Тип:** `number | undefined`
- **UI:** Два input поля (от/до)
- **Применяется к:** `apartment.floor` (НО в каталоге не используется, т.к. фильтруются комплексы)

### Логика фильтрации

**Файл:** `frontend/src/redesign/pages/RedesignCatalog.tsx`

```typescript
const filtered = useMemo(() => {
  return complexes.filter(c => {
    // Поиск по тексту
    const q = filters.search.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && 
        !c.district.toLowerCase().includes(q) && 
        !c.subway.toLowerCase().includes(q) && 
        !c.builder.toLowerCase().includes(q)) return false;
    
    // Множественный выбор
    if (filters.district.length && !filters.district.includes(c.district)) return false;
    if (filters.subway.length && !filters.subway.includes(c.subway)) return false;
    if (filters.builder.length && !filters.builder.includes(c.builder)) return false;
    if (filters.deadline.length && !filters.deadline.includes(c.deadline)) return false;
    if (filters.status.length && !filters.status.includes(c.status)) return false;
    
    // Диапазоны
    if (filters.priceMin && c.priceTo < filters.priceMin) return false;
    if (filters.priceMax && c.priceFrom > filters.priceMax) return false;
    
    return true;
  });
}, [filters]);
```

**ВАЖНО:** В каталоге фильтруются **комплексы**, а не квартиры. Фильтры по площади и этажу не применяются на уровне каталога.

---

## STEP 8 — SEARCH & INTERACTIONS

### Поиск

**Компонент:** `RedesignHeader.tsx`

- **Поле поиска:** В header (desktop и mobile)
- **Логика:** `searchComplexes(query)` — поиск по name, district, subway, builder
- **Результаты:** Выпадающий список с карточками комплексов
- **Действие:** При Enter → переход на `/catalog?search=query`

### Сортировка

**Компонент:** `ApartmentTable.tsx`

- **Поля сортировки:**
  - `price` — цена
  - `area` — площадь
  - `floor` — этаж
  - `rooms` — комнатность
- **Направление:** `asc` / `desc` (переключается кликом)
- **UI:** Кнопки с иконкой `ArrowUpDown` в заголовке таблицы

### Навигация

**Маршруты:**
- `/` → Главная
- `/catalog` → Каталог
- `/catalog?search=...` → Каталог с поиском
- `/complex/:slug` → Страница комплекса
- `/apartment/:id` → Страница квартиры
- `/map` → Карта
- `/layouts/:complex` → Планировки

**Breadcrumb:**
- Каталог → Комплекс → Квартира
- Каталог → Комплекс → Планировки

---

## STEP 9 — ROUTING

### Активные маршруты (redesign)

```typescript
/                           → RedesignIndex
/catalog                   → RedesignCatalog
/catalog?search=...        → RedesignCatalog (с поиском)
/complex/:slug             → RedesignComplex
/apartment/:id             → RedesignApartment
/map                       → RedesignMap
/layouts/:complex          → RedesignLayouts
```

### Legacy маршруты (не используются)

```typescript
/old                       → Index
/old/catalog               → Catalog
/old/catalog-zhk           → CatalogZhk
/old/zhk/:slug            → ZhkDetail
/old/object/:slug         → ObjectDetail
/old/news                 → News
/old/news/:slug           → NewsDetail
```

### Auth маршруты

```typescript
/login                     → Login
/register                  → Register
/forgot-password           → ForgotPassword
/reset-password            → ResetPassword
```

### Admin маршруты

```typescript
/admin                     → AdminDashboard
/admin/pages               → AdminPages
/admin/page-editor/:slug   → AdminPageEditor
/admin/media               → AdminMedia
/admin/users               → AdminUsers
/admin/settings            → AdminSettings
/admin/tokens              → AdminTokens
/admin/editor/:pageId      → EditorPage
```

---

## STEP 10 — API REQUIREMENTS

### Критически важные endpoints

#### 1. **GET /api/v1/search/complexes**

**Назначение:** Поиск и фильтрация жилых комплексов

**Query параметры:**
```typescript
{
  search?: string;              // Текстовый поиск
  rooms?: number[];             // [0, 1, 2, 3, 4]
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;             // Минимальная площадь квартир в комплексе
  areaMax?: number;             // Максимальная площадь квартир в комплексе
  district?: string[];           // Массив ID районов
  subway?: string[];            // Массив ID станций метро
  builder?: string[];           // Массив ID застройщиков
  finishing?: string[];         // ['без отделки', 'черновая', 'чистовая', 'под ключ']
  deadline?: string[];          // Массив сроков сдачи
  status?: string[];            // ['building', 'completed', 'planned']
  floorMin?: number;            // Минимальный этаж квартир
  floorMax?: number;            // Максимальный этаж квартир
  sort?: 'price' | 'area' | 'name';  // Сортировка
  order?: 'asc' | 'desc';
  page?: number;                // Пагинация
  perPage?: number;             // Размер страницы
  bounds?: {                     // Для карты
    north: number;
    south: number;
    east: number;
    west: number;
  };
}
```

**Response:**
```typescript
{
  data: ResidentialComplex[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  };
  filters?: {                    // Опционально: доступные значения фильтров
    districts: Array<{ id: string; name: string; count: number }>;
    subways: Array<{ id: string; name: string; count: number }>;
    builders: Array<{ id: string; name: string; count: number }>;
    deadlines: Array<{ value: string; count: number }>;
  };
}
```

#### 2. **GET /api/v1/complexes/:slug**

**Назначение:** Получить детальную информацию о комплексе

**Response:**
```typescript
{
  data: {
    // Все поля ResidentialComplex +
    buildings: Building[];       // С квартирами
  };
}
```

#### 3. **GET /api/v1/complexes/:slug/apartments**

**Назначение:** Получить квартиры комплекса с фильтрацией и сортировкой

**Query параметры:**
```typescript
{
  rooms?: number;                // Фильтр по комнатности
  areaMin?: number;
  areaMax?: number;
  floorMin?: number;
  floorMax?: number;
  priceMin?: number;
  priceMax?: number;
  finishing?: string[];
  status?: string[];
  sort?: 'price' | 'area' | 'floor' | 'rooms';
  order?: 'asc' | 'desc';
}
```

**Response:**
```typescript
{
  data: Apartment[];
  meta: {
    total: number;
  };
}
```

#### 4. **GET /api/v1/apartments/:id**

**Назначение:** Получить детальную информацию о квартире

**Response:**
```typescript
{
  data: {
    apartment: Apartment;
    complex: {
      id: string;
      name: string;
      slug: string;
      address: string;
      district: string;
      subway: string;
      subwayDistance: string;
      builder: string;
    };
    building: {
      id: string;
      name: string;
      deadline: string;
    };
  };
}
```

#### 5. **GET /api/v1/complexes/:slug/layouts**

**Назначение:** Получить группы планировок

**Response:**
```typescript
{
  data: LayoutGroup[];
}
```

#### 6. **GET /api/v1/map/complexes**

**Назначение:** Получить комплексы для карты (с координатами)

**Query параметры:**
```typescript
{
  bounds?: {                     // Границы карты
    north: number;
    south: number;
    east: number;
    west: number;
  };
  filters?: CatalogFilters;      // Те же фильтры, что в каталоге
}
```

**Response:**
```typescript
{
  data: Array<{
    id: string;
    slug: string;
    name: string;
    coords: [number, number];
    images: string[];
    priceFrom: number;
    district: string;
    subway: string;
    builder: string;
  }>;
}
```

### Референсные endpoints

#### 7. **GET /api/v1/references/districts**

**Response:**
```typescript
{
  data: Array<{
    id: string;
    name: string;
  }>;
}
```

#### 8. **GET /api/v1/references/subways**

**Response:**
```typescript
{
  data: Array<{
    id: string;
    name: string;
    line: string;                // Линия метро
  }>;
}
```

#### 9. **GET /api/v1/references/builders**

**Response:**
```typescript
{
  data: Array<{
    id: string;
    name: string;
  }>;
}
```

#### 10. **GET /api/v1/references/finishings**

**Response:**
```typescript
{
  data: Array<{
    value: string;
    label: string;
  }>;
}
```

### Структура ответов

#### ResidentialComplex (полная)
```typescript
{
  id: string;                    // UUID
  slug: string;
  name: string;
  description: string;
  builder: {
    id: string;
    name: string;
  };
  district: {
    id: string;
    name: string;
  };
  subway: {
    id: string;
    name: string;
    line: string;
  };
  subwayDistance: string;         // "7 мин"
  address: string;
  deadline: string;                // "2025 Q4"
  status: 'building' | 'completed' | 'planned';
  priceFrom: number;
  priceTo: number;
  images: string[];                // Массив URL
  coords: {
    lat: number;
    lng: number;
  };
  advantages: string[];
  infrastructure: string[];
  buildings: Building[];
}
```

#### Building (полная)
```typescript
{
  id: string;                     // UUID
  complexId: string;
  name: string;                   // "Корпус 1"
  floors: number;
  sections: number;
  deadline: string;
  apartments: Apartment[];        // Только available/reserved
}
```

#### Apartment (полная)
```typescript
{
  id: string;                     // UUID
  complexId: string;
  buildingId: string;
  rooms: number;                  // 0 = студия
  area: number;                   // м²
  kitchenArea: number;            // м²
  floor: number;
  totalFloors: number;
  price: number;                  // руб
  pricePerMeter: number;          // руб/м² (вычисляется)
  finishing: string;
  status: 'available' | 'reserved' | 'sold';
  planImage: string;              // URL
  section: number;
}
```

---

## STEP 11 — PROBLEMS

### Hardcoded значения

1. **Регионы** (`RedesignIndex.tsx`)
   - Массив `regions` захардкожен в компоненте
   - **Решение:** Загружать из API `/api/v1/references/regions`

2. **Быстрые фильтры** (`RedesignIndex.tsx`)
   - Массив `quickFilters` с пустыми `search` значениями
   - **Решение:** Реализовать логику быстрых фильтров

3. **Категории** (`CategoryTiles.tsx`)
   - Массив `categories` захардкожен
   - **Решение:** Загружать из API или конфига

4. **Горячие предложения** (`PropertyGridSection.tsx`)
   - Массив `hotDeals` захардкожен
   - **Решение:** API endpoint `/api/v1/complexes/featured?type=hot`

5. **Старт продаж** (`PropertyGridSection.tsx`)
   - Массив `startSales` захардкожен
   - **Решение:** API endpoint `/api/v1/complexes/featured?type=start`

6. **Телефон** (`RedesignHeader.tsx`)
   - `+7 (904) 539-34-34` захардкожен
   - **Решение:** Конфиг или API

### Дублированная логика

1. **Фильтрация комплексов**
   - Дублируется в `RedesignCatalog.tsx` и `RedesignMap.tsx`
   - **Решение:** Вынести в хук `useComplexFilters()`

2. **Форматирование цены**
   - Функция `formatPrice()` используется везде
   - **Решение:** Уже вынесена в `mock-data.ts`, но можно в `lib/utils.ts`

3. **Логика поиска**
   - Дублируется в `RedesignHeader.tsx` и `RedesignCatalog.tsx`
   - **Решение:** Вынести в хук `useSearch()`

### Отсутствующие абстракции

1. **Нет хука для работы с API**
   - Все данные берутся из mock
   - **Решение:** Создать `useComplexes()`, `useApartment()`, `useFilters()`

2. **Нет единого store для фильтров**
   - Фильтры хранятся в локальном state каждого компонента
   - **Решение:** Zustand store для фильтров

3. **Нет обработки ошибок**
   - Нет error boundaries
   - **Решение:** Добавить error handling

4. **Нет loading states**
   - Только в lazy loading компонентов
   - **Решение:** Skeleton loaders для данных

5. **Нет пагинации**
   - Все данные загружаются сразу
   - **Решение:** Infinite scroll или пагинация

### Проблемы с данными

1. **Фильтры по площади/этажу не работают в каталоге**
   - В каталоге фильтруются комплексы, а не квартиры
   - Фильтры `areaMin/Max` и `floorMin/Max` не применяются
   - **Решение:** Backend должен фильтровать комплексы по наличию квартир с такими параметрами

2. **Нет агрегации данных**
   - `totalAvailableApartments` вычисляется на frontend
   - **Решение:** Backend должен возвращать агрегаты

3. **Нет кэширования**
   - Каждый раз данные загружаются заново
   - **Решение:** React Query с кэшированием

---

## STEP 12 — FINAL OUTPUT

### Структура данных для backend

#### Минимальный набор полей для каталога

```typescript
interface ComplexListItem {
  id: string;
  slug: string;
  name: string;
  images: string[];               // Минимум 1 изображение
  priceFrom: number;
  priceTo: number;
  district: { id: string; name: string };
  subway: { id: string; name: string; line: string };
  subwayDistance: string;
  builder: { id: string; name: string };
  status: 'building' | 'completed' | 'planned';
  deadline: string;
  coords: { lat: number; lng: number };
  totalAvailableApartments: number; // Агрегат
}
```

#### Полный набор полей для страницы комплекса

```typescript
interface ComplexDetail extends ComplexListItem {
  description: string;
  address: string;
  advantages: string[];
  infrastructure: string[];
  buildings: Building[];
}
```

#### Минимальный набор полей для квартиры

```typescript
interface ApartmentListItem {
  id: string;
  rooms: number;
  area: number;
  kitchenArea: number;
  floor: number;
  totalFloors: number;
  price: number;
  pricePerMeter: number;
  finishing: string;
  status: 'available' | 'reserved' | 'sold';
  section: number;
}
```

#### Полный набор полей для страницы квартиры

```typescript
interface ApartmentDetail extends ApartmentListItem {
  planImage: string;              // ОБЯЗАТЕЛЬНО
  complex: {
    id: string;
    name: string;
    slug: string;
    address: string;
    district: string;
    subway: string;
    subwayDistance: string;
    builder: string;
  };
  building: {
    id: string;
    name: string;
    deadline: string;
  };
}
```

### Критические API endpoints

1. **GET /api/v1/search/complexes** — Поиск комплексов (основной)
2. **GET /api/v1/complexes/:slug** — Детали комплекса
3. **GET /api/v1/complexes/:slug/apartments** — Квартиры комплекса
4. **GET /api/v1/apartments/:id** — Детали квартиры
5. **GET /api/v1/map/complexes** — Комплексы для карты
6. **GET /api/v1/references/districts** — Справочник районов
7. **GET /api/v1/references/subways** — Справочник метро
8. **GET /api/v1/references/builders** — Справочник застройщиков

### Рекомендации для backend

1. **Денормализация**
   - В `complexes` включить `district.name`, `subway.name`, `builder.name`
   - Избегать N+1 запросов

2. **Агрегаты**
   - Возвращать `totalAvailableApartments` в списке комплексов
   - Возвращать `priceFrom`/`priceTo` как агрегаты из квартир

3. **Индексы**
   - `complexes.district_id`, `complexes.subway_id`, `complexes.builder_id`
   - `apartments.complex_id`, `apartments.building_id`
   - `apartments.price`, `apartments.area`, `apartments.rooms`
   - Spatial index на `complexes.coords`

4. **Пагинация**
   - Поддержка `page` и `perPage`
   - Возвращать `meta.total`, `meta.lastPage`

5. **Фильтрация по квартирам в каталоге**
   - Если фильтр по `areaMin/Max` или `floorMin/Max`, фильтровать комплексы по наличию квартир с такими параметрами
   - Использовать `EXISTS` или `JOIN` с подзапросом

6. **Facets (опционально)**
   - Возвращать количество комплексов для каждого значения фильтра
   - Позволит показать "Район X (12)" в фильтрах

### Проблемы для исправления

1. ✅ **Hardcoded регионы** → API endpoint
2. ✅ **Hardcoded категории** → API endpoint или конфиг
3. ✅ **Дублированная логика фильтрации** → Хук `useComplexFilters()`
4. ✅ **Нет API интеграции** → React Query hooks
5. ✅ **Нет пагинации** → Infinite scroll или пагинация
6. ✅ **Фильтры по площади/этажу не работают** → Backend должен фильтровать правильно

---

## ЗАКЛЮЧЕНИЕ

Frontend-шаблон использует **redesign архитектуру** с компонентами в `frontend/src/redesign/`. Все данные сейчас берутся из mock (`mock-data.ts`). Для интеграции с backend необходимо:

1. Создать API hooks (React Query)
2. Заменить mock данные на реальные API вызовы
3. Реализовать пагинацию
4. Добавить error handling и loading states
5. Вынести дублированную логику в хуки
6. Заменить hardcoded значения на API endpoints

**Критический endpoint:** `GET /api/v1/search/complexes` — основной для каталога.

**Структура данных:** Backend должен возвращать денормализованные данные с вложенными объектами (district, subway, builder) для избежания N+1 запросов.
