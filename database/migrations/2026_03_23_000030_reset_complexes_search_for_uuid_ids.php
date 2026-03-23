<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Truncates stale integer-ID data from complexes_search and ensures
 * the slug column does NOT have a unique constraint (feed data can have
 * duplicate complex names). UUID primary key on complex_id is the true unique key.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('complexes_search')) {
            return;
        }

        // Remove stale records with integer-like complex_ids (old pre-UUID data)
        DB::statement("DELETE FROM complexes_search WHERE complex_id NOT REGEXP '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'");

        // Drop slug unique index if it exists (we allow duplicate slugs from feed)
        try {
            DB::statement('ALTER TABLE complexes_search DROP INDEX complexes_search_slug_unique');
        } catch (\Throwable $e) {
            // Index may not exist — that's fine
        }

        // Ensure slug index exists (for fast lookup by slug)
        try {
            DB::statement('CREATE INDEX IF NOT EXISTS complexes_search_slug_idx ON complexes_search (slug)');
        } catch (\Throwable $e) {
            // May already exist under a different name
        }
    }

    public function down(): void
    {
        // No rollback — data cleanup is irreversible
    }
};
