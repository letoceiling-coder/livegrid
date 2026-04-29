<?php

namespace App\Services\Entity;

use App\Models\Entity\EntityChangeLog;
use App\Models\Entity\EntityField;
use App\Models\Entity\EntityRecord;
use App\Models\Entity\EntityType;
use App\Models\Entity\EntityValue;
use App\Services\Entity\Dto\CursorInput;
use App\Services\Entity\Dto\CursorPage;
use App\Services\Entity\Dto\FilterInput;
use App\Services\Entity\Dto\SortInput;
use App\Services\Entity\FastFieldMap;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class EntityService
{
    public function __construct(
        private readonly FilterParser            $filterParser,
        private readonly EntityQueryBuilder      $queryBuilder,
        private readonly EntitySearchIndexWriter $searchIndexWriter,
        private readonly EntityListCache         $listCache,
        private readonly EntityAuditLogger       $auditLogger,
    ) {}

    // ─── Schema ──────────────────────────────────────────────────────────────

    /**
     * Resolve an EntityType by its code string.
     *
     * @throws ModelNotFoundException
     */
    public function resolveType(string $code): EntityType
    {
        return EntityType::where('code', $code)
            ->where('is_active', true)
            ->firstOrFail();
    }

    /**
     * Return all fields for a type as a Support\Collection keyed by code.
     *
     * Uses the eager-loaded `fields` relation when present, otherwise queries.
     * Always returns a Support\Collection (NOT Eloquent\Collection) so that
     * ->has(), ->filter(), ->only() operate on collection keys, not model PKs.
     *
     * @return Collection<string, EntityField>
     */
    public function fieldsForType(EntityType $type): Collection
    {
        if ($type->relationLoaded('fields') && $type->fields->isNotEmpty()) {
            return collect($type->fields->all())->keyBy('code');
        }

        return collect(
            EntityField::where('entity_type_id', $type->id)
                ->orderBy('sort_order')
                ->get()
                ->all()
        )->keyBy('code');
    }

    // ─── Records ─────────────────────────────────────────────────────────────

    /**
     * Create a new record of the given entity type.
     *
     * @param  array<string, mixed>  $data  Field-code → raw value map.
     * @throws ValidationException
     */
    public function createRecord(string $typeCode, array $data, ?int $createdBy = null, ?int $teamId = null): EntityRecord
    {
        $type   = $this->resolveType($typeCode);
        $fields = $this->fieldsForType($type);

        $this->validateData($fields, $data);

        $typeCode = $type->code;

        $record = DB::transaction(function () use ($type, $fields, $data, $createdBy, $teamId, $typeCode): EntityRecord {
            $record = EntityRecord::create([
                'entity_type_id' => $type->id,
                'created_by'     => $createdBy,
                'owner_id'       => $createdBy,
                'team_id'        => $teamId,
            ]);

            $this->writeValues($record, $fields, $data);
            try {
                $this->createFastFields($record, $data);
            } catch (\Throwable $e) {
                Log::error('entity_fast_fields sync failed on create', [
                    'type' => $typeCode,
                    'record_id' => $record->id,
                    'error' => $e->getMessage(),
                ]);
            }

            try {
                $this->searchIndexWriter->rebuildForRecordId($record->id);
            } catch (\Throwable $e) {
                Log::error('entity_search_index sync failed on create', [
                    'type' => $typeCode,
                    'record_id' => $record->id,
                    'error' => $e->getMessage(),
                ]);
            }

            DB::afterCommit(fn () => $this->listCache->flushType($typeCode));

            return $record->load('values.field');
        });

        $this->auditLogger->write(
            $typeCode,
            $record->id,
            EntityChangeLog::ACTION_CREATED,
            ['values' => $this->snapshotValues($record)],
            $createdBy,
        );

        return $record;
    }

    /**
     * Update an existing record's field values.
     *
     * @param  array<string, mixed>  $data
     * @throws ModelNotFoundException|ValidationException
     */
    public function updateRecord(int $id, array $data, ?int $actorId = null): EntityRecord
    {
        $record = EntityRecord::with(['entityType.fields'])->findOrFail($id);
        $before = $this->snapshotValues($record);
        $fields = $this->fieldsForType($record->entityType);

        // Filter to only the fields present in $data.
        // Use ->filter() not ->only() — Eloquent\Collection::only() filters by
        // primary key, whereas we need to filter by collection key (field code).
        $incoming      = array_keys($data);
        $partialFields = $fields->filter(fn($f, $code) => in_array($code, $incoming, true));

        $this->validateData($partialFields, $data, partial: true);

        $typeCode = $record->entityType->code;

        DB::transaction(function () use ($record, $fields, $data, $typeCode): void {
            $this->writeValues($record, $fields, $data);
            try {
                $this->updateFastFields($record, $data);
            } catch (\Throwable $e) {
                Log::error('entity_fast_fields sync failed on update', [
                    'type' => $typeCode,
                    'record_id' => $record->id,
                    'error' => $e->getMessage(),
                ]);
            }

            try {
                $this->searchIndexWriter->rebuildForRecordId($record->id);
            } catch (\Throwable $e) {
                Log::error('entity_search_index sync failed on update', [
                    'type' => $typeCode,
                    'record_id' => $record->id,
                    'error' => $e->getMessage(),
                ]);
            }

            DB::afterCommit(fn () => $this->listCache->flushType($typeCode));
        });

        $record->refresh();
        $record->load('values.field');
        $after = $this->snapshotValues($record);
        $this->auditLogger->write(
            $typeCode,
            $record->id,
            EntityChangeLog::ACTION_UPDATED,
            [
                'before'  => $before,
                'after'   => $after,
                'changed' => $this->assocDiff($before, $after),
            ],
            $actorId,
        );

        return $record->load('values.field');
    }

    public function softDeleteRecord(int $id, ?int $actorId = null): void
    {
        $record = EntityRecord::with(['entityType', 'values.field'])->findOrFail($id);
        $typeCode = $record->entityType->code;
        $snapshot = $this->snapshotValues($record);
        $recordId   = $record->id;

        DB::transaction(function () use ($record, $typeCode): void {
            $record->delete();

            try {
                $this->searchIndexWriter->rebuildForRecordId($record->id);
            } catch (\Throwable $e) {
                Log::error('entity_search_index sync failed on delete', [
                    'record_id' => $record->id,
                    'error'     => $e->getMessage(),
                ]);
            }

            DB::afterCommit(fn () => $this->listCache->flushType($typeCode));
        });

        $this->auditLogger->write(
            $typeCode,
            $recordId,
            EntityChangeLog::ACTION_DELETED,
            ['before' => $snapshot],
            $actorId,
        );
    }

    public function restoreRecord(int $id, ?int $actorId = null): void
    {
        $record = EntityRecord::onlyTrashed()->with('entityType')->findOrFail($id);
        $typeCode = $record->entityType->code;
        $recordId = $record->id;

        DB::transaction(function () use ($record, $typeCode): void {
            $record->restore();

            try {
                $this->searchIndexWriter->rebuildForRecordId($record->id);
            } catch (\Throwable $e) {
                Log::error('entity_search_index sync failed on restore', [
                    'record_id' => $record->id,
                    'error'     => $e->getMessage(),
                ]);
            }

            DB::afterCommit(fn () => $this->listCache->flushType($typeCode));
        });

        $this->auditLogger->write(
            $typeCode,
            $recordId,
            EntityChangeLog::ACTION_RESTORED,
            ['record_id' => $recordId],
            $actorId,
        );
    }

    /**
     * @param  int[]  $ids
     */
    public function bulkSoftDelete(array $ids, ?int $actorId = null): void
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        foreach ($ids as $id) {
            if ($id > 0) {
                $this->softDeleteRecord($id, $actorId);
            }
        }
    }

    /**
     * @param  int[]                 $ids
     * @param  array<string, mixed>  $values
     */
    public function bulkUpdateRecords(array $ids, array $values, ?int $actorId = null): void
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if ($ids === []) {
            return;
        }

        $records = EntityRecord::with(['entityType.fields'])->whereIn('id', $ids)->get()->keyBy('id');

        foreach ($ids as $id) {
            if ($id <= 0) {
                continue;
            }
            if (! $records->has($id)) {
                throw (new ModelNotFoundException)->setModel(EntityRecord::class, [$id]);
            }
            $record  = $records->get($id);
            $fields  = $this->fieldsForType($record->entityType);
            $partial = $fields->filter(fn ($f, $code) => in_array($code, array_keys($values), true));
            $this->validateData($partial, $values, partial: true);
        }

        foreach ($ids as $id) {
            if ($id <= 0) {
                continue;
            }
            $this->updateRecord($id, $values, $actorId);
        }
    }

    /**
     * Retrieve a single record with all its field values resolved.
     *
     * @throws ModelNotFoundException
     * @return array<string, mixed>
     */
    public function getRecord(int $id): array
    {
        $record = EntityRecord::with(['entityType', 'values.field'])->findOrFail($id);

        return $this->formatRecord($record);
    }

    /**
     * List records for a type with full filter/sort/pagination support.
     *
     * Accepts raw HTTP query params (as returned by $request->all()).
     * FilterParser converts them into typed FilterInput / SortInput objects.
     * EntityQueryBuilder builds a JOIN-based SQL query (zero N+1).
     *
     * Supported param formats:
     *   ?{code}=value           → exact match (eq)
     *   ?{code}_min=value       → range start (gte)
     *   ?{code}_max=value       → range end   (lte)
     *   ?{code}[]=v1&{code}[]=v2 → IN filter
     *   ?search=text            → FULLTEXT on entity_search_index
     *   ?sort={code}            → sort by field
     *   ?sort_dir=asc|desc      → sort direction (default asc)
     *   ?per_page=N&page=N      → pagination
     *
     * List responses are cached for 60s (tag entity:{typeCode}); invalidated on
     * create/update and on soft-delete/restore of records of that type.
     *
     * @param  array<string, mixed>  $params  Raw request query params.
     */
    public function listRecords(
        string  $typeCode,
        array   $params  = [],
        int     $perPage = 20,
        int     $page    = 1,
        ?\App\Models\User $actor = null,
    ): LengthAwarePaginator {
        $hash = EntityListCache::hashOffsetList($params, $perPage, $page);

        $cached = $this->listCache->remember($typeCode, $hash . ':' . ($actor?->id ?? 'anon') . ':' . ($actor?->team_id ?? 'none') . ':' . ($actor?->roleName() ?? 'none'), function () use ($typeCode, $params, $perPage, $page, $actor): array {
            $type   = $this->resolveType($typeCode);
            $fields = $this->fieldsForType($type);

            $filters = $this->filterParser->parseFilters($params);
            $this->guardFilterCount($filters, $typeCode);
            $sort    = $this->filterParser->parseSort($params);
            $search  = isset($params['search']) && $params['search'] !== ''
                ? (string) $params['search']
                : null;

            $deletedScope = $this->deletedScopeFromParams($params);

            $query = $this->queryBuilder->build(
                $type->id,
                $fields,
                $filters,
                $search,
                $sort,
                deletedScope: $deletedScope,
            );
            if ($actor !== null) {
                $query = app(\App\Services\Auth\AccessScope::class)->apply($query, $actor, 'entities.read', 'entity_records.owner_id', 'entity_records.team_id');
            }

            $total = (clone $query)->count('entity_records.id');

            $records = $query
                ->with(['entityType', 'values.field'])
                ->forPage($page, $perPage)
                ->get();

            // Search fallback: if FULLTEXT returns 0 rows, try LIKE on the denormalized index.
            if ($search !== null && $total === 0) {
                $query = $this->queryBuilder->build(
                    $type->id,
                    $fields,
                    $filters,
                    $search,
                    $sort,
                    cursor: null,
                    forceLikeSearch: true,
                    deletedScope: $deletedScope,
                );
                if ($actor !== null) {
                    $query = app(\App\Services\Auth\AccessScope::class)->apply($query, $actor, 'entities.read', 'entity_records.owner_id', 'entity_records.team_id');
                }

                $total = (clone $query)->count('entity_records.id');
                $records = $query
                    ->with(['entityType', 'values.field'])
                    ->forPage($page, $perPage)
                    ->get();
            }

            $items = $records->map(fn(EntityRecord $r) => $this->formatRecord($r))->values()->all();

            return [
                'items'        => $items,
                'total'        => $total,
                'perPage'      => $perPage,
                'currentPage'  => $page,
            ];
        });

        return new LengthAwarePaginator(
            collect($cached['items']),
            $cached['total'],
            $cached['perPage'],
            $cached['currentPage'],
        );
    }

    /**
     * Cursor-paginated list — O(1) at any depth, no COUNT query.
     *
     * Instead of LIMIT N OFFSET M, this method uses a keyset WHERE clause
     * derived from the cursor so MySQL can jump directly to the position
     * in the index:
     *
     *   No sort:           WHERE id < :last_id
     *   Sort field ASC:    WHERE (value > :v) OR (value = :v AND id < :last_id)
     *   Sort field DESC:   WHERE (value < :v) OR (value = :v AND id < :last_id)
     *
     * "N+1 trick": we request perPage+1 rows from the DB.  If we get more
     * than perPage back, we know a next page exists (has_more = true) and we
     * trim the extra row before returning.  The next_cursor is built from the
     * last item we actually return.
     *
     * Response carries no total / pages — those require a COUNT(*) that would
     * destroy the O(1) benefit.  Use the offset variant when you need totals.
     *
     * Cached for 60s with the same tagging rules as listRecords().
     *
     * @param  array<string, mixed>  $params  Raw request query params.
     */
    public function listRecordsCursor(
        string       $typeCode,
        array        $params  = [],
        int          $perPage = 20,
        ?CursorInput $cursor  = null,
        ?\App\Models\User $actor = null,
    ): CursorPage {
        $hash = EntityListCache::hashCursorList($params, $perPage, $cursor);

        $cached = $this->listCache->remember($typeCode, $hash . ':' . ($actor?->id ?? 'anon') . ':' . ($actor?->team_id ?? 'none') . ':' . ($actor?->roleName() ?? 'none'), function () use ($typeCode, $params, $perPage, $cursor, $actor): array {
            $type   = $this->resolveType($typeCode);
            $fields = $this->fieldsForType($type);

            $filters = $this->filterParser->parseFilters($params);
            $this->guardFilterCount($filters, $typeCode);
            $sort    = $this->filterParser->parseSort($params);
            $search  = (isset($params['search']) && $params['search'] !== '')
                ? (string) $params['search']
                : null;

            $deletedScope = $this->deletedScopeFromParams($params);

            $query = $this->queryBuilder->build(
                $type->id,
                $fields,
                $filters,
                $search,
                $sort,
                $cursor,
                deletedScope: $deletedScope,
            );
            if ($actor !== null) {
                $query = app(\App\Services\Auth\AccessScope::class)->apply($query, $actor, 'entities.read', 'entity_records.owner_id', 'entity_records.team_id');
            }

            $rows = $query
                ->with(['entityType', 'values.field'])
                ->limit($perPage + 1)
                ->get();

            // Search fallback for cursor mode: retry only if the FULLTEXT path returned 0 rows.
            if ($search !== null && $rows->isEmpty()) {
                $query = $this->queryBuilder->build(
                    $type->id,
                    $fields,
                    $filters,
                    $search,
                    $sort,
                    $cursor,
                    forceLikeSearch: true,
                    deletedScope: $deletedScope,
                );
                if ($actor !== null) {
                    $query = app(\App\Services\Auth\AccessScope::class)->apply($query, $actor, 'entities.read', 'entity_records.owner_id', 'entity_records.team_id');
                }

                $rows = $query
                    ->with(['entityType', 'values.field'])
                    ->limit($perPage + 1)
                    ->get();
            }

            $hasMore = $rows->count() > $perPage;

            if ($hasMore) {
                $rows = $rows->slice(0, $perPage);
            }

            $items = $rows->map(fn(EntityRecord $r) => $this->formatRecord($r))->values()->all();

            $nextCursor = null;
            if ($hasMore && $items !== []) {
                $last      = $items[array_key_last($items)];
                $sortValue = ($sort !== null && isset($last['values'][$sort->fieldCode]))
                    ? $last['values'][$sort->fieldCode]
                    : null;

                $nextCursor = (new CursorInput($sortValue, $last['id']))->encode();
            }

            return [
                'items'      => $items,
                'perPage'    => $perPage,
                'hasMore'    => $hasMore,
                'nextCursor' => $nextCursor,
            ];
        });

        return new CursorPage(
            $cached['items'],
            $cached['perPage'],
            $cached['hasMore'],
            $cached['nextCursor'],
        );
    }

    /**
     * Guardrail against pathological query fan-out.
     *
     * @param  FilterInput[]  $filters
     */
    private function guardFilterCount(array $filters, string $typeCode): void
    {
        $n = count($filters);

        if ($n > 4) {
            Log::warning('entity list: many filters', [
                'type' => $typeCode,
                'filters' => $n,
            ]);
        }

        if ($n > 6) {
            throw new \Exception('Too many filters');
        }
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Validate incoming data against the field schema.
     *
     * @param  Collection<string, EntityField>  $fields
     * @param  array<string, mixed>  $data
     * @throws ValidationException
     */
    private function validateData(Collection $fields, array $data, bool $partial = false): void
    {
        $errors = [];

        if (!$partial) {
            foreach ($fields as $code => $field) {
                if (! $field->is_required) {
                    continue;
                }
                $present = array_key_exists($code, $data);
                $value   = $present ? $data[$code] : null;
                if (! $present || $this->isConsideredEmpty($field, $value)) {
                    $errors[$code][] = "Поле «{$field->name}» обязательно.";
                }
            }
        } else {
            foreach ($data as $code => $value) {
                if (! $fields->has($code)) {
                    continue;
                }
                $field = $fields->get($code);
                if ($field->is_required && $this->isConsideredEmpty($field, $value)) {
                    $errors[$code][] = "Поле «{$field->name}» обязательно.";
                }
            }
        }

        foreach ($data as $code => $value) {
            if (! $fields->has($code)) {
                $errors[$code][] = "Неизвестное поле «{$code}».";
                continue;
            }

            if ($value === null) {
                continue;
            }

            $field = $fields->get($code);

            $typeError = $this->checkTypeConstraint($field->type, $value);
            if ($typeError !== null) {
                $errors[$code][] = $typeError;

                continue;
            }

            $rangeError = $this->checkNumericRange($field, $value);
            if ($rangeError !== null) {
                $errors[$code][] = $rangeError;
            }

            $extError = $this->checkExtendedValidation($field, $value);
            if ($extError !== null) {
                $errors[$code][] = $extError;
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function checkExtendedValidation(EntityField $field, mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $enum = $field->validation_enum;
        if (is_array($enum) && $enum !== []) {
            if ($field->type === 'multi_select' && is_array($value)) {
                foreach ($value as $item) {
                    if (! $this->valueInEnum($enum, $item)) {
                        return 'Недопустимое значение.';
                    }
                }
            } elseif (! ($field->type === 'multi_select' && is_array($value))) {
                if (! $this->valueInEnum($enum, $value)) {
                    return 'Недопустимое значение.';
                }
            }
        }

        $stringsToCheck = [];

        if (in_array($field->type, ['string', 'text', 'select', 'date', 'datetime'], true)) {
            $stringsToCheck[] = (string) $value;
        } elseif ($field->type === 'multi_select' && is_array($value)) {
            foreach ($value as $item) {
                $stringsToCheck[] = (string) $item;
            }
        }

        foreach ($stringsToCheck as $str) {
            if ($field->validation_min_length !== null && mb_strlen($str) < (int) $field->validation_min_length) {
                return "Минимальная длина — {$field->validation_min_length} символов.";
            }
            if ($field->validation_max_length !== null && mb_strlen($str) > (int) $field->validation_max_length) {
                return "Максимальная длина — {$field->validation_max_length} символов.";
            }

            $pat = $field->validation_pattern;
            if ($pat !== null && $pat !== '') {
                $pc = @preg_match($pat, $str);
                if ($pc === false) {
                    Log::warning('entity field invalid validation_pattern', [
                        'field_id' => $field->id,
                        'code'     => $field->code,
                    ]);

                    return 'Ошибка проверки формата.';
                }
                if ($pc !== 1) {
                    return 'Значение не соответствует формату.';
                }
            }
        }

        return null;
    }

    /**
     * @param  array<int|string|float|bool>  $enum
     */
    private function valueInEnum(array $enum, mixed $value): bool
    {
        foreach ($enum as $allowed) {
            if (is_numeric($allowed) && is_numeric($value) && (string) $allowed === (string) $value) {
                return true;
            }
            if ($allowed === $value) {
                return true;
            }
            if (is_scalar($allowed) && is_scalar($value) && (string) $allowed === (string) $value) {
                return true;
            }
        }

        return false;
    }

    private function isConsideredEmpty(EntityField $field, mixed $value): bool
    {
        if ($value === null || $value === '') {
            return true;
        }

        if ($field->type === 'multi_select' && is_array($value) && count($value) === 0) {
            return true;
        }

        return false;
    }

    private function checkNumericRange(EntityField $field, mixed $value): ?string
    {
        if (! in_array($field->type, ['integer', 'float'], true)) {
            return null;
        }

        if (! is_numeric($value)) {
            return null;
        }

        $num = $field->type === 'integer' ? (int) $value : (float) $value;

        if ($field->validation_min !== null && $num < (float) $field->validation_min) {
            return "Значение не может быть меньше {$field->validation_min}.";
        }

        if ($field->validation_max !== null && $num > (float) $field->validation_max) {
            return "Значение не может быть больше {$field->validation_max}.";
        }

        return null;
    }

    private function checkTypeConstraint(string $type, mixed $value): ?string
    {
        return match ($type) {
            'integer'  => is_numeric($value) ? null : "Ожидается целое число.",
            'float'    => is_numeric($value) ? null : "Ожидается число.",
            'boolean'  => is_bool($value) || in_array($value, [0, 1, '0', '1'], true)
                          ? null : "Ожидается boolean (true/false).",
            'date'     => $this->isValidDate($value)     ? null : "Ожидается дата YYYY-MM-DD.",
            'datetime' => $this->isValidDatetime($value) ? null : "Ожидается дата-время YYYY-MM-DD HH:MM:SS.",
            default    => null,
        };
    }

    private function isValidDate(mixed $value): bool
    {
        if (!is_string($value)) {
            return false;
        }
        $d = \DateTime::createFromFormat('Y-m-d', $value);
        return $d !== false && $d->format('Y-m-d') === $value;
    }

    private function isValidDatetime(mixed $value): bool
    {
        if (!is_string($value)) {
            return false;
        }
        return \DateTime::createFromFormat('Y-m-d H:i:s', $value) !== false;
    }

    /**
     * @param  Collection<string, EntityField>  $fields
     * @param  array<string, mixed>  $data
     */
    private function writeValues(EntityRecord $record, Collection $fields, array $data): void
    {
        foreach ($data as $code => $rawValue) {
            if (!$fields->has($code)) {
                continue;
            }

            $field  = $fields->get($code);
            $column = $field->valueColumn();

            EntityValue::updateOrInsert(
                ['entity_record_id' => $record->id, 'entity_field_id' => $field->id],
                [$column => $this->castValue($field->type, $rawValue)],
            );
        }
    }

    private function castValue(string $type, mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            'integer' => (int) $value,
            'float'   => (float) $value,
            'boolean' => (bool) $value,
            default   => (string) $value,
        };
    }

    // ─── Fast-field sync ──────────────────────────────────────────────────────

    /**
     * INSERT a full entity_fast_fields row for a newly created record.
     *
     * All fast-field columns are set: value from $data if provided, NULL
     * otherwise (e.g. a record created without a "rooms" field).
     *
     * @param  array<string, mixed>  $data
     */
    private function createFastFields(EntityRecord $record, array $data): void
    {
        $row = [
            'record_id'      => $record->id,
            'entity_type_id' => $record->entity_type_id,
        ];

        foreach (FastFieldMap::COLUMNS as $code => $col) {
            $row[$col] = array_key_exists($code, $data)
                ? FastFieldMap::cast($col, $data[$code])
                : null;
        }

        DB::table('entity_fast_fields')->insert($row);
    }

    /**
     * UPDATE entity_fast_fields for an existing record — only the fast-field
     * columns that appear in $data are touched; others are left unchanged.
     *
     * Uses updateOrInsert so legacy records that pre-date entity_fast_fields
     * (e.g. seeded before the migration) get a row on first access.
     *
     * @param  array<string, mixed>  $data
     */
    private function updateFastFields(EntityRecord $record, array $data): void
    {
        $update  = ['entity_type_id' => $record->entity_type_id];
        $hasFast = false;

        foreach (FastFieldMap::COLUMNS as $code => $col) {
            if (array_key_exists($code, $data)) {
                $update[$col] = FastFieldMap::cast($col, $data[$code]);
                $hasFast      = true;
            }
        }

        if (!$hasFast) {
            return;
        }

        // updateOrInsert: UPDATE if the row exists; INSERT (with all fast cols
        // NULL except those in $update) if the row is missing (legacy record).
        $insertRow = array_merge(
            ['record_id' => $record->id],
            // Default all fast cols to NULL for the INSERT path.
            array_fill_keys(FastFieldMap::columnNames(), null),
            $update,
        );

        // On conflict: only update the columns that are actually changing.
        DB::table('entity_fast_fields')->upsert(
            [$insertRow],
            ['record_id'],
            array_keys($update),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function formatRecord(EntityRecord $record): array
    {
        $values = [];

        foreach ($record->values as $entityValue) {
            if ($entityValue->relationLoaded('field') && $entityValue->field !== null) {
                $values[$entityValue->field->code] = $entityValue->getValue();
            }
        }

        return [
            'id'          => $record->id,
            'type'        => $record->entityType?->code,
            'created_by'  => $record->created_by,
            'created_at'  => $record->created_at?->toISOString(),
            'updated_at'  => $record->updated_at?->toISOString(),
            'deleted_at'  => $record->deleted_at?->toISOString(),
            'values'      => $values,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshotValues(EntityRecord $record): array
    {
        $record->loadMissing('values.field');
        $values = [];
        foreach ($record->values as $entityValue) {
            if ($entityValue->relationLoaded('field') && $entityValue->field !== null) {
                $values[$entityValue->field->code] = $entityValue->getValue();
            }
        }

        return $values;
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return array<string, array{old: mixed, new: mixed}>
     */
    private function assocDiff(array $before, array $after): array
    {
        $keys = array_values(array_unique([...array_keys($before), ...array_keys($after)]));
        $out  = [];
        foreach ($keys as $k) {
            $b = $before[$k] ?? null;
            $a = $after[$k] ?? null;
            if ($b !== $a) {
                $out[$k] = ['old' => $b, 'new' => $a];
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $params
     * @return 'active'|'only'|'with'
     */
    private function deletedScopeFromParams(array $params): string
    {
        $raw = isset($params['deleted']) ? strtolower(trim((string) $params['deleted'])) : '';

        return match ($raw) {
            'only', 'trashed', 'deleted' => 'only',
            'with', 'all' => 'with',
            default => 'active',
        };
    }
}
