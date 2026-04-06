<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Production-grade composite indexes for entity_values filter queries.
 *
 * Problem before this migration:
 *   JOIN entity_values ON entity_field_id = X WHERE value_integer >= 5M
 *   → MySQL uses single-column idx on entity_field_id, then scans ALL rows
 *     for that field to apply the value condition.  O(N) per filter at scale.
 *
 * After this migration:
 *   (entity_field_id, value_integer) composite index
 *   → MySQL does a B-tree range scan scoped to field X + value range.
 *     O(log N + k) where k = matching rows.
 *
 * Index strategy per column type:
 *   value_integer  — B-tree range scan for price, area (int), rooms, floor
 *   value_float    — B-tree range scan for area (decimal), lat/lon, etc.
 *   value_string   — prefix-191 for exact + prefix-LIKE queries (utf8mb4 safe)
 *   value_boolean  — low cardinality but still faster as covered scan
 *   value_date     — date range filters
 *   value_datetime — datetime range filters
 *
 * entity_records: composite (entity_type_id, deleted_at) covers the
 * ubiquitous WHERE entity_type_id = ? AND deleted_at IS NULL that appears
 * in every single query.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── entity_values: composite indexes per value type ───────────────────
        Schema::table('entity_values', function (Blueprint $table) {
            $table->index(['entity_field_id', 'value_integer'],  'ev_field_integer');
            $table->index(['entity_field_id', 'value_float'],    'ev_field_float');
            $table->index(['entity_field_id', 'value_boolean'],  'ev_field_boolean');
            $table->index(['entity_field_id', 'value_date'],     'ev_field_date');
            $table->index(['entity_field_id', 'value_datetime'], 'ev_field_datetime');
        });

        // value_string uses a prefix index (191 chars) to stay within the
        // InnoDB 767-byte key limit for utf8mb4 (4 bytes × 191 = 764 bytes).
        // Blueprint does not support prefix lengths directly, so use raw DDL.
        DB::statement(
            'CREATE INDEX ev_field_string ON entity_values (entity_field_id, value_string(191))'
        );

        // ── entity_records: composite covering index for base WHERE clause ────
        Schema::table('entity_records', function (Blueprint $table) {
            $table->index(['entity_type_id', 'deleted_at'], 'er_type_deleted');
        });
    }

    public function down(): void
    {
        Schema::table('entity_values', function (Blueprint $table) {
            $table->dropIndex('ev_field_integer');
            $table->dropIndex('ev_field_float');
            $table->dropIndex('ev_field_boolean');
            $table->dropIndex('ev_field_date');
            $table->dropIndex('ev_field_datetime');
            $table->dropIndex('ev_field_string');
        });

        Schema::table('entity_records', function (Blueprint $table) {
            $table->dropIndex('er_type_deleted');
        });
    }
};
