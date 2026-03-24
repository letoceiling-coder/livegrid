# CRM Roadmap — LiveGrid

> Status: living document  
> Last updated: 2026-03-24

---

## Current State

| Entity | Table | API | CRM UI |
|--------|-------|-----|--------|
| Complex | `blocks` | ✅ | ✅ |
| Apartment | `apartments` | ✅ | ✅ |
| Builder | `builders` | ✅ | ✅ |
| District | `regions` | ✅ (read-only) | ✅ (read-only) |
| Subway | `subways` | ✅ (read-only) | ❌ |
| Finishing | `finishings` | ✅ (read-only) | ❌ |
| Building | `buildings` | partial | ❌ |

---

## Missing Fields

### Complex (`blocks` table)

| Field | Type | Priority | Notes |
|-------|------|----------|-------|
| `images` | `json` | HIGH | Stored but no upload UI |
| `logo` | `string` | HIGH | Builder logo / complex logo path |
| `advantages` | `json` | MEDIUM | Bullet list of selling points |
| `infrastructure` | `json` | MEDIUM | Nearby facilities |
| `video_url` | `string` | MEDIUM | YouTube / embed link |
| `presentation_url` | `string` | LOW | PDF link |
| `website_url` | `string` | LOW | Developer's site |
| `rooms_min` / `rooms_max` | `tinyint` | MEDIUM | Room count range |
| `price_from` / `price_to` | `bigint` | MEDIUM | Cached price range |
| `class` | `enum` | MEDIUM | comfort, business, premium, elite |
| `parking` | `json` | LOW | Underground, open, multi-storey |
| `is_published` | `bool` | HIGH | Frontend visibility toggle |

### Apartment (`apartments` table)

| Field | Type | Priority | Notes |
|-------|------|----------|-------|
| `plan_image` | `string` | HIGH | Layout image (formatImage applied) |
| `interior_images` | `json` | MEDIUM | Interior photos |
| `number` | `string` | MEDIUM | Apartment number in the building |
| `entrance` | `tinyint` | LOW | Staircase / entrance number |
| `decoration_level` | `string` | MEDIUM | More granular than finishing |
| `mortgage_payment` | `int` | LOW | Pre-calculated monthly payment |
| `discount` | `int` | LOW | Discount amount in RUB |
| `discount_pct` | `decimal` | LOW | Discount in % |
| `view` | `enum` | LOW | courtyard, street, park, water |
| `window_direction` | `string` | LOW | N/S/E/W |
| `ceiling_height` | `decimal` | LOW | meters |
| `balcony` | `bool` | LOW | Has balcony |
| `loggia` | `bool` | LOW | Has loggia |

### Builder (`builders` table)

| Field | Type | Priority | Notes |
|-------|------|----------|-------|
| `logo` | `string` | HIGH | Needs formatImage() |
| `description` | `text` | MEDIUM | About the developer |
| `website_url` | `string` | MEDIUM | Official site |
| `founded_year` | `year` | LOW | Founded in |
| `projects_count` | `int` | LOW | Completed projects |
| `rating` | `decimal(3,2)` | LOW | Aggregated rating |

---

## Reference Tables

### Currently implemented

| Table | CRUD API | Purpose |
|-------|----------|---------|
| `builders` | ✅ | Developer companies |
| `regions` | read-only | City districts (legacy name) |
| `subways` | ❌ | Metro stations |
| `finishings` | ❌ | Finishing type catalog |
| `buildings` | ❌ | Specific buildings within a complex |

### Missing reference tables

| Table | Priority | Notes |
|-------|----------|-------|
| `apartment_classes` | MEDIUM | comfort / business / premium / elite |
| `infrastructure_types` | LOW | Park, School, Clinic, … |
| `parking_types` | LOW | Underground, open-air, multi-storey |
| `decoration_levels` | MEDIUM | More granular finishing options |
| `document_types` | LOW | Contract, permit, guarantee |
| `mortgage_banks` | LOW | Partner banks |

### Geo hierarchy (new — see migration `2026_03_24_000001`)

| Table | Status | Notes |
|-------|--------|-------|
| `countries` | ✅ created | Russia seeded |
| `geo_regions` | ✅ created | Moscow seeded |
| `cities` | ✅ created | Moscow city seeded |
| `geo_districts` | ✅ created | Empty — migrate from `regions` |
| `regions` | existing | 181 Moscow districts — DO NOT DROP yet |

---

## Attribute System

Flexible key-value attributes for complexes and apartments  
(similar to WooCommerce product attributes).

