<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Remove duplicate indexes that are already created by foreign key constraints
        // In MySQL, FK constraints automatically create indexes on referencing columns
        // Use raw SQL to safely drop indexes only if they exist
        
        $indexes = ['building_id', 'block_id', 'builder_id'];
        
        foreach ($indexes as $column) {
            // Check if column has foreign key constraint
            $hasForeignKey = DB::selectOne("
                SELECT COUNT(*) as cnt
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'apartments' 
                AND COLUMN_NAME = ? 
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ", [$column]);
            
            // Only drop index if column doesn't have foreign key
            if (!$hasForeignKey || $hasForeignKey->cnt == 0) {
                // Get index name from information_schema
                $indexName = DB::selectOne("
                    SELECT INDEX_NAME 
                    FROM information_schema.STATISTICS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'apartments' 
                    AND COLUMN_NAME = ? 
                    AND INDEX_NAME != 'PRIMARY'
                    AND INDEX_NAME NOT LIKE 'fk_%'
                    LIMIT 1
                ", [$column]);
                
                if ($indexName) {
                    try {
                        DB::statement("ALTER TABLE apartments DROP INDEX `{$indexName->INDEX_NAME}`");
                    } catch (\Exception $e) {
                        // Index might be used by FK, skip
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            // Re-add explicit indexes (though FK indexes already exist)
            $table->index('building_id');
            $table->index('block_id');
            $table->index('builder_id');
        });
    }
};
