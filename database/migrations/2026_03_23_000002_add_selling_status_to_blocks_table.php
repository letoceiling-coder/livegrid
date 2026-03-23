<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Extend the status enum to include 'selling'
        // Using raw SQL to avoid doctrine/dbal dependency for enum changes
        DB::statement("ALTER TABLE blocks MODIFY COLUMN status ENUM('building','completed','planned','selling') NULL");
        DB::statement("ALTER TABLE complexes_search MODIFY COLUMN status ENUM('building','completed','planned','selling') NULL");
    }

    public function down(): void
    {
        // Remove 'selling' — first update any rows using it
        DB::statement("UPDATE blocks SET status = 'building' WHERE status = 'selling'");
        DB::statement("UPDATE complexes_search SET status = 'building' WHERE status = 'selling'");
        DB::statement("ALTER TABLE blocks MODIFY COLUMN status ENUM('building','completed','planned') NULL");
        DB::statement("ALTER TABLE complexes_search MODIFY COLUMN status ENUM('building','completed','planned') NULL");
    }
};
