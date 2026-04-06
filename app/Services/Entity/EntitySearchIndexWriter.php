<?php

namespace App\Services\Entity;

use App\Models\Entity\EntityField;
use App\Models\Entity\EntityRecord;
use App\Models\Entity\EntityValue;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Maintains entity_search_index: concatenates configured field codes into
 * searchable_text for MySQL FULLTEXT (MATCH ... AGAINST).
 *
 * Indexed codes (must match entity:sync-search / docs):
 *   name, address, builder, district
 */
final class EntitySearchIndexWriter
{
    /** Field codes, in order, merged into searchable_text. */
    public const INDEXED_CODES = ['name', 'address', 'builder', 'district'];

    public function rebuildForRecordId(int $recordId): void
    {
        $record = EntityRecord::query()->find($recordId);

        if ($record === null) {
            DB::table('entity_search_index')->where('record_id', $recordId)->delete();

            return;
        }

        if ($record->trashed()) {
            DB::table('entity_search_index')->where('record_id', $recordId)->delete();

            return;
        }

        $this->rebuildForRecords(collect([$record]));
    }

    /**
     * Batch rebuild — O(1) queries per chunk (used by entity:sync-search).
     *
     * @param  Collection<int, EntityRecord>  $records
     */
    public function rebuildForRecords(Collection $records): void
    {
        if ($records->isEmpty()) {
            return;
        }

        $recordIds = $records->pluck('id')->all();
        $typeIds   = $records->pluck('entity_type_id')->unique()->all();

        /** @var Collection<int, Collection<int, EntityField>> $fieldsByType */
        $fieldsByType = EntityField::query()
            ->whereIn('entity_type_id', $typeIds)
            ->whereIn('code', self::INDEXED_CODES)
            ->get()
            ->groupBy('entity_type_id');

        $allFieldIds = $fieldsByType->flatten()->pluck('id')->unique()->all();

        $valuesByRecord = collect();
        if (!empty($allFieldIds)) {
            $valuesByRecord = EntityValue::query()
                ->whereIn('entity_record_id', $recordIds)
                ->whereIn('entity_field_id', $allFieldIds)
                ->get()
                ->groupBy('entity_record_id');
        }

        $rows = [];
        foreach ($records as $record) {
            /** @var EntityRecord $record */
            $typeFields = $fieldsByType->get($record->entity_type_id, collect());
            $byCode     = $typeFields->keyBy('code');
            $vals       = $valuesByRecord->get($record->id, collect())->keyBy('entity_field_id');

            $rows[] = [
                'record_id'       => $record->id,
                'entity_type_id'  => $record->entity_type_id,
                'searchable_text' => $this->composeFromMaps($byCode, $vals),
            ];
        }

        DB::table('entity_search_index')->upsert(
            $rows,
            ['record_id'],
            ['entity_type_id', 'searchable_text'],
        );
    }

    /**
     * @param  Collection<string, EntityField>  $byCode  Type fields keyed by code.
     * @param  Collection<int, EntityValue>     $vals    Values keyed by entity_field_id.
     */
    private function composeFromMaps(Collection $byCode, Collection $vals): string
    {
        $parts = [];
        foreach (self::INDEXED_CODES as $code) {
            if (!$byCode->has($code)) {
                continue;
            }

            /** @var EntityField $field */
            $field = $byCode->get($code);
            $ev    = $vals->get($field->id);
            if ($ev === null) {
                continue;
            }

            $fragment = $this->scalarFromFieldValue($field, $ev);
            if ($fragment !== '') {
                $parts[] = $fragment;
            }
        }

        $merged = trim(preg_replace('/\s+/u', ' ', implode(' ', $parts)) ?? '');

        return $merged === '' ? '' : $merged;
    }

    private function scalarFromFieldValue(EntityField $field, EntityValue $ev): string
    {
        $v = match ($field->type) {
            'integer'  => $ev->value_integer,
            'float'    => $ev->value_float,
            'boolean'  => $ev->value_boolean,
            'date'     => $ev->value_date,
            'datetime' => $ev->value_datetime,
            default    => $ev->value_string,
        };

        if ($v === null || $v === '') {
            return '';
        }

        return is_scalar($v) ? (string) $v : '';
    }
}
