<?php

namespace App\Services\Entity;

use App\Services\Entity\Dto\FilterInput;
use App\Services\Entity\Dto\SortInput;

/**
 * Converts raw HTTP query params into typed filter/sort objects.
 *
 * Convention:
 *   {code}         → eq   (exact match)
 *   {code}_min     → gte  (range start, inclusive)
 *   {code}_max     → lte  (range end, inclusive)
 *   {code}[]       → in   (multi-select array)
 *   search=...     → reserved — handled separately as text search
 *   sort=...       → SortInput field code
 *   sort_dir=...   → SortInput direction ('asc' | 'desc')
 *   per_page, page → pagination — not filters
 *
 * Example URL:
 *   ?price_min=5000000&price_max=10000000&rooms[]=1&rooms[]=2&sort=price&sort_dir=asc
 *
 * Results in:
 *   FilterInput('price', 'gte', 5000000)
 *   FilterInput('price', 'lte', 10000000)
 *   FilterInput('rooms', 'in', [1, 2])
 *   SortInput('price', 'asc')
 */
class FilterParser
{
    /**
     * Params consumed by pagination/sort/search/cursor — never field filters.
     *
     * @var list<string>
     */
    public const RESERVED_PARAM_KEYS = ['per_page', 'page', 'sort', 'sort_dir', 'search', 'cursor', 'deleted'];

    /**
     * Parse request params into an array of FilterInput.
     *
     * @param  array<string, mixed>  $params  Raw request query array.
     * @return FilterInput[]
     */
    public function parseFilters(array $params): array
    {
        $filters = [];

        foreach ($params as $key => $value) {
            if (in_array($key, self::RESERVED_PARAM_KEYS, true)) {
                continue;
            }

            if (str_ends_with($key, '_min')) {
                $code = substr($key, 0, -4);
                $cast = $this->scalarOrNull($value);
                if ($cast !== null) {
                    $filters[] = new FilterInput($code, FilterInput::OP_GTE, $cast);
                }
                continue;
            }

            if (str_ends_with($key, '_max')) {
                $code = substr($key, 0, -4);
                $cast = $this->scalarOrNull($value);
                if ($cast !== null) {
                    $filters[] = new FilterInput($code, FilterInput::OP_LTE, $cast);
                }
                continue;
            }

            if (is_array($value)) {
                $clean = array_values(
                    array_filter($value, fn($v) => $v !== null && $v !== '')
                );
                if (!empty($clean)) {
                    $filters[] = new FilterInput($key, FilterInput::OP_IN, $clean);
                }
                continue;
            }

            $cast = $this->scalarOrNull($value);
            if ($cast !== null) {
                $filters[] = new FilterInput($key, FilterInput::OP_EQ, $cast);
            }
        }

        return $filters;
    }

    /**
     * Extract a SortInput from request params, or null if not requested.
     *
     * @param  array<string, mixed>  $params
     */
    public function parseSort(array $params): ?SortInput
    {
        $field = trim((string) ($params['sort'] ?? ''));
        if ($field === '') {
            return null;
        }

        $rawDir = strtolower(trim((string) ($params['sort_dir'] ?? 'asc')));
        $dir    = in_array($rawDir, [SortInput::DIR_ASC, SortInput::DIR_DESC], true)
            ? $rawDir
            : SortInput::DIR_ASC;

        return new SortInput($field, $dir);
    }

    /** Return a non-empty scalar or null. */
    private function scalarOrNull(mixed $value): int|float|string|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return str_contains((string) $value, '.') ? (float) $value : (int) $value;
        }

        return (string) $value;
    }
}
