<?php

namespace App\Services\Entity;

/**
 * Registry of entity field codes that have a dedicated column in
 * entity_fast_fields (the denormalized hot-path table).
 *
 * When a filter or sort targets one of these codes, EntityQueryBuilder
 * routes the condition to entity_fast_fields instead of joining
 * entity_values.  This collapses N entity_values JOINs into 1 JOIN for
 * all fast fields combined.
 *
 * To add a new fast field:
 *   1. Add it to COLUMNS below (code → column name).
 *   2. Add the column + index to entity_fast_fields via a new migration.
 *   3. Update FastFieldMap::cast() if the type is non-numeric.
 *   4. EntityService::createFastFields() and updateFastFields() pick it up
 *      automatically.
 */
final class FastFieldMap
{
    /**
     * Maps entity field code → entity_fast_fields column name.
     *
     * @var array<string, string>
     */
    public const COLUMNS = [
        'price' => 'price',
        'rooms' => 'rooms',
        'area'  => 'area',
    ];

    public static function isFast(string $fieldCode): bool
    {
        return isset(self::COLUMNS[$fieldCode]);
    }

    /** Returns the entity_fast_fields column for a field code, or null. */
    public static function column(string $fieldCode): ?string
    {
        return self::COLUMNS[$fieldCode] ?? null;
    }

    /**
     * Cast a raw input value to the correct PHP type for storage in the
     * entity_fast_fields column.
     */
    public static function cast(string $column, mixed $value): int|float|null
    {
        if ($value === null) {
            return null;
        }

        return match ($column) {
            'price', 'rooms' => (int)   $value,
            'area'            => (float) $value,
            default           => (int)   $value,
        };
    }

    /**
     * Returns all column names (not codes) as an array — useful for
     * building partial INSERT/UPDATE row arrays.
     *
     * @return string[]
     */
    public static function columnNames(): array
    {
        return array_values(self::COLUMNS);
    }
}
