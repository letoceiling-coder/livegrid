<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Drop the redundant single-column entity_field_id index from entity_values.
 *
 * Why: the composite indexes added in the previous migration
 * (ev_field_integer, ev_field_float, ev_field_string, etc.) all start with
 * entity_field_id as their first column.  InnoDB can satisfy any lookup
 * that only needs entity_field_id by using any of those composites as a
 * "left-prefix" scan — no dedicated single-column index is needed.
 *
 * Having BOTH the single-column index AND the composites confuses the
 * MySQL query optimizer: it tends to pick the single-column index (smaller
 * B-tree, lower cost estimate) instead of the composite that can actually
 * narrow the range by value.  Removing the single-column index forces the
 * optimizer to use the correct composite for each value type.
 *
 * After dropping, run ANALYZE TABLE so the optimizer refreshes cardinality
 * stats on the new composite indexes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_values', function (Blueprint $table) {
            $table->dropIndex('entity_values_entity_field_id_index');
        });

        // Refresh index statistics so the optimizer sees accurate cardinality.
        DB::statement('ANALYZE TABLE entity_values');
        DB::statement('ANALYZE TABLE entity_records');
    }

    public function down(): void
    {
        Schema::table('entity_values', function (Blueprint $table) {
            $table->index('entity_field_id');
        });
    }
};
