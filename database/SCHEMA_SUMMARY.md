# Production Database Schema Summary

## Migration Order

1. **sources** - Data source tracking
2. **Reference Tables** (no timestamps, string PKs):
   - builders
   - regions (note: districts table also exists - may need consolidation)
   - subways
   - finishings
   - building_types
   - rooms
3. **blocks** - Real estate blocks/projects
4. **buildings** - Buildings within blocks
5. **apartments** - Core apartment data
6. **block_subway** - Pivot table for block-subway relationships
7. **attributes** - Dynamic attribute definitions
8. **apartment_attributes** - EAV pattern for apartment attributes

## Table Structures

### sources
- `id` (bigint, PK)
- `code` (string, unique) - e.g., 'feed', 'admin', 'parser_x'
- `name` (string)
- `created_at`, `updated_at`

### builders (Reference)
- `id` (string, PK)
- `name` (string, indexed)
- NO timestamps

### regions (Reference)
- `id` (string, PK)
- `name` (string, indexed)
- NO timestamps

### subways (Reference)
- `id` (string, PK)
- `name` (string, indexed)
- NO timestamps

### finishings (Reference)
- `id` (string, PK)
- `name` (string)
- NO timestamps

### building_types (Reference)
- `id` (string, PK)
- `name` (string)
- NO timestamps

### rooms (Reference)
- `id` (string, PK)
- `name` (string)
- NO timestamps

### blocks
- `id` (string, PK)
- `name` (string)
- `district_id` (string, nullable, FK → regions.id)
- `lat` (decimal 10,7)
- `lng` (decimal 10,7)
- `created_at` (timestamp, nullable)
- NO updated_at

### buildings
- `id` (string, PK)
- `block_id` (string, FK → blocks.id, cascade)
- `building_type_id` (string, nullable, FK → building_types.id, nullOnDelete)
- `name` (string)
- `deadline` (date, nullable)
- `created_at` (timestamp, nullable)
- NO updated_at

### apartments (CORE)
- `id` (string, PK)
- `source_id` (bigint, FK → sources.id, cascade)
- `building_id` (string, FK → buildings.id, cascade)
- `block_id` (string, FK → blocks.id, cascade)
- `builder_id` (string, nullable, FK → builders.id, nullOnDelete)
- `price` (unsignedBigInteger, indexed)
- `rooms_count` (integer, indexed)
- `floor` (integer)
- `floors` (integer)
- `area_total` (decimal 10,2)
- `area_kitchen` (decimal 10,2, nullable)
- `area_rooms_total` (decimal 10,2, nullable)
- `area_balconies` (decimal 10,2, nullable)
- `lat` (decimal 10,7, nullable)
- `lng` (decimal 10,7, nullable)
- `is_active` (boolean, default true)
- `last_seen_at` (timestamp, nullable)
- `block_name` (string) - denormalized
- `builder_name` (string) - denormalized
- `district_name` (string) - denormalized
- `created_at`, `updated_at`

**Indexes:**
- price
- rooms_count
- building_id

### block_subway (Pivot)
- `block_id` (string, PK, FK → blocks.id, cascade)
- `subway_id` (string, PK, FK → subways.id, cascade)
- `distance_time` (integer)
- `distance_type` (tinyInteger)
- Composite primary key: [block_id, subway_id]
- NO timestamps

### attributes
- `id` (bigint, PK)
- `code` (string, unique) - e.g., 'wc_count', 'height', 'mortgage'
- `name` (string)
- `type` (string) - 'int', 'float', 'string', 'bool', 'json'
- `created_at`, `updated_at`

### apartment_attributes (EAV)
- `id` (bigint, PK)
- `apartment_id` (string, FK → apartments.id, cascade)
- `attribute_id` (bigint, FK → attributes.id, cascade)
- `value_int` (bigInteger, nullable)
- `value_float` (decimal 10,2, nullable)
- `value_string` (string, nullable)
- `value_bool` (boolean, nullable)
- `value_json` (json, nullable)
- `created_at`, `updated_at`

**Indexes:**
- attribute_id
- apartment_id

## Key Features

1. **String Primary Keys** - All feed-sourced tables use string IDs from feed data
2. **Source Tracking** - Every apartment tracks its source (feed, admin, parser)
3. **Denormalized Fields** - block_name, builder_name, district_name for frontend performance
4. **EAV Pattern** - Dynamic attributes system for flexible data storage
5. **Proper Foreign Keys** - All relationships enforced with cascade/nullOnDelete as appropriate
6. **No Timestamps on References** - Reference tables don't track timestamps (static data)

## Migration Files

- `2026_03_17_143244_create_sources_table.php`
- `2026_03_17_104425_create_builders_table.php`
- `2026_03_17_143250_create_regions_table.php`
- `2026_03_17_104434_create_subways_table.php`
- `2026_03_17_104439_create_finishings_table.php`
- `2026_03_17_104444_create_building_types_table.php`
- `2026_03_17_104449_create_room_types_table.php` (creates 'rooms' table)
- `2026_03_17_143254_create_blocks_table.php`
- `2026_03_17_104500_create_buildings_table.php`
- `2026_03_17_104505_create_apartments_table.php`
- `2026_03_17_143437_create_block_subway_table.php`
- `2026_03_17_143259_create_attributes_table.php`
- `2026_03_17_143304_create_apartment_attributes_table.php`

## Notes

- The `districts` table migration still exists but is separate from `regions`. Consider consolidating or using one naming convention.
- All string PK tables are designed to accept feed IDs directly without conversion.
- The attributes system allows for dynamic fields without schema changes.
