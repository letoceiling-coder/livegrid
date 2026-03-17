<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Check if source_id already exists (from create_apartments_table migration)
        if (!Schema::hasColumn('apartments', 'source_id')) {
            // Add source_id column
            Schema::table('apartments', function (Blueprint $table) {
                $table->foreignId('source_id')->nullable()->after('id');
            });
        }
        
        // Check if old source column exists and needs conversion
        if (Schema::hasColumn('apartments', 'source')) {
            // Populate source_id from sources table
            DB::statement("
                UPDATE apartments a
                INNER JOIN sources s ON s.code = a.source
                SET a.source_id = s.id
            ");

            // Make source_id NOT NULL
            Schema::table('apartments', function (Blueprint $table) {
                $table->foreignId('source_id')->nullable(false)->change();
            });

            // Drop old source column
            Schema::table('apartments', function (Blueprint $table) {
                $table->dropColumn('source');
            });
        } else {
            // source_id already exists, just ensure it's NOT NULL and has FK
            if (Schema::hasColumn('apartments', 'source_id')) {
                Schema::table('apartments', function (Blueprint $table) {
                    $table->foreignId('source_id')->nullable(false)->change();
                });
            }
        }
        
        // Ensure foreign key exists (may have been added by 144601 migration)
        if (Schema::hasTable('sources')) {
            $hasFk = DB::selectOne("
                SELECT COUNT(*) as cnt
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'apartments' 
                AND COLUMN_NAME = 'source_id'
                AND REFERENCED_TABLE_NAME = 'sources'
            ");
            
            if (!$hasFk || $hasFk->cnt == 0) {
                Schema::table('apartments', function (Blueprint $table) {
                    $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->string('source')->after('id');
        });

        DB::statement("
            UPDATE apartments a
            INNER JOIN sources s ON s.id = a.source_id
            SET a.source = s.code
        ");

        Schema::table('apartments', function (Blueprint $table) {
            $table->dropForeign(['source_id']);
            $table->dropColumn('source_id');
        });
    }
};
