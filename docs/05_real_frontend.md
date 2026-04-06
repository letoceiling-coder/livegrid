# 05 — Реальный Frontend

> Источник: `frontend/src/`. Дата аудита: 2026-03-25.

## Архитектура

```
React + TypeScript + Vite
├── Routing: react-router-dom (BrowserRouter, SPA)
├── State: TanStack React Query (QueryClient)
├── UI: Tailwind CSS + shadcn/ui
├── Map: Yandex Maps API 2.1
└── Build: Vite → public/build/
```

## Страницы (активные маршруты)

### Публичный раздел (`redesign/pages/`)

| Страница | Маршрут | Файл | API |
|---|---|---|---|
| Главная | `/` | `RedesignIndex.tsx` | `GET /api/v1/search/complexes` (через useBlocks) |
| Каталог | `/catalog` | `RedesignCatalog.tsx` | `GET /api/v1/search/complexes` (через useBlocks + useFilters) |
| Карта | `/map` | `RedesignMap.tsx` | `GET /api/v1/map/complexes` (через useMapComplexes) |
| Комплекс | `/complex/:slug` | `RedesignComplex.tsx` | `GET /api/v1/complexes/{slug}` (через useComplex) |
| Квартира | `/apartment/:id` | `RedesignApartment.tsx` | `GET /api/v1/apartments/{id}` (через useApartment) |
| Планировки | `/layouts/:complex` | `RedesignLayouts.tsx` | `GET /api/v1/complexes/{slug}/apartments` |

### CRM раздел (`crm/pages/`)

| Страница | Маршрут | Описание |
|---|---|---|
| Логин | `/crm/login` | Авторизация (Sanctum token) |
| Дашборд | `/crm` | Статистика, последние комплексы |
| Список комплексов | `/crm/complexes` | Фильтры: search, builder, district, status |
| Форма комплекса | `/crm/complexes/new` и `/:id/edit` | Создание/редактирование |
| Список квартир | `/crm/apartments` | Фильтры: complex_id, rooms, status, source |
| Форма квартиры | `/crm/apartments/new` и `/:id/edit` | Создание/редактирование |
| Атрибуты | `/crm/attributes` | Управление динамическими атрибутами (UI есть, данных нет) |
| Фид | `/crm/feed` | Запуск download/sync |
| Настройки | `/crm/settings` | |

### Устаревший раздел (`pages/`) — `/old/*`

12 старых страниц (Index, Catalog, CatalogZhk, ZhkDetail, ObjectDetail, News, NewsDetail, Login, Register, ForgotPassword, ResetPassword, NotFound). Доступны только через `/old/`, **не используются в production**.

### Admin раздел (`admin/`) — `/admin/*`

Отдельная CMS-система (AdminDashboard, AdminPages, AdminPageEditor, AdminMedia, AdminUsers, AdminSettings, AdminTokens, EditorPage). **Не связана с каталогом недвижимости.**

---

## Ключевые хуки

| Хук | Файл | API | Описание |
|---|---|---|---|
| `useBlocks` | `hooks/useBlocks.ts` | `/api/v1/search/complexes` | Каталог комплексов + фильтры + пагинация |
| `useMapComplexes` | `hooks/useMapComplexes.ts` | `/api/v1/map/complexes` | Карта: bounds + filters, AbortController |
| `useComplex` | `hooks/useComplex.ts` | `/api/v1/complexes/{slug}` | Детальная страница |
| `useApartment` | `hooks/useApartment.ts` | `/api/v1/apartments/{id}` | Квартира |
| `useFilters` | `hooks/useFilters.ts` | `/api/v1/filters` | Справочники для sidebar |
| `useMapObjects` | `hooks/useMapObjects.ts` | - | Управление маркерами Yandex Maps |

---

## Типы данных (`redesign/data/types.ts`)

```typescript
// Внутренняя модель (из useBlocks / useMapObjects)
interface Complex {
  id, slug, name, lat, lng, price_from, price_to, district, subway,
  subway_distance, address, builder, status, deadline, description,
  image, images, advantages, infrastructure, total_available_apartments,
  buildings, roomsBreakdown
}

// UI-компоненты используют ResidentialComplex
interface ResidentialComplex {
  id, slug, name, description, builder, district, subway, subwayDistance,
  address, deadline, status, priceFrom, priceTo, availableApartments,
  images, coords, advantages, infrastructure, buildings
}

interface Building { id, complexId, name, floors, sections, deadline, apartments }
interface Apartment { id, complexId, buildingId, rooms, roomCategory, roomName,
  area, kitchenArea, floor, totalFloors, price, pricePerMeter, finishing, status,
  planImage, section }
interface LayoutGroup { id, complexId, apartmentId, rooms, area, priceFrom,
  planImage, availableCount }

interface CatalogFilters {
  priceMin, priceMax, rooms[], areaMin, areaMax, district[], subway[],
  builder[], finishing[], deadline[], floorMin, floorMax, status[], search
}
```

---

## Маперы (`redesign/data/mappers.ts`)

Правило: сырые API-формы никогда не передаются в UI напрямую. Всё проходит через маперы.

```typescript
mapSearchComplexToModel(ApiSearchComplex) → Complex
  // /search/complexes: coords = {lat, lng}, вложенные объекты (district, subway, builder)

mapMapComplexToModel(ApiMapComplex) → Complex
  // /map/complexes: coords = [lat, lng], flat strings
```

---

## Компоненты

| Компонент | Назначение |
|---|---|
| `RedesignHeader` | Шапка + поиск с саджестом (debounce 300ms, SuggestController) |
| `FilterSidebar` | Боковая панель фильтров каталога |
| `ComplexCard` | Карточка комплекса в каталоге |
| `ComplexHero` | Шапка страницы комплекса |
| `MapSearch` | Компонент поиска на карте |
| `Chessboard` | Шахматка (floor × section) |
| `LayoutGrid` | Сетка планировок |
| `ApartmentTable` | Таблица квартир |

---

## Критические факты о frontend

### Мок-данные
- `frontend/src/redesign/data/mock-data.ts` существует, но используется только для утилиты `formatPrice`. Каталог данных тянет из реального API.
- Старые страницы (`pages/`) могут использовать моки — они не используются в production.

### Состояние реальных данных vs mock
- `RedesignIndex.tsx`: использует `useBlocks` → реальный API
- `RedesignCatalog.tsx`: использует `useBlocks + useFilters` → реальный API
- `RedesignMap.tsx`: использует `useMapComplexes` → реальный API
- `RedesignComplex.tsx`: использует `useComplex` → реальный API
- `RedesignApartment.tsx`: использует `useApartment` → реальный API

### URL params для поиска
`RedesignCatalog.tsx` читает `?search=` из URL params → начальное значение фильтра. Это позволяет `RedesignHeader` передавать поисковый запрос через навигацию.

### Карта и фильтры
`useMapComplexes` реализует:
- AbortController для предотвращения гонок
- "tick" counter для дедупликации
- Прямое чтение bounds из Yandex Maps instance
- Единый источник данных (нет дублирующих fetch)
