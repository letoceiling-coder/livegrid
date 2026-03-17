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
        // Check current id type - if already string, skip
        $columns = DB::select("SHOW COLUMNS FROM apartments WHERE Field = 'id'");
        if (!empty($columns) && (str_contains($columns[0]->Type, 'varchar') || str_contains($columns[0]->Type, 'char'))) {
            // Already string type, no need to change
            return;
        }
        
        // Temporarily drop foreign keys that reference apartments.id
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND REFERENCED_TABLE_NAME = 'apartments' 
            AND REFERENCED_COLUMN_NAME = 'id'
        ");
        
        foreach ($foreignKeys as $fk) {
            DB::statement("ALTER TABLE {$fk->TABLE_NAME} DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
        }
        
        // Change id to string (keep as string, not char(36) to avoid issues)
        Schema::table('apartments', function (Blueprint $table) {
            $table->string('id')->change();
        });
        
        // Restore foreign keys
        // Note: Foreign keys will be recreated by later migrations if needed
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            // Revert to string (no length limit)
            $table->string('id')->change();
        });
    }
};
