<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Denormalized FULLTEXT search spine for entity records.
 *
 * searchable_text aggregates: name, address, builder, district (when those
 * fields exist on the type).  entity:sync-search rebuilds all rows; create/
 * update flows call EntitySearchIndexWriter for incremental upkeep.
 *
 * Query path (EntityQueryBuilder): INNER JOIN + MATCH(...) AGAINST(...) —
 * replaces WHERE EXISTS + LIKE on entity_values for ?search=...
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_search_index', function (Blueprint $table) {
            $table->unsignedBigInteger('record_id')->primary();
            $table->unsignedBigInteger('entity_type_id');
            $table->text('searchable_text')->nullable();

            $table->foreign('record_id')
                ->references('id')
                ->on('entity_records')
                ->cascadeOnDelete();

            $table->index(['entity_type_id'], 'esi_type');

            $table->fullText(['searchable_text'], 'esi_fulltext');
        });

        // Seed one row per live record (empty text until command or writer runs).
        DB::statement('
            INSERT INTO entity_search_index (record_id, entity_type_id, searchable_text)
            SELECT id, entity_type_id, \'\'
            FROM entity_records
            WHERE deleted_at IS NULL
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_search_index');
    }
};
