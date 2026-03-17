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
        if (Schema::hasTable('blocks')) {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'blocks' 
                AND COLUMN_NAME = 'builder_id'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            
            foreach ($foreignKeys as $fk) {
                DB::statement("ALTER TABLE blocks DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
            }
        }
        
        Schema::table('blocks', function (Blueprint $table) {
            // Make builder_id NOT NULL (from feed analysis, all blocks have builders)
            $table->string('builder_id')->nullable(false)->change();
        });
        
        // Restore foreign key with CASCADE instead of SET NULL
        if (Schema::hasTable('builders')) {
            Schema::table('blocks', function (Blueprint $table) {
                $table->foreign('builder_id')->references('id')->on('builders')->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            $table->string('builder_id')->nullable()->change();
        });
    }
};
