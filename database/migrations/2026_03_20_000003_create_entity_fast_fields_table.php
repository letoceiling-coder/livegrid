<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * entity_fast_fields — denormalized hot-path table.
 *
 * Problem this solves:
 *   Filtering by price + rooms + area requires 3 JOINs to entity_values,
 *   each needing a separate B-tree lookup per record.  With 100k records
 *   and multiple value types this is ~300k index lookups per query.
 *
 * Solution:
 *   One row per entity_record containing typed, nullable columns for
 *   the most-filtered fields.  Composite indexes per field allow MySQL
 *   to perform a single B-tree range scan instead of 3 JOIN lookups.
 *
 * Before (3 JOINs):
 *   INNER JOIN entity_values ev0 ON ... AND ev0.entity_field_id = {price_id}
 *   INNER JOIN entity_values ev1 ON ... AND ev1.entity_field_id = {rooms_id}
 *   INNER JOIN entity_values ev2 ON ... AND ev2.entity_field_id = {area_id}
 *   WHERE ev0.value_integer BETWEEN 5M AND 15M
 *     AND ev1.value_integer IN (1, 2)
 *     AND ev2.value_float >= 40
 *
 * After (1 JOIN):
 *   INNER JOIN entity_fast_fields eff ON eff.record_id = entity_records.id
 *   WHERE eff.entity_type_id = ?
 *     AND eff.price BETWEEN 5M AND 15M
 *     AND eff.rooms IN (1, 2)
 *     AND eff.area >= 40
 *
 * entity_type_id is denormalized into this table so that the composite
 * indexes (entity_type_id, price), (entity_type_id, rooms), etc. can be
 * used by the optimizer as the driving access path:
 *
 *   1. Use (entity_type_id, price) index: find all rows where
 *      type = X AND price BETWEEN 5M AND 15M            [narrow range scan]
 *   2. Join entity_records by record_id (PK → eq_ref)   [O(1) per row]
 *
 * Maintenance: entity_fast_fields is updated synchronously in
 * EntityService::createRecord() and updateRecord().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_fast_fields', function (Blueprint $table) {
            // 1:1 with entity_records — record_id IS the primary key.
            $table->unsignedBigInteger('record_id')->primary();
            $table->unsignedBigInteger('entity_type_id');

            // Hot filter columns.  Add new fast fields here when needed.
            $table->bigInteger('price')->nullable()->comment('Copy of entity_values.value_integer for field "price"');
            $table->integer('rooms')->nullable()->comment('Copy of entity_values.value_integer for field "rooms"');
            $table->decimal('area', 10, 2)->nullable()->comment('Copy of entity_values.value_float for field "area"');

            // FK — cascades delete so entity_fast_fields stays clean automatically.
            $table->foreign('record_id')
                  ->references('id')
                  ->on('entity_records')
                  ->cascadeOnDelete();

            // ── Composite indexes ──────────────────────────────────────────────
            // (entity_type_id, price): range scan for price_min / price_max
            $table->index(['entity_type_id', 'price'], 'eff_type_price');
            // (entity_type_id, rooms): IN filter for rooms[]=1&rooms[]=2
            $table->index(['entity_type_id', 'rooms'], 'eff_type_rooms');
            // (entity_type_id, area): range scan for area_min / area_max
            $table->index(['entity_type_id', 'area'],  'eff_type_area');
        });

        // ── Backfill: populate entity_fast_fields for all existing records ────
        //
        // Uses a pivot-style SELECT to extract typed values from entity_values
        // in one pass.  The LEFT JOINs ensure records without a given field
        // still get a row (with NULL for the missing columns).
        //
        // ON DUPLICATE KEY UPDATE is a no-op on first run but makes the
        // query safe to re-run (e.g. after a schema change).
        DB::statement("
            INSERT INTO entity_fast_fields (record_id, entity_type_id, price, rooms, area)
            SELECT
                er.id                                                           AS record_id,
                er.entity_type_id,
                MAX(CASE WHEN ef.code = 'price' THEN ev.value_integer END)     AS price,
                MAX(CASE WHEN ef.code = 'rooms' THEN ev.value_integer END)     AS rooms,
                MAX(CASE WHEN ef.code = 'area'  THEN ev.value_float   END)     AS area
            FROM entity_records er
            LEFT JOIN entity_values ev
                   ON ev.entity_record_id = er.id
            LEFT JOIN entity_fields ef
                   ON ef.id = ev.entity_field_id
                  AND ef.code IN ('price', 'rooms', 'area')
            WHERE er.deleted_at IS NULL
            GROUP BY er.id, er.entity_type_id
            ON DUPLICATE KEY UPDATE
                price = VALUES(price),
                rooms = VALUES(rooms),
                area  = VALUES(area)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_fast_fields');
    }
};
