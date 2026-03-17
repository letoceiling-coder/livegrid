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
        // Create trigger to sync location POINT with lat/lng
        // When lat or lng changes, update location
        // When location changes, update lat/lng
        DB::unprepared('
            CREATE TRIGGER apartments_location_sync_insert
            BEFORE INSERT ON apartments
            FOR EACH ROW
            BEGIN
                IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
                    SET NEW.location = POINT(NEW.lng, NEW.lat);
                END IF;
            END
        ');
        
        DB::unprepared('
            CREATE TRIGGER apartments_location_sync_update
            BEFORE UPDATE ON apartments
            FOR EACH ROW
            BEGIN
                IF (NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL) AND 
                   (NEW.lat != OLD.lat OR NEW.lng != OLD.lng OR OLD.lat IS NULL OR OLD.lng IS NULL) THEN
                    SET NEW.location = POINT(NEW.lng, NEW.lat);
                ELSEIF NEW.location IS NOT NULL AND (OLD.location IS NULL OR ST_AsText(NEW.location) != ST_AsText(OLD.location)) THEN
                    SET NEW.lat = ST_Y(NEW.location);
                    SET NEW.lng = ST_X(NEW.location);
                END IF;
            END
        ');
        
        // Update existing records
        DB::statement('UPDATE apartments SET location = POINT(lng, lat) WHERE lat IS NOT NULL AND lng IS NOT NULL AND location IS NULL');
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
