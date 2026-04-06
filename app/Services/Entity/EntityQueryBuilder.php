<?php

namespace App\Services\Entity;

use App\Models\Entity\EntityField;
use App\Models\Entity\EntityRecord;
use App\Services\Entity\Dto\CursorInput;
use App\Services\Entity\Dto\FilterInput;
use App\Services\Entity\Dto\SortInput;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Builds an optimised Eloquent query for EntityRecord.
 *
 * ── Filter routing ────────────────────────────────────────────────────────────
 *
 * Filters on "fast fields" (price, rooms, area) are routed to
 * entity_fast_fields (the denormalized hot table).  All other filters
 * use a JOIN per field on entity_values.
 *
 * BEFORE (3 fast-field filters = 3 entity_values JOINs, 3 index lookups/row):
 *
 *   INNER JOIN entity_values ev0 ON ev0.entity_record_id = er.id AND ev0.entity_field_id = {price}
 *   INNER JOIN entity_values ev1 ON ev1.entity_record_id = er.id AND ev1.entity_field_id = {rooms}
 *   INNER JOIN entity_values ev2 ON ev2.entity_record_id = er.id AND ev2.entity_field_id = {area}
 *   WHERE ev0.value_integer BETWEEN 5M AND 15M
 *     AND ev1.value_integer IN (1, 2)
 *     AND ev2.value_float >= 40
 *
 * AFTER (1 JOIN to entity_fast_fields, covering index scan):
 *
 *   INNER JOIN entity_fast_fields eff ON eff.record_id = entity_records.id
 *   WHERE eff.entity_type_id = ?        ← enables composite index access path
 *     AND eff.price BETWEEN 5M AND 15M  ← (entity_type_id, price) index
 *     AND eff.rooms IN (1, 2)           ← (entity_type_id, rooms) index
 *     AND eff.area >= 40                ← (entity_type_id, area)  index
 *
 * MySQL's optimizer picks the most selective composite index as the driving
 * access path, then eq_ref-joins entity_records by PK.
 *
 * ── Sort routing ──────────────────────────────────────────────────────────────
 *
 * Sort on a fast field reuses the existing 'eff' JOIN (if already added for
 * a filter).  If no filter has joined eff yet, a LEFT JOIN is added.
 *
 * ── Cursor pagination ─────────────────────────────────────────────────────────
 *
 * The cursor WHERE condition is injected inside applySort() because it
 * requires the resolved sort column alias.
 *
 * ── Text search ───────────────────────────────────────────────────────────────
 *
 * ?search= invokes INNER JOIN entity_search_index + MATCH(searchable_text)
 * AGAINST (? IN NATURAL LANGUAGE MODE).  Rows are populated by
 * entity:sync-search and EntitySearchIndexWriter (create/update).
 */
class EntityQueryBuilder
{
    /**
     * @param  Collection<string, EntityField>  $fields  Type fields keyed by code.
     * @param  FilterInput[]                    $filters
     */
    /**
     * @param  'active'|'only'|'with'  $deletedScope  active=default, only=trashed only, with=all
     */
    public function build(
        int          $entityTypeId,
        Collection   $fields,
        array        $filters,
        ?string      $search,
        ?SortInput   $sort,
        ?CursorInput $cursor = null,
        bool         $forceLikeSearch = false,
        string       $deletedScope = 'active',
    ): Builder {
        $base = $deletedScope === 'with'
            ? EntityRecord::query()->withTrashed()
            : EntityRecord::query();

        $query = $base
            ->select('entity_records.*')
            ->where('entity_records.entity_type_id', $entityTypeId);

        if ($deletedScope === 'active') {
            $query->whereNull('entity_records.deleted_at');
        } elseif ($deletedScope === 'only') {
            $query->whereNotNull('entity_records.deleted_at');
        }

        [$filterAliases, $fastJoined] = $this->applyFilterJoins(
            $query, $fields, $filters, $entityTypeId
        );

        $this->applySearch($query, $search, $forceLikeSearch);
        $this->applySort($query, $fields, $sort, $filterAliases, $fastJoined, $cursor);

        return $query;
    }

    // ─── Filter JOINs ────────────────────────────────────────────────────────

