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
        Schema::table('apartments', function (Blueprint $table) {
            // Add spatial point column for location
            // Using MySQL spatial data type
            // Note: Spatial index requires NOT NULL, so we skip it for nullable column
            $table->point('location')->nullable()->after('lng');
            // $table->spatialIndex('location'); // Skipped - requires NOT NULL
        });
        
        // Update existing lat/lng to spatial point
        // Only update if apartments table has data
        if (DB::table('apartments')->count() > 0) {
            DB::statement('UPDATE apartments SET location = POINT(lng, lat) WHERE lat IS NOT NULL AND lng IS NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropSpatialIndex(['location']);
            $table->dropColumn('location');
        });
    }
};
