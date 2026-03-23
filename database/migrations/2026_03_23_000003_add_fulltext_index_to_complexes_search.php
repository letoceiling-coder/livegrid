<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('complexes_search')) {
            return;
        }

        // Check if fulltext index already exists before adding
        $existing = DB::select(
            "SELECT INDEX_NAME FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'complexes_search'
               AND INDEX_TYPE = 'FULLTEXT'
               AND INDEX_NAME = 'cs_fulltext_idx'"
        );

        if (empty($existing)) {
            DB::statement(
                'ALTER TABLE complexes_search
                 ADD FULLTEXT INDEX cs_fulltext_idx (name, district_name, subway_name, builder_name)'
            );
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE complexes_search DROP INDEX cs_fulltext_idx');
    }
};