    /**
     * Routes each filter to entity_fast_fields (fast fields) or a per-field
     * JOIN on entity_values (regular fields).
     *
     * Returns:
     *   [0] array<fieldCode, alias>  — for reuse by sort step.
     *   [1] bool $fastJoined         — whether entity_fast_fields was joined.
     *
     * @param  Collection<string, EntityField>  $fields
     * @param  FilterInput[]  $filters
     * @return array{array<string,string>, bool}
     */
    private function applyFilterJoins(
        Builder    $query,
        Collection $fields,
        array      $filters,
        int        $entityTypeId,
    ): array {
        // Bucket filters into known-field fast vs. regular.
        $fastByCode    = [];
        $regularByCode = [];

        foreach ($filters as $filter) {
            if (!$fields->has($filter->fieldCode)) {
                continue; // unknown field — skip silently
            }

            if (FastFieldMap::isFast($filter->fieldCode)) {
                $fastByCode[$filter->fieldCode][] = $filter;
            } else {
                $regularByCode[$filter->fieldCode][] = $filter;
            }
        }

        $aliases    = [];
        $fastJoined = false;

        // ── Fast fields → single JOIN on entity_fast_fields ──────────────────
        if (!empty($fastByCode)) {
            $query->join('entity_fast_fields as eff', 'eff.record_id', '=', 'entity_records.id');

            // Adding eff.entity_type_id = ? lets the optimizer use the
            // composite (entity_type_id, price/rooms/area) indexes as the
            // primary access path instead of scanning all of entity_fast_fields.
            $query->where('eff.entity_type_id', '=', $entityTypeId);

            $fastJoined = true;

            foreach ($fastByCode as $fieldCode => $fieldFilters) {
                $col = 'eff.' . FastFieldMap::column($fieldCode);

                foreach ($fieldFilters as $filter) {
                    $this->applyWhereClause($query, $col, $filter);
                }

                // Record alias 'eff' so applySort can reuse this JOIN.
                $aliases[$fieldCode] = 'eff';
            }
        }

        // ── Regular fields → one entity_values JOIN per field ────────────────
        $i = 0;
        foreach ($regularByCode as $fieldCode => $fieldFilters) {
            /** @var EntityField $field */
            $field    = $fields->get($fieldCode);
            $alias    = "ev_f{$i}";
            $valueCol = "{$alias}.{$field->valueColumn()}";

            $query->join(
                "entity_values as {$alias}",
                fn($join) => $join
                    ->on("{$alias}.entity_record_id", '=', 'entity_records.id')
                    ->where("{$alias}.entity_field_id", '=', $field->id)
            );

            foreach ($fieldFilters as $filter) {
                $this->applyWhereClause($query, $valueCol, $filter);
            }

            $aliases[$fieldCode] = $alias;
            $i++;
        }

        return [$aliases, $fastJoined];
    }

    private function applyWhereClause(Builder $query, string $col, FilterInput $filter): void
    {
        match ($filter->operator) {
            FilterInput::OP_GTE  => $query->where($col, '>=', $filter->value),
            FilterInput::OP_LTE  => $query->where($col, '<=', $filter->value),
            FilterInput::OP_IN   => $query->whereIn($col, (array) $filter->value),
            FilterInput::OP_LIKE => $query->where($col, 'LIKE', "%{$filter->value}%"),
            default              => $query->where($col, '=',    $filter->value),
        };
    }

    // ─── Text search ─────────────────────────────────────────────────────────

    private function applySearch(Builder $query, ?string $search, bool $forceLikeSearch): void
    {
        if ($search === null || $search === '') {
            return;
        }

        $term = trim($search);
        if ($term === '') {
            return;
        }

        $query->join('entity_search_index as esi', function ($join) {
            $join->on('esi.record_id', '=', 'entity_records.id')
                ->whereColumn('esi.entity_type_id', 'entity_records.entity_type_id');
        });

        if ($forceLikeSearch) {
            $query->where('esi.searchable_text', 'LIKE', '%' . $term . '%');
            return;
        }

        $boolean = $this->toBooleanFulltext($term);
        $query->whereRaw(
            'MATCH(esi.searchable_text) AGAINST (? IN BOOLEAN MODE)',
            [$boolean]
        );
    }

    /** Convert "тверская дом" → "+тверская* +дом*" for BOOLEAN MODE. */
    private function toBooleanFulltext(string $term): string
    {
        $chunks = preg_split('/\s+/u', trim($term)) ?: [];
        $tokens = [];

        foreach ($chunks as $c) {
            $t = trim((string) $c);
            if ($t === '') {
                continue;
            }

            // Keep letters/digits (incl. Cyrillic) and a few safe symbols.
            $t = preg_replace('/[^\p{L}\p{N}_-]+/u', '', $t) ?? '';
            if ($t === '') {
                continue;
            }

            $tokens[] = $t;
        }

        if (empty($tokens)) {
            return '';
        }

        return implode(' ', array_map(fn($t) => '+' . $t . '*', $tokens));
    }