### Proposed schema

```sql
-- Attribute definitions
CREATE TABLE attributes (
    id          CHAR(36)     PRIMARY KEY,
    entity_type ENUM('complex', 'apartment') NOT NULL,
    name        VARCHAR(100) NOT NULL,   -- e.g. "Класс жилья"
    slug        VARCHAR(100) UNIQUE NOT NULL,
    type        ENUM('string', 'integer', 'decimal', 'boolean', 'select', 'multi_select') DEFAULT 'string',
    unit        VARCHAR(20)  NULL,       -- "м²", "мин", "этаж"
    is_filterable BOOLEAN    DEFAULT FALSE,
    is_required   BOOLEAN    DEFAULT FALSE,
    sort_order  SMALLINT     DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Attribute option values (for select / multi_select types)
CREATE TABLE attribute_options (
    id           CHAR(36)    PRIMARY KEY,
    attribute_id CHAR(36)    NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    value        VARCHAR(150) NOT NULL,
    sort_order   SMALLINT    DEFAULT 0
);

-- Values assigned to complexes
CREATE TABLE complex_attributes (
    id           CHAR(36)    PRIMARY KEY,
    complex_id   CHAR(36)    NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    attribute_id CHAR(36)    NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    value        TEXT        NULL,       -- raw value (cast on read)
    option_id    CHAR(36)    NULL,       -- for select types
    UNIQUE KEY uq_complex_attr (complex_id, attribute_id)
);

-- Values assigned to apartments
CREATE TABLE apartment_attributes (
    id             CHAR(36)   PRIMARY KEY,
    apartment_id   CHAR(36)   NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    attribute_id   CHAR(36)   NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    value          TEXT       NULL,
    option_id      CHAR(36)   NULL,
    UNIQUE KEY uq_apartment_attr (apartment_id, attribute_id)
);
```

### Example attributes

| Slug | Name | Type | Filterable |
|------|------|------|-----------|
| `class` | Класс жилья | select | yes |
| `ceiling_height` | Высота потолков | decimal | yes |
| `window_view` | Вид из окна | multi_select | no |
| `balcony_type` | Балкон | select | yes |
| `parking` | Паркинг | multi_select | yes |
| `security_24h` | Охрана 24/7 | boolean | no |
| `concierge` | Консьерж | boolean | no |
| `smart_home` | Умный дом | boolean | no |

### API surface (future)

```
GET  /api/v1/crm/attributes              — list all definitions
POST /api/v1/crm/attributes              — create attribute
GET  /api/v1/crm/attributes/{id}/options — list options
POST /api/v1/crm/attributes/{id}/options — add option

POST /api/v1/crm/complexes/{id}/attributes   — set values
GET  /api/v1/crm/complexes/{id}/attributes   — get values

POST /api/v1/crm/apartments/{id}/attributes  — set values
GET  /api/v1/crm/apartments/{id}/attributes  — get values
```

---

## Image Upload System

Currently images are stored as raw paths in JSON columns.  
Needed:

| Feature | Priority |
|---------|----------|
| S3 / local storage upload endpoint | HIGH |
| Image resize/optimize on upload | MEDIUM |
| Reorder images (drag-and-drop) | MEDIUM |
| Cover image selection | HIGH |
| Delete image | HIGH |

### Proposed endpoint

```
POST /api/v1/crm/upload/image
  → { "url": "https://…/storage/complexes/abc123/main.jpg" }

DELETE /api/v1/crm/upload/image
  body: { "url": "…" }
```

`formatImage()` in `App\Support\FormatsImages` already handles URL normalization  
for both absolute URLs and storage-relative paths.

---

## Feed / Import System

| Feature | Status |
|---------|--------|
| XML feed import | ✅ |
| Manual field lock | ✅ |
| Idempotent import | ✅ |
| Async sync job | ✅ |
| Multiple feeds | ❌ |
| Feed schedule per source | ❌ |
| Feed diff preview | ❌ |
| Error report per complex | ❌ |

---

## Priority Order (next sprints)

1. **Image upload endpoint** — HIGH (blocks content management)
2. **Complex `is_published` field** — HIGH (prod visibility control)
3. **Builder logo + description** — HIGH
4. **Subway CRUD in CRM** — MEDIUM
5. **Attribute system (phase 1)** — MEDIUM (class, ceiling height)
6. **Geo migration: regions → geo_districts** — MEDIUM
7. **Finishing CRUD in CRM** — LOW
8. **Mortgage / bank references** — LOW
