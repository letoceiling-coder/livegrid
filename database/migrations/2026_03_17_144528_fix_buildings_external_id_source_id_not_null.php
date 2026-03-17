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
        // First, drop foreign key if it exists with SET NULL
        if (Schema::hasTable('buildings')) {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'buildings' 
                AND COLUMN_NAME = 'source_id'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            
            foreach ($foreignKeys as $fk) {
                DB::statement("ALTER TABLE buildings DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
            }
        }
        
        Schema::table('buildings', function (Blueprint $table) {
            // Make source_id and external_id NOT NULL
            $table->foreignId('source_id')->nullable(false)->change();
            $table->string('external_id')->nullable(false)->change();
        });
        
        // Restore foreign key with CASCADE instead of SET NULL
        if (Schema::hasTable('sources')) {
            Schema::table('buildings', function (Blueprint $table) {
                $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->foreignId('source_id')->nullable()->change();
            $table->string('external_id')->nullable()->change();
        });
    }
};
