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
        // Skip trigger creation - requires SUPER privilege
        // Triggers are not critical for import functionality
        // Location can be synced manually or via application logic if needed
        
        // Update existing records with location if column exists
        if (Schema::hasColumn('apartments', 'location')) {
            DB::statement('UPDATE apartments SET location = POINT(lng, lat) WHERE lat IS NOT NULL AND lng IS NOT NULL AND location IS NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS apartments_location_sync_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS apartments_location_sync_update');
    }
};
