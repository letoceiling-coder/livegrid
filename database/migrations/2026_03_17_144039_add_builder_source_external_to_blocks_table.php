<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            // Check if columns already exist (they might be in create_blocks_table)
            if (!Schema::hasColumn('blocks', 'builder_id')) {
                $table->string('builder_id')->nullable()->after('district_id');
            }
            if (!Schema::hasColumn('blocks', 'source_id')) {
                $table->foreignId('source_id')->nullable()->after('builder_id');
            }
            if (!Schema::hasColumn('blocks', 'external_id')) {
                $table->string('external_id')->nullable()->after('source_id');
            }
        });
        
        // Add foreign keys and unique constraint if they don't exist
        if (Schema::hasTable('builders')) {
            $hasFk = DB::selectOne("
                SELECT COUNT(*) as cnt
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'blocks' 
                AND COLUMN_NAME = 'builder_id'
                AND REFERENCED_TABLE_NAME = 'builders'
            ");
            
            if (!$hasFk || $hasFk->cnt == 0) {
                Schema::table('blocks', function (Blueprint $table) {
                    $table->foreign('builder_id')->references('id')->on('builders')->nullOnDelete();
                });
            }
        }
        
        if (Schema::hasTable('sources')) {
            $hasFk = DB::selectOne("
                SELECT COUNT(*) as cnt
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'blocks' 
                AND COLUMN_NAME = 'source_id'
                AND REFERENCED_TABLE_NAME = 'sources'
            ");
            
            if (!$hasFk || $hasFk->cnt == 0) {
                Schema::table('blocks', function (Blueprint $table) {
                    $table->foreign('source_id')->references('id')->on('sources')->nullOnDelete();
                });
            }
            
            // Add unique constraint
            $hasUnique = DB::selectOne("
                SELECT COUNT(*) as cnt
                FROM information_schema.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'blocks' 
                AND CONSTRAINT_TYPE = 'UNIQUE'
                AND CONSTRAINT_NAME LIKE '%source_id%external_id%'
            ");
            
            if (!$hasUnique || $hasUnique->cnt == 0) {
                Schema::table('blocks', function (Blueprint $table) {
                    $table->unique(['source_id', 'external_id']);
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            $table->dropUnique(['source_id', 'external_id']);
            $table->dropForeign(['builder_id']);
            $table->dropForeign(['source_id']);
            $table->dropColumn(['builder_id', 'source_id', 'external_id']);
        });
    }
};