    // ─── Sort + cursor ────────────────────────────────────────────────────────

    /**
     * Resolves the sort column and adds ORDER BY + cursor WHERE.
     *
     * Sort column resolution (in priority order):
     *   1. Fast field, already joined as 'eff'  → use eff.{col}      (0 extra JOINs)
     *   2. Fast field, not yet joined            → LEFT JOIN eff_sort  (1 extra JOIN)
     *   3. Regular field, already in aliases     → use existing alias  (0 extra JOINs)
     *   4. Regular field, not yet joined         → LEFT JOIN ev_sort   (1 extra JOIN)
     *   5. No sort                               → ORDER BY id DESC
     *
     * @param  Collection<string, EntityField>   $fields
     * @param  array<string, string>             $filterAliases
     */
    private function applySort(
        Builder      $query,
        Collection   $fields,
        ?SortInput   $sort,
        array        $filterAliases,
        bool         $fastJoined,
        ?CursorInput $cursor,
    ): void {
        if ($sort === null || !$fields->has($sort->fieldCode)) {
            $query->orderByDesc('entity_records.id');

            if ($cursor !== null) {
                $query->where('entity_records.id', '<', $cursor->lastId);
            }

            return;
        }

        $sortCol = $this->resolveSortColumn($query, $fields, $sort, $filterAliases, $fastJoined);

        // NULL-safe, stable ordering for cursor pagination:
        // (value IS NULL) ASC, value {dir}, id DESC
        $query->orderByRaw("({$sortCol} IS NULL) ASC")
              ->orderBy($sortCol, $sort->sqlDir())
              ->orderByDesc('entity_records.id');

        if ($cursor !== null) {
            $this->applyCursorCondition($query, $sortCol, $sort, $cursor);
        }
    }

    /**
     * Resolves (and if necessary, creates) the JOIN needed for ORDER BY.
     * Returns the fully-qualified column expression, e.g. "eff.price".
     */
    private function resolveSortColumn(
        Builder    $query,
        Collection $fields,
        SortInput  $sort,
        array      $filterAliases,
        bool       $fastJoined,
    ): string {
        $code = $sort->fieldCode;

        if (FastFieldMap::isFast($code)) {
            $fastCol = FastFieldMap::column($code);

            if ($fastJoined) {
                // entity_fast_fields is already INNER JOINed as 'eff' — reuse it.
                return "eff.{$fastCol}";
            }

            // Sort-only fast field: add LEFT JOIN so records without a fast
            // field value still appear (records with NULL sort last / first).
            $query->leftJoin(
                'entity_fast_fields as eff_sort',
                'eff_sort.record_id', '=', 'entity_records.id'
            );

            return "eff_sort.{$fastCol}";
        }

        // Regular field: check if filter already added a JOIN for this code.
        if (isset($filterAliases[$code])) {
            $field = $fields->get($code);
            return "{$filterAliases[$code]}.{$field->valueColumn()}";
        }

        // Sort-only regular field: LEFT JOIN entity_values.
        /** @var EntityField $field */
        $field = $fields->get($code);

        $query->leftJoin(
            'entity_values as ev_sort',
            fn($join) => $join
                ->on('ev_sort.entity_record_id', '=', 'entity_records.id')
                ->where('ev_sort.entity_field_id', '=', $field->id)
        );

        return "ev_sort.{$field->valueColumn()}";
    }

    /**
     * Injects the keyset WHERE clause that replaces OFFSET.
     *
     * For ASC sort on V, last id = I:
     *   AND ( (value > V) OR (value = V AND id < I) )
     *
     * For DESC sort on V, last id = I:
     *   AND ( (value < V) OR (value = V AND id < I) )
     *
     * When sortValue is null (id-only sort):
     *   AND id < I
     */
    private function applyCursorCondition(
        Builder     $query,
        string      $valueCol,
        SortInput   $sort,
        CursorInput $cursor,
    ): void {
        if ($cursor->sortValue === null) {
            $query->where('entity_records.id', '<', $cursor->lastId);
            return;
        }

        $ahead = $sort->isDesc() ? '<' : '>';
        $v     = $cursor->sortValue;
        $id    = $cursor->lastId;

        $query->where(function (Builder $q) use ($valueCol, $ahead, $v, $id) {
            $q->where($valueCol, $ahead, $v)
              ->orWhere(function (Builder $q2) use ($valueCol, $v, $id) {
                  $q2->where($valueCol, '=', $v)
                     ->where('entity_records.id', '<', $id);
              });
        });
    }
}
